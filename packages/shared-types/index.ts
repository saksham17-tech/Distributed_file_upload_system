export interface UploadEvent {
  uploadId: string;
  fileId: string;
  timestamp: string;
}

export interface ChunkReceivedEvent {
  uploadId: string;
  chunkIndex: number;
  etag: string;
}

export interface KafkaTopics {
  UPLOAD_CREATED: "upload.created";
  CHUNK_RECEIVED: "chunk.received";
  UPLOAD_COMPLETED: "upload.completed";
  FILE_AVAILABLE: "file.available";
}
