import { OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';
export declare class UploadController implements OnModuleInit {
    private client;
    private uploadService;
    constructor(client: ClientGrpc);
    onModuleInit(): void;
    initUpload(body: {
        fileHash: string;
        fileSize: number;
        filename: string;
    }, req: any): Observable<any>;
    getUrls(body: {
        uploadId: string;
        chunksCount: number;
        fileId: string;
    }): Observable<any>;
    completeUpload(body: {
        uploadId: string;
        etags: string[];
        fileId: string;
    }): Observable<any>;
    getDownloadUrl(req: any): Observable<any>;
}
