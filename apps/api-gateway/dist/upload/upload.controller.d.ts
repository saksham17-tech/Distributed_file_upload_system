import { UploadService } from './upload.service';
export declare class UploadController {
    private readonly uploadService;
    constructor(uploadService: UploadService);
    init(body: {
        filename: string;
        totalSize: number;
        totalChunks: number;
        mimeType?: string;
        userId?: string;
    }): Promise<{
        fileId: string;
    }>;
    listFiles(): Promise<{
        id: string;
        totalSize: bigint;
        filename: string;
        mimeType: string;
        storagePath: string | null;
        createdAt: Date;
    }[]>;
    usage(): Promise<{
        usedBytes: number;
        limitBytes: number;
        remainingBytes: number;
        fileCount: number;
    }>;
    status(fileId: string): Promise<{
        status: import(".prisma/client").$Enums.FileStatus;
        totalChunks: number;
        uploadedChunks: number[];
        filename: string;
        totalSize: number;
        storagePath: string | null;
    }>;
    uploadChunk(fileId: string, chunkIndex: number, checksum: string, file: Express.Multer.File): Promise<{
        ok: boolean;
        chunkIndex: number;
        uploadedChunks: number;
        totalChunks: number;
        completed: boolean;
    }>;
}
