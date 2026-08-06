import { PrismaService } from './prisma.service';
export declare class AppController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    checkFileExists(data: {
        fileHash: string;
        fileSize: number;
        userId: string;
    }): Promise<{
        exists: boolean;
        fileId: string;
    }>;
    registerUploadSession(data: {
        fileId: string;
        userId: string;
        filename: string;
        fileSize: number;
    }): Promise<{
        success: boolean;
    }>;
    getFiles(data: {
        userId: string;
    }): Promise<{
        files: {
            id: string;
            originalName: string;
            mimeType: string;
            fileSize: number;
            isStarred: boolean;
            isDeleted: boolean;
            createdAt: string;
            status: import(".prisma/client").$Enums.FileStatus;
        }[];
    }>;
    toggleStar(data: {
        fileId: string;
        userId: string;
    }): Promise<{
        isStarred: boolean;
    }>;
    deleteFile(data: {
        fileId: string;
        userId: string;
    }): Promise<{
        success: boolean;
    }>;
    getStorageStats(data: {
        userId: string;
    }): Promise<{
        usedBytes: number;
        limitBytes: number;
    }>;
}
