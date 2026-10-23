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
exports.NotificationsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const kafkajs_1 = require("kafkajs");
const jwt_1 = require("@nestjs/jwt");
let NotificationsGateway = class NotificationsGateway {
    constructor(jwtService) {
        this.jwtService = jwtService;
        this.kafka = new kafkajs_1.Kafka({
            clientId: 'api-gateway',
            brokers: ['localhost:9092'],
        });
        this.consumer = this.kafka.consumer({ groupId: 'api-gateway-notifications' });
        this.connectedUsers = new Map();
    }
    async onModuleInit() {
        await this.consumer.connect();
        await this.consumer.subscribe({ topic: 'file.available', fromBeginning: false });
        await this.consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                if (!message.value)
                    return;
                const data = JSON.parse(message.value.toString());
                console.log(`Broadcasting file.available for ${data.fileId}`);
                this.server.emit('file.available', data);
            },
        });
    }
    async onModuleDestroy() {
        await this.consumer.disconnect();
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.auth.token || client.handshake.headers['authorization'];
            const payload = await this.jwtService.verifyAsync(token, {
                secret: 'super-secret-jwt-key',
            });
            this.connectedUsers.set(client.id, payload.sub);
            console.log(`Client connected: ${client.id} (User: ${payload.sub})`);
        }
        catch {
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        this.connectedUsers.delete(client.id);
        console.log(`Client disconnected: ${client.id}`);
    }
};
exports.NotificationsGateway = NotificationsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], NotificationsGateway.prototype, "server", void 0);
exports.NotificationsGateway = NotificationsGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
    }),
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], NotificationsGateway);
//# sourceMappingURL=notifications.gateway.js.map