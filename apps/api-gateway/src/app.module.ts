import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UploadModule } from './upload/upload.module';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsGateway } from './notifications.gateway';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: 'super-secret-jwt-key', // Hardcoded for this portfolio demonstration
      signOptions: { expiresIn: '1d' },
    }),
    ClientsModule.register([
      {
        name: 'METADATA_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'metadata',
          protoPath: join(__dirname, '../../../../packages/grpc-protos/metadata.proto'),
          url: 'localhost:50052',
        },
      },
    ]),
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService, NotificationsGateway],
})
export class AppModule {}
