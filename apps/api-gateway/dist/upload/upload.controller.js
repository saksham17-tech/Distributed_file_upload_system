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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const upload_service_1 = require("./upload.service");
let UploadController = class UploadController {
    constructor(uploadService) {
        this.uploadService = uploadService;
    }
    async init(body) {
        return this.uploadService.initUpload({
            filename: body.filename,
            totalSize: Number(body.totalSize),
            totalChunks: Number(body.totalChunks),
            mimeType: body.mimeType || 'application/octet-stream',
            userId: body.userId,
        });
    }
    async listFiles() {
        return this.uploadService.listFiles();
    }
    async usage() {
        return this.uploadService.getUsage();
    }
    async status(fileId) {
        return this.uploadService.getStatus(fileId);
    }
    async uploadChunk(fileId, chunkIndex, checksum, file) {
        if (!file?.buffer) {
            throw new common_1.BadRequestException('Missing chunk file (field name: "chunk")');
        }
        if (!checksum) {
            throw new common_1.BadRequestException('Missing checksum query param');
        }
        return this.uploadService.uploadChunk(fileId, chunkIndex, checksum, file.buffer);
    }
};
exports.UploadController = UploadController;
__decorate([
    (0, common_1.Post)('init'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "init", null);
__decorate([
    (0, common_1.Get)('files/list'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "listFiles", null);
__decorate([
    (0, common_1.Get)('usage/quota'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "usage", null);
__decorate([
    (0, common_1.Get)(':fileId/status'),
    __param(0, (0, common_1.Param)('fileId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "status", null);
__decorate([
    (0, common_1.Post)(':fileId/chunk'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('chunk', {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: 12 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Param)('fileId')),
    __param(1, (0, common_1.Query)('chunkIndex', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('checksum')),
    __param(3, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, String, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadChunk", null);
exports.UploadController = UploadController = __decorate([
    (0, common_1.Controller)('upload'),
    __metadata("design:paramtypes", [upload_service_1.UploadService])
], UploadController);
//# sourceMappingURL=upload.controller.js.map