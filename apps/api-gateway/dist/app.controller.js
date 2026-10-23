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
const jwt_1 = require("@nestjs/jwt");
const app_service_1 = require("./app.service");
const auth_guard_1 = require("./auth.guard");
const rxjs_1 = require("rxjs");
const common_2 = require("@nestjs/common");
let AppController = class AppController {
    constructor(appService, jwtService, client) {
        this.appService = appService;
        this.jwtService = jwtService;
        this.client = client;
    }
    onModuleInit() {
        this.metadataService = this.client.getService('MetadataService');
    }
    async login(body) {
        const payload = { sub: body.username || 'demo-user', username: body.username || 'demo-user' };
        return {
            access_token: await this.jwtService.signAsync(payload),
        };
    }
    async getFiles(req) {
        const response = await (0, rxjs_1.firstValueFrom)(this.metadataService.getFiles({ userId: req.user.sub }));
        return response.files || [];
    }
    async getStorageStats(req) {
        return await (0, rxjs_1.firstValueFrom)(this.metadataService.getStorageStats({ userId: req.user.sub }));
    }
    async toggleStar(id, req) {
        return await (0, rxjs_1.firstValueFrom)(this.metadataService.toggleStar({ fileId: id, userId: req.user.sub }));
    }
    async deleteFile(id, req) {
        return await (0, rxjs_1.firstValueFrom)(this.metadataService.deleteFile({ fileId: id, userId: req.user.sub }));
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Post)('auth/login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "login", null);
__decorate([
    (0, common_1.Get)('files'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getFiles", null);
__decorate([
    (0, common_1.Get)('user/storage'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getStorageStats", null);
__decorate([
    (0, common_2.Patch)('files/:id/star'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_2.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "toggleStar", null);
__decorate([
    (0, common_2.Delete)('files/:id'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_2.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "deleteFile", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __param(2, (0, common_1.Inject)('METADATA_PACKAGE')),
    __metadata("design:paramtypes", [app_service_1.AppService,
        jwt_1.JwtService, Object])
], AppController);
//# sourceMappingURL=app.controller.js.map