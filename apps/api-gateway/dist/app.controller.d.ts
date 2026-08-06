import { OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppService } from './app.service';
import type { ClientGrpc } from '@nestjs/microservices';
export declare class AppController implements OnModuleInit {
    private readonly appService;
    private jwtService;
    private client;
    private metadataService;
    constructor(appService: AppService, jwtService: JwtService, client: ClientGrpc);
    onModuleInit(): void;
    login(body: {
        username: string;
    }): Promise<{
        access_token: string;
    }>;
    getFiles(req: any): Promise<any>;
    getStorageStats(req: any): Promise<any>;
    toggleStar(id: string, req: any): Promise<any>;
    deleteFile(id: string, req: any): Promise<any>;
}
