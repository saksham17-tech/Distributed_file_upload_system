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
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const app_service_1 = require("./app.service");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const rxjs_1 = require("rxjs");
const kafkajs_1 = require("kafkajs");
let AppController = class AppController {
    appService;
    client;
    s3;
    bucketName = 'uploads';
    metadataService;
    kafka;
    producer;
    constructor(appService, client) {
        this.appService = appService;
        this.client = client;
    }
    async onModuleInit() {
        const isAws = !!process.env.AWS_REGION || process.env.USE_AWS === 'true';
        this.s3 = new client_s3_1.S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            endpoint: process.env.AWS_S3_ENDPOINT || process.env.MINIO_ENDPOINT || 'http://localhost:9000',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.MINIO_ACCESS_KEY || 'admin',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.MINIO_SECRET_KEY || 'password123',
            },
            forcePathStyle: !isAws,
        });
        this.bucketName = process.env.S3_BUCKET_NAME || process.env.MINIO_BUCKET_NAME || 'uploads';
        this.metadataService = this.client.getService('MetadataService');
        this.kafka = new kafkajs_1.Kafka({
            clientId: 'upload-service',
            brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
        });
        this.producer = this.kafka.producer();
        await this.producer.connect();
    }
    async initUpload(data) {
        const metadataCheck = await (0, rxjs_1.firstValueFrom)(this.metadataService.checkFileExists({ fileHash: data.fileHash, fileSize: data.fileSize, userId: data.userId }));
        if (metadataCheck.exists) {
            return {
                exists: true,
                fileId: metadataCheck.fileId,
                uploadId: '',
            };
        }
        const key = `${data.userId}/${Date.now()}-${data.filename}`;
        const command = new client_s3_1.CreateMultipartUploadCommand({
            Bucket: this.bucketName,
            Key: key,
            ContentType: 'application/octet-stream',
        });
        try {
            const response = await this.s3.send(command);
            await (0, rxjs_1.firstValueFrom)(this.metadataService.registerUploadSession({
                fileId: key,
                userId: data.userId,
                filename: data.filename,
                fileSize: data.fileSize,
            }));
            return {
                exists: false,
                fileId: key,
                uploadId: response.UploadId,
            };
        }
        catch (error) {
            console.error("MinIO Error:", error);
            throw error;
        }
    }
    async generatePresignedUrls(data) {
        try {
            const urls = await Promise.all(Array.from({ length: data.chunksCount }).map(async (_, i) => {
                const command = new client_s3_1.UploadPartCommand({
                    Bucket: this.bucketName,
                    Key: data.fileId,
                    UploadId: data.uploadId,
                    PartNumber: i + 1,
                });
                return await (0, s3_request_presigner_1.getSignedUrl)(this.s3, command, { expiresIn: 3600 });
            }));
            return { presignedUrls: urls };
        }
        catch (error) {
            console.error("Presigner Error:", error);
            throw error;
        }
    }
    async completeUpload(data) {
        try {
            const command = new client_s3_1.CompleteMultipartUploadCommand({
                Bucket: this.bucketName,
                Key: data.fileId,
                UploadId: data.uploadId,
                MultipartUpload: {
                    Parts: data.etags.map((etag, index) => ({
                        ETag: etag,
                        PartNumber: index + 1,
                    })),
                },
            });
            await this.s3.send(command);
            await this.producer.send({
                topic: 'upload.completed',
                messages: [
                    { value: JSON.stringify({ fileId: data.fileId, uploadId: data.uploadId }) },
                ],
            });
            return { success: true, fileId: data.fileId };
        }
        catch (error) {
            console.error("Complete Upload Error:", error);
            throw error;
        }
    }
    async getDownloadUrl(data) {
        try {
            const command = new client_s3_1.GetObjectCommand({
                Bucket: this.bucketName,
                Key: data.fileId,
            });
            const url = await (0, s3_request_presigner_1.getSignedUrl)(this.s3, command, { expiresIn: 3600 });
            return { downloadUrl: url };
        }
        catch (error) {
            console.error("GetDownloadUrl Error:", error);
            throw error;
        }
    }
};
exports.AppController = AppController;
__decorate([
    (0, microservices_1.GrpcMethod)('UploadService', 'InitUpload'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "initUpload", null);
__decorate([
    (0, microservices_1.GrpcMethod)('UploadService', 'GeneratePresignedUrls'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "generatePresignedUrls", null);
__decorate([
    (0, microservices_1.GrpcMethod)('UploadService', 'CompleteUpload'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "completeUpload", null);
__decorate([
    (0, microservices_1.GrpcMethod)('UploadService', 'GetDownloadUrl'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getDownloadUrl", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __param(1, (0, common_1.Inject)('METADATA_PACKAGE')),
    __metadata("design:paramtypes", [app_service_1.AppService, Object])
], AppController);
//# sourceMappingURL=app.controller.js.map