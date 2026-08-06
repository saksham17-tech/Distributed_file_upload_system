import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
export declare class AppService implements OnModuleInit, OnModuleDestroy {
    private kafka;
    private consumer;
    private producer;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
