import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { UploadController } from './upload.controller';
import { join } from 'path';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'UPLOAD_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'upload',
          protoPath: join(__dirname, '../../../../packages/grpc-protos/upload.proto'),
          url: 'localhost:50051',
        },
      },
    ]),
  ],
  controllers: [UploadController],
})
export class UploadModule {}
