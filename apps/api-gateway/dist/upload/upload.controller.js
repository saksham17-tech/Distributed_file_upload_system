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
const auth_guard_1 = require("../auth.guard");
let UploadController = class UploadController {
    client;
    uploadService;
    constructor(client) {
        this.client = client;
    }
    onModuleInit() {
        this.uploadService = this.client.getService('UploadService');
    }
    initUpload(body, req) {
        return this.uploadService.initUpload({ ...body, userId: req.user.sub });
    }
    getUrls(body) {
        return this.uploadService.generatePresignedUrls(body);
    }
    completeUpload(body) {
        return this.uploadService.completeUpload(body);
    }
    getDownloadUrl(req) {
        const fileId = req.params[0];
        return this.uploadService.getDownloadUrl({ fileId });
    }
};
exports.UploadController = UploadController;
__decorate([
    (0, common_1.Post)('init'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], UploadController.prototype, "initUpload", null);
__decorate([
    (0, common_1.Post)('presigned-urls'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UploadController.prototype, "getUrls", null);
__decorate([
    (0, common_1.Post)('complete'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UploadController.prototype, "completeUpload", null);
__decorate([
    (0, common_1.Get)('download/*'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UploadController.prototype, "getDownloadUrl", null);
exports.UploadController = UploadController = __decorate([
    (0, common_1.Controller)('upload'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Inject)('UPLOAD_PACKAGE')),
    __metadata("design:paramtypes", [Object])
], UploadController);
//# sourceMappingURL=upload.controller.js.map