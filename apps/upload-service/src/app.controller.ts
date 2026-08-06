import { Controller, OnModuleInit, Inject } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import type { ClientGrpc } from '@nestjs/microservices';
import { AppService } from './app.service';
import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { firstValueFrom, Observable } from 'rxjs';
import { Kafka, Producer } from 'kafkajs';

interface MetadataService {
  checkFileExists(data: { fileHash: string; fileSize: number; userId: string }): Observable<any>;
  registerUploadSession(data: { fileId: string; userId: string; filename: string; fileSize: number }): Observable<any>;
}

@Controller()
export class AppController implements OnModuleInit {
  private s3: S3Client;
  private bucketName = 'uploads';
  private metadataService: MetadataService;
  private kafka: Kafka;
  private producer: Producer;

  constructor(
    private readonly appService: AppService,
    @Inject('METADATA_PACKAGE') private client: ClientGrpc
  ) {}

  async onModuleInit() {
    const isAws = !!process.env.AWS_REGION || process.env.USE_AWS === 'true';

    this.s3 = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      endpoint: process.env.AWS_S3_ENDPOINT || process.env.MINIO_ENDPOINT || 'http://localhost:9000',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.MINIO_ACCESS_KEY || 'admin',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.MINIO_SECRET_KEY || 'password123',
      },
      forcePathStyle: !isAws, // S3 uses domain-style, MinIO uses path-style
    });
    this.bucketName = process.env.S3_BUCKET_NAME || process.env.MINIO_BUCKET_NAME || 'uploads';

    this.metadataService = this.client.getService<MetadataService>('MetadataService');

    this.kafka = new Kafka({
      clientId: 'upload-service',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
    });
    this.producer = this.kafka.producer();
    await this.producer.connect();
  }

  @GrpcMethod('UploadService', 'InitUpload')
  async initUpload(data: { fileHash: string; fileSize: number; userId: string; filename: string }) {
    // 1. Check if fileHash exists first
    const metadataCheck = await firstValueFrom(
      this.metadataService.checkFileExists({ fileHash: data.fileHash, fileSize: data.fileSize, userId: data.userId })
    );

    if (metadataCheck.exists) {
      return {
        exists: true,
        fileId: metadataCheck.fileId,
        uploadId: '',
      };
    }

    // 2. Initiate Multipart Upload with MinIO
    const key = `${data.userId}/${Date.now()}-${data.filename}`;
    const command = new CreateMultipartUploadCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: 'application/octet-stream',
    });

    try {
      const response = await this.s3.send(command);
      
      // Register in metadata service
      await firstValueFrom(
        this.metadataService.registerUploadSession({
          fileId: key,
          userId: data.userId,
          filename: data.filename,
          fileSize: data.fileSize,
        })
      );

      return {
        exists: false,
        fileId: key, // Using S3 Key as fileId for now
        uploadId: response.UploadId,
      };
    } catch (error) {
      console.error("MinIO Error:", error);
      throw error;
    }
  }

  @GrpcMethod('UploadService', 'GeneratePresignedUrls')
  async generatePresignedUrls(data: { uploadId: string; chunksCount: number; fileId: string }) {
    try {
      const urls = await Promise.all(
        Array.from({ length: data.chunksCount }).map(async (_, i) => {
          const command = new UploadPartCommand({
            Bucket: this.bucketName,
            Key: data.fileId, // Use the fileId which is the Key
            UploadId: data.uploadId,
            PartNumber: i + 1,
          });
          return await getSignedUrl(this.s3, command, { expiresIn: 3600 });
        })
      );
      return { presignedUrls: urls };
    } catch (error) {
      console.error("Presigner Error:", error);
      throw error;
    }
  }

  @GrpcMethod('UploadService', 'CompleteUpload')
  async completeUpload(data: { uploadId: string; etags: string[]; fileId: string }) {
    try {
      const command = new CompleteMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: data.fileId,
        UploadId: data.uploadId,
        MultipartUpload: {
          Parts: data.etags.map((etag, index) => ({
            ETag: etag,
            PartNumber: index + 1,
          })),
        },
      });

      await this.s3.send(command);

      // Send Kafka event
      await this.producer.send({
        topic: 'upload.completed',
        messages: [
          { value: JSON.stringify({ fileId: data.fileId, uploadId: data.uploadId }) },
        ],
      });
      
      return { success: true, fileId: data.fileId };
    } catch (error) {
      console.error("Complete Upload Error:", error);
      throw error;
    }
  }

  @GrpcMethod('UploadService', 'GetDownloadUrl')
  async getDownloadUrl(data: { fileId: string }) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: data.fileId,
      });
      const url = await getSignedUrl(this.s3, command, { expiresIn: 3600 });
      return { downloadUrl: url };
    } catch (error) {
      console.error("GetDownloadUrl Error:", error);
      throw error;
    }
  }
}
