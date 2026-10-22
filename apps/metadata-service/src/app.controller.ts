import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { PrismaService } from './prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  // Auth is external (JWT/Supabase), so lazily create the local User row that FileOwnership references.
  private async ensureUser(userId: string) {
    await this.prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email: `${userId}@local`, passwordHash: 'external-auth' }
    });
  }

  @GrpcMethod('MetadataService', 'CheckFileExists')
  async checkFileExists(data: { fileHash: string; fileSize: number; userId: string }) {
    const content = await this.prisma.content.findUnique({
      where: { hash: data.fileHash }
    });

    if (content) {
      await this.ensureUser(data.userId);
      // Deduplication hit!
      const ownership = await this.prisma.fileOwnership.create({
        data: {
          userId: data.userId,
          contentHash: content.hash,
          originalName: 'Duplicate File', // Would pass real name in real implementation
          mimeType: 'application/octet-stream',
          status: 'AVAILABLE'
        }
      });
      return { exists: true, fileId: ownership.id };
    }

    return { exists: false, fileId: '' };
  }

  @GrpcMethod('MetadataService', 'RegisterUploadSession')
  async registerUploadSession(data: { fileId: string; userId: string; filename: string; fileSize: number }) {
    await this.ensureUser(data.userId);
    const ownership = await this.prisma.fileOwnership.create({
      data: {
        id: data.fileId.split('/').pop(),
        userId: data.userId,
        originalName: data.filename,
        mimeType: 'application/octet-stream',
        fileSize: BigInt(data.fileSize || 0),
        status: 'UPLOADING',
        uploadSession: {
          create: {
            totalChunks: Math.ceil(data.fileSize / (5 * 1024 * 1024)),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
          }
        }
      }
    });
    return { success: true };
  }

  @GrpcMethod('MetadataService', 'GetFiles')
  async getFiles(data: { userId: string }) {
    const files = await this.prisma.fileOwnership.findMany({
      where: { userId: data.userId },
      orderBy: { createdAt: 'desc' }
    });
    return {
      files: files.map(f => ({
        id: f.id,
        originalName: f.originalName,
        mimeType: f.mimeType,
        fileSize: Number(f.fileSize || 0),
        isStarred: f.isStarred,
        isDeleted: f.isDeleted,
        createdAt: f.createdAt.toISOString(),
        status: f.status
      }))
    };
  }

  @GrpcMethod('MetadataService', 'ToggleStar')
  async toggleStar(data: { fileId: string; userId: string }) {
    const file = await this.prisma.fileOwnership.findUnique({ where: { id: data.fileId } });
    if (!file) return { isStarred: false };
    const updated = await this.prisma.fileOwnership.update({
      where: { id: data.fileId },
      data: { isStarred: !file.isStarred }
    });
    return { isStarred: updated.isStarred };
  }

  @GrpcMethod('MetadataService', 'DeleteFile')
  async deleteFile(data: { fileId: string; userId: string }) {
    await this.prisma.fileOwnership.update({
      where: { id: data.fileId },
      data: { isDeleted: true }
    });
    return { success: true };
  }

  @GrpcMethod('MetadataService', 'GetStorageStats')
  async getStorageStats(data: { userId: string }) {
    const aggregate = await this.prisma.fileOwnership.aggregate({
      where: { userId: data.userId, isDeleted: false },
      _sum: { fileSize: true }
    });
    const usedBytes = Number(aggregate._sum.fileSize || 0);
    const limitBytes = 20 * 1024 * 1024 * 1024; // 20 GB default limit
    return { usedBytes, limitBytes };
  }
}
