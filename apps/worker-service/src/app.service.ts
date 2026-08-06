import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Consumer, Producer } from 'kafkajs';

@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
  private kafka = new Kafka({
    clientId: 'worker-service',
    brokers: ['localhost:9092'],
  });
  private consumer: Consumer = this.kafka.consumer({ groupId: 'worker-group' });
  private producer: Producer = this.kafka.producer();

  async onModuleInit() {
    await this.producer.connect();
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'upload.completed', fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const data = JSON.parse(message.value.toString());
        console.log(`Worker processing upload: ${data.fileId}`);

        // Simulate checking file hash, calculating size, updating metadata DB, etc.
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log(`Worker finalized file: ${data.fileId}`);

        // Broadcast file availability to api-gateway for WebSockets
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
}
