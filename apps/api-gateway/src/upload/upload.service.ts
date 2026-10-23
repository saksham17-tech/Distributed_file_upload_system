import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma.service';
import { FileStatus } from '@prisma/client';

/** 1 GB free-tier hard cap */
export const MAX_STORAGE_LIMIT_BYTES = 1_073_741_824;

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private supabase: SupabaseClient | null = null;
  /** Matches the bucket created in the Supabase dashboard */
  private readonly bucket =
    process.env.SUPABASE_STORAGE_BUCKET || 'dfup';

  constructor(private readonly prisma: PrismaService) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (url && key && key !== 'REPLACE_WITH_YOUR_SERVICE_ROLE_KEY') {
      this.supabase = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      this.logger.log(
        `Supabase Storage client initialized (bucket: ${this.bucket})`,
      );
    } else {
      this.logger.warn(
        'SUPABASE_SERVICE_ROLE_KEY not set — chunks will be stored in DB metadata only (dev fallback). Set the key for real Storage uploads.',
      );
    }
  }

  /**
   * Sum of bytes for COMPLETED + still-UPLOADING files.
   * Rejects new inits when current + incoming would exceed 1 GB.
   */
  async checkQuota(incomingBytes: number): Promise<void> {
    const aggregate = await this.prisma.file.aggregate({
      where: {
        status: { in: [FileStatus.COMPLETED, FileStatus.UPLOADING] },
      },
      _sum: { totalSize: true },
    });

    const current = Number(aggregate._sum.totalSize ?? 0n);
    if (current + incomingBytes > MAX_STORAGE_LIMIT_BYTES) {
      throw new ForbiddenException(
        'Storage quota exceeded: 1 GB free-tier limit reached',
      );
    }
  }

  async initUpload(dto: {
    filename: string;
    totalSize: number;
    totalChunks: number;
    mimeType: string;
    userId?: string;
  }) {
    if (!dto.filename || !dto.totalSize || !dto.totalChunks) {
      throw new BadRequestException(
        'filename, totalSize and totalChunks are required',
      );
    }

    await this.checkQuota(dto.totalSize);

    const file = await this.prisma.file.create({
      data: {
        filename: dto.filename,
        totalSize: BigInt(dto.totalSize),
        totalChunks: dto.totalChunks,
        mimeType: dto.mimeType || 'application/octet-stream',
        status: FileStatus.UPLOADING,
        userId: dto.userId ?? null,
      },
    });

    this.logger.log(
      `Init upload ${file.id} — ${dto.filename} (${dto.totalSize} bytes, ${dto.totalChunks} chunks)`,
    );

    return { fileId: file.id };
  }

  async getStatus(fileId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: {
        chunks: {
          select: { chunkIndex: true },
          orderBy: { chunkIndex: 'asc' },
        },
      },
    });

    if (!file) {
      throw new NotFoundException(`File ${fileId} not found`);
    }

    return {
      status: file.status,
      totalChunks: file.totalChunks,
      uploadedChunks: file.chunks.map((c) => c.chunkIndex),
      filename: file.filename,
      totalSize: Number(file.totalSize),
      storagePath: file.storagePath,
    };
  }

  async uploadChunk(
    fileId: string,
    chunkIndex: number,
    checksum: string,
    buffer: Buffer,
  ) {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException(`File ${fileId} not found`);
    }
    if (file.status === FileStatus.COMPLETED) {
      throw new BadRequestException('File already completed');
    }
    if (file.status === FileStatus.FAILED) {
      throw new BadRequestException('File is in FAILED state');
    }
    if (chunkIndex < 0 || chunkIndex >= file.totalChunks) {
      throw new BadRequestException(
        `chunkIndex ${chunkIndex} out of range [0, ${file.totalChunks - 1}]`,
      );
    }

    // Verify SHA-256
    const actual = createHash('sha256').update(buffer).digest('hex');
    if (actual !== checksum.toLowerCase()) {
      throw new BadRequestException(
        `Checksum mismatch for chunk ${chunkIndex}: expected ${checksum}, got ${actual}`,
      );
    }

    // Persist chunk to Supabase Storage (or skip in pure-DB fallback)
    const objectPath = `chunks/${fileId}/${chunkIndex}`;
    if (this.supabase) {
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .upload(objectPath, buffer, {
          contentType: 'application/octet-stream',
          upsert: true,
        });

      if (error) {
        this.logger.error(`Storage upload failed: ${error.message}`);
        throw new BadRequestException(`Storage error: ${error.message}`);
      }
    }

    // Upsert FileChunk row
    await this.prisma.fileChunk.upsert({
      where: {
        fileId_chunkIndex: { fileId, chunkIndex },
      },
      create: {
        fileId,
        chunkIndex,
        chunkSize: buffer.length,
        checksum: actual,
      },
      update: {
        chunkSize: buffer.length,
        checksum: actual,
        uploadedAt: new Date(),
      },
    });

    // Check completion
    const uploadedCount = await this.prisma.fileChunk.count({
      where: { fileId },
    });

    if (uploadedCount >= file.totalChunks) {
      await this.finalizeFile(fileId, file);
    }

    return {
      ok: true,
      chunkIndex,
      uploadedChunks: uploadedCount,
      totalChunks: file.totalChunks,
      completed: uploadedCount >= file.totalChunks,
    };
  }

  /**
   * When every chunk is present:
   * 1. Download / concatenate chunks (via Storage)
   * 2. Upload the final object under files/{fileId}/{filename}
   * 3. Mark File COMPLETED and set storagePath
   * 4. Optionally remove individual chunk objects
   */
  private async finalizeFile(
    fileId: string,
    file: { filename: string; totalChunks: number; mimeType: string },
  ) {
    this.logger.log(`Finalizing file ${fileId}…`);

    let finalPath: string | null = null;

    if (this.supabase) {
      try {
        const parts: Buffer[] = [];
        for (let i = 0; i < file.totalChunks; i++) {
          const { data, error } = await this.supabase.storage
            .from(this.bucket)
            .download(`chunks/${fileId}/${i}`);

          if (error || !data) {
            throw new Error(`Missing chunk ${i}: ${error?.message}`);
          }
          parts.push(Buffer.from(await data.arrayBuffer()));
        }

        const assembled = Buffer.concat(parts);
        finalPath = `files/${fileId}/${file.filename}`;

        const { error: upErr } = await this.supabase.storage
          .from(this.bucket)
          .upload(finalPath, assembled, {
            contentType: file.mimeType || 'application/octet-stream',
            upsert: true,
          });

        if (upErr) {
          throw new Error(`Final upload failed: ${upErr.message}`);
        }

        // Best-effort cleanup of chunk objects
        const chunkPaths = Array.from(
          { length: file.totalChunks },
          (_, i) => `chunks/${fileId}/${i}`,
        );
        await this.supabase.storage.from(this.bucket).remove(chunkPaths);
      } catch (err) {
        this.logger.error(`Finalize failed for ${fileId}`, err);
        await this.prisma.file.update({
          where: { id: fileId },
          data: { status: FileStatus.FAILED },
        });
        throw err;
      }
    } else {
      // Dev fallback: no real storage — just mark complete
      finalPath = `local-fallback/${fileId}/${file.filename}`;
    }

    await this.prisma.file.update({
      where: { id: fileId },
      data: {
        status: FileStatus.COMPLETED,
        storagePath: finalPath,
      },
    });

    this.logger.log(`File ${fileId} COMPLETED → ${finalPath}`);
  }

  async listFiles() {
    return this.prisma.file.findMany({
      where: { status: FileStatus.COMPLETED },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        filename: true,
        totalSize: true,
        mimeType: true,
        storagePath: true,
        createdAt: true,
      },
    });
  }

  async getUsage() {
    const aggregate = await this.prisma.file.aggregate({
      where: {
        status: { in: [FileStatus.COMPLETED, FileStatus.UPLOADING] },
      },
      _sum: { totalSize: true },
      _count: true,
    });

    const used = Number(aggregate._sum.totalSize ?? 0n);
    return {
      usedBytes: used,
      limitBytes: MAX_STORAGE_LIMIT_BYTES,
      remainingBytes: Math.max(0, MAX_STORAGE_LIMIT_BYTES - used),
      fileCount: aggregate._count,
    };
  }
}
