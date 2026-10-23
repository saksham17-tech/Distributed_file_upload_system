import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * POST /upload/init
   * Body: { filename, totalSize, totalChunks, mimeType }
   * Returns: { fileId }
   */
  @Post('init')
  async init(
    @Body()
    body: {
      filename: string;
      totalSize: number;
      totalChunks: number;
      mimeType?: string;
      userId?: string;
    },
  ) {
    return this.uploadService.initUpload({
      filename: body.filename,
      totalSize: Number(body.totalSize),
      totalChunks: Number(body.totalChunks),
      mimeType: body.mimeType || 'application/octet-stream',
      userId: body.userId,
    });
  }

  /** GET /upload/files/list — list completed files (static path before :fileId) */
  @Get('files/list')
  async listFiles() {
    return this.uploadService.listFiles();
  }

  /** GET /upload/usage/quota — current storage usage vs 1 GB cap */
  @Get('usage/quota')
  async usage() {
    return this.uploadService.getUsage();
  }

  /**
   * GET /upload/:fileId/status
   * Returns: { status, totalChunks, uploadedChunks: number[] }
   */
  @Get(':fileId/status')
  async status(@Param('fileId') fileId: string) {
    return this.uploadService.getStatus(fileId);
  }

  /**
   * POST /upload/:fileId/chunk?chunkIndex=0&checksum=abc…
   * Multipart field name: "chunk" (binary)
   */
  @Post(':fileId/chunk')
  @UseInterceptors(
    FileInterceptor('chunk', {
      storage: memoryStorage(),
      limits: { fileSize: 12 * 1024 * 1024 }, // 12 MB safety margin over 5 MB chunks
    }),
  )
  async uploadChunk(
    @Param('fileId') fileId: string,
    @Query('chunkIndex', ParseIntPipe) chunkIndex: number,
    @Query('checksum') checksum: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Missing chunk file (field name: "chunk")');
    }
    if (!checksum) {
      throw new BadRequestException('Missing checksum query param');
    }

    return this.uploadService.uploadChunk(
      fileId,
      chunkIndex,
      checksum,
      file.buffer,
    );
  }
}
