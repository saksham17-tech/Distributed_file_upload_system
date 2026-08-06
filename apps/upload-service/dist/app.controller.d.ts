import { OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { AppService } from './app.service';
export declare class AppController implements OnModuleInit {
    private readonly appService;
    private client;
    private s3;
    private bucketName;
    private metadataService;
    private kafka;
    private producer;
    constructor(appService: AppService, client: ClientGrpc);
    onModuleInit(): Promise<void>;
    initUpload(data: {
        fileHash: string;
        fileSize: number;
        userId: string;
        filename: string;
    }): Promise<{
        exists: boolean;
        fileId: any;
        uploadId: string;
    } | {
        exists: boolean;
        fileId: string;
        uploadId: string | undefined;
    }>;
    generatePresignedUrls(data: {
        uploadId: string;
        chunksCount: number;
        fileId: string;
    }): Promise<{
        presignedUrls: string[];
    }>;
    completeUpload(data: {
        uploadId: string;
        etags: string[];
        fileId: string;
    }): Promise<{
        success: boolean;
        fileId: string;
    }>;
    getDownloadUrl(data: {
        fileId: string;
    }): Promise<{
        downloadUrl: string;
    }>;
}
