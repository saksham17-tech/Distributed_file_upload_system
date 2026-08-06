import { Controller, Post, Body, Get, UseGuards, Inject, OnModuleInit, Req } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppService } from './app.service';
import { AuthGuard } from './auth.guard';
import type { ClientGrpc } from '@nestjs/microservices';
import { Observable, firstValueFrom } from 'rxjs';

import { Param, Patch, Delete } from '@nestjs/common';

interface MetadataService {
  getFiles(data: { userId: string }): Observable<any>;
  toggleStar(data: { fileId: string; userId: string }): Observable<any>;
  deleteFile(data: { fileId: string; userId: string }): Observable<any>;
  getStorageStats(data: { userId: string }): Observable<any>;
}

@Controller()
export class AppController implements OnModuleInit {
  private metadataService: MetadataService;

  constructor(
    private readonly appService: AppService,
    private jwtService: JwtService,
    @Inject('METADATA_PACKAGE') private client: ClientGrpc
  ) {}

  onModuleInit() {
    this.metadataService = this.client.getService<MetadataService>('MetadataService');
  }

  @Post('auth/login')
  async login(@Body() body: { username: string }) {
    // In a real app, verify credentials against DB here
    const payload = { sub: body.username || 'demo-user', username: body.username || 'demo-user' };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  @Get('files')
  @UseGuards(AuthGuard)
  async getFiles(@Req() req: any) {
    const response = await firstValueFrom(this.metadataService.getFiles({ userId: req.user.sub }));
    return response.files || [];
  }

  @Get('user/storage')
  @UseGuards(AuthGuard)
  async getStorageStats(@Req() req: any) {
    return await firstValueFrom(this.metadataService.getStorageStats({ userId: req.user.sub }));
  }

  @Patch('files/:id/star')
  @UseGuards(AuthGuard)
  async toggleStar(@Param('id') id: string, @Req() req: any) {
    return await firstValueFrom(this.metadataService.toggleStar({ fileId: id, userId: req.user.sub }));
  }

  @Delete('files/:id')
  @UseGuards(AuthGuard)
  async deleteFile(@Param('id') id: string, @Req() req: any) {
    return await firstValueFrom(this.metadataService.deleteFile({ fileId: id, userId: req.user.sub }));
  }
}
