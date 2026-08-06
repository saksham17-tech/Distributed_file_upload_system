"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
const kafkajs_1 = require("kafkajs");
let AppService = class AppService {
    kafka = new kafkajs_1.Kafka({
        clientId: 'worker-service',
        brokers: ['localhost:9092'],
    });
    consumer = this.kafka.consumer({ groupId: 'worker-group' });
    producer = this.kafka.producer();
    async onModuleInit() {
        await this.producer.connect();
        await this.consumer.connect();
        await this.consumer.subscribe({ topic: 'upload.completed', fromBeginning: false });
        await this.consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                const data = JSON.parse(message.value.toString());
                console.log(`Worker processing upload: ${data.fileId}`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                console.log(`Worker finalized file: ${data.fileId}`);
                await this.producer.send({
                    topic: 'file.available',
                    messages: [{ value: JSON.stringify({ fileId: data.fileId, status: 'AVAILABLE' }) }]
                });
            },
        });
    }
    async onModuleDestroy() {
        await this.consumer.disconnect();
        await this.producer.disconnect();
    }
};
exports.AppService = AppService;
exports.AppService = AppService = __decorate([
    (0, common_1.Injectable)()
], AppService);
//# sourceMappingURL=app.service.js.map