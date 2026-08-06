import { Controller, Post, Body, Inject, OnModuleInit, UseGuards, Req, Get, Param } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { AuthGuard } from '../auth.guard';

interface UploadService {
  initUpload(data: { fileHash: string; fileSize: number; userId: string; filename: string }): Observable<any>;
  generatePresignedUrls(data: { uploadId: string; chunksCount: number; fileId: string }): Observable<any>;
  completeUpload(data: { uploadId: string; etags: string[]; fileId: string }): Observable<any>;
  getDownloadUrl(data: { fileId: string }): Observable<any>;
}

@Controller('upload')
@UseGuards(AuthGuard)
export class UploadController implements OnModuleInit {
  private uploadService: UploadService;

  constructor(@Inject('UPLOAD_PACKAGE') private client: ClientGrpc) {}

  onModuleInit() {
    this.uploadService = this.client.getService<UploadService>('UploadService');
  }

  @Post('init')
  initUpload(@Body() body: { fileHash: string; fileSize: number; filename: string }, @Req() req: any) {
    return this.uploadService.initUpload({ ...body, userId: req.user.sub });
  }

  @Post('presigned-urls')
  getUrls(@Body() body: { uploadId: string; chunksCount: number; fileId: string }) {
    return this.uploadService.generatePresignedUrls(body);
  }

  @Post('complete')
  completeUpload(@Body() body: { uploadId: string; etags: string[]; fileId: string }) {
    return this.uploadService.completeUpload(body);
  }

  @Get('download/*')
  getDownloadUrl(@Req() req: any) {
    // extract full key from wildcard path
    const fileId = req.params[0];
    return this.uploadService.getDownloadUrl({ fileId });
  }
}
