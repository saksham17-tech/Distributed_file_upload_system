"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const prisma_service_1 = require("./prisma.service");
let AppController = class AppController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async ensureUser(userId) {
        await this.prisma.user.upsert({
            where: { id: userId },
            update: {},
            create: { id: userId, email: `${userId}@local`, passwordHash: 'external-auth' }
        });
    }
    async checkFileExists(data) {
        const content = await this.prisma.content.findUnique({
            where: { hash: data.fileHash }
        });
        if (content) {
            await this.ensureUser(data.userId);
            const ownership = await this.prisma.fileOwnership.create({
                data: {
                    userId: data.userId,
                    contentHash: content.hash,
                    originalName: 'Duplicate File',
                    mimeType: 'application/octet-stream',
                    status: 'AVAILABLE'
                }
            });
            return { exists: true, fileId: ownership.id };
        }
        return { exists: false, fileId: '' };
    }
    async registerUploadSession(data) {
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
    async getFiles(data) {
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
    async toggleStar(data) {
        const file = await this.prisma.fileOwnership.findUnique({ where: { id: data.fileId } });
        if (!file)
            return { isStarred: false };
        const updated = await this.prisma.fileOwnership.update({
            where: { id: data.fileId },
            data: { isStarred: !file.isStarred }
        });
        return { isStarred: updated.isStarred };
    }
    async deleteFile(data) {
        await this.prisma.fileOwnership.update({
            where: { id: data.fileId },
            data: { isDeleted: true }
        });
        return { success: true };
    }
    async getStorageStats(data) {
        const aggregate = await this.prisma.fileOwnership.aggregate({
            where: { userId: data.userId, isDeleted: false },
            _sum: { fileSize: true }
        });
        const usedBytes = Number(aggregate._sum.fileSize || 0);
        const limitBytes = 20 * 1024 * 1024 * 1024;
        return { usedBytes, limitBytes };
    }
};
exports.AppController = AppController;
__decorate([
    (0, microservices_1.GrpcMethod)('MetadataService', 'CheckFileExists'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "checkFileExists", null);
__decorate([
    (0, microservices_1.GrpcMethod)('MetadataService', 'RegisterUploadSession'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "registerUploadSession", null);
__decorate([
    (0, microservices_1.GrpcMethod)('MetadataService', 'GetFiles'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getFiles", null);
__decorate([
    (0, microservices_1.GrpcMethod)('MetadataService', 'ToggleStar'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "toggleStar", null);
__decorate([
    (0, microservices_1.GrpcMethod)('MetadataService', 'DeleteFile'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "deleteFile", null);
__decorate([
    (0, microservices_1.GrpcMethod)('MetadataService', 'GetStorageStats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getStorageStats", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AppController);
//# sourceMappingURL=app.controller.js.map