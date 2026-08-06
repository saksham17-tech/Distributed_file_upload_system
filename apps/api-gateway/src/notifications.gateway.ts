import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@Injectable()
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server: Server;

  private kafka = new Kafka({
    clientId: 'api-gateway',
    brokers: ['localhost:9092'],
  });
  private consumer: Consumer = this.kafka.consumer({ groupId: 'api-gateway-notifications' });
  private connectedUsers = new Map<string, string>(); // socketId -> userId

  constructor(private jwtService: JwtService) {}

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'file.available', fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        if (!message.value) return;
        const data = JSON.parse(message.value.toString());
        console.log(`Broadcasting file.available for ${data.fileId}`);
        // In a real app we'd map the fileId to the userId from the DB. 
        // For now, broadcast to all connected clients that the file is available
        this.server.emit('file.available', data);
      },
    });
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers['authorization'];
      const payload = await this.jwtService.verifyAsync(token, {
        secret: 'super-secret-jwt-key',
      });
      this.connectedUsers.set(client.id, payload.sub);
      console.log(`Client connected: ${client.id} (User: ${payload.sub})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedUsers.delete(client.id);
    console.log(`Client disconnected: ${client.id}`);
  }
}
