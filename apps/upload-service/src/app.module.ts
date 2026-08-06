import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'METADATA_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'metadata',
          protoPath: join(__dirname, '../../../../packages/grpc-protos/metadata.proto'),
          url: 'localhost:50052', // Metadata service runs on 50052
        },
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
