import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: 'metadata',
      protoPath: join(__dirname, '../../../packages/grpc-protos/metadata.proto'),
      url: '0.0.0.0:50052', // Listening on port 50052 for metadata
    },
  });
  await app.listen();
}
bootstrap();
