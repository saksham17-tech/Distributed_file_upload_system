# Enterprise Distributed File Upload System (NexusDrive)

A production-grade, fault-tolerant, high-availability distributed cloud storage and multipart file upload system built with **NestJS**, **gRPC**, **Kafka**, **MinIO (S3)**, **PostgreSQL (Prisma)**, **Redis**, and **Next.js 15 (React)**.

Designed for high throughput, massive scale, zero-downtime uploads, and instant Content-Addressable Storage (CAS) deduplication.

---

## Architecture Diagram

```mermaid
flowchart TD
    Client["React Next.js 15 Client"]
    Gateway["API Gateway (HTTP / WebSockets :3001)"]
    UploadSvc["Upload Microservice (gRPC :50051)"]
    MetaSvc["Metadata Microservice (gRPC :50052)"]
    WorkerSvc["Async Worker Microservice"]
    MinIO["MinIO Object Storage (S3 API :9000)"]
    Postgres[(PostgreSQL Database)]
    Kafka{{Apache Kafka Event Bus}}

    Client -->|1. Auth & Init Upload| Gateway
    Gateway -->|gRPC| MetaSvc
    MetaSvc -->|Check Hash / CAS| Postgres
    
    Gateway -->|2. Get Presigned URLs| UploadSvc
    UploadSvc -->|S3 Presigner API| MinIO
    
    Client -->|3. Concurrent PUT Chunks| MinIO
    Client -->|4. Complete Upload| Gateway
    Gateway -->|gRPC Complete| UploadSvc
    UploadSvc -->|Publish upload.completed| Kafka
    
    Kafka -->|Consume upload.completed| WorkerSvc
    WorkerSvc -->|Processing & Publish file.available| Kafka
    Kafka -->|Consume file.available| Gateway
    Gateway -->|5. WebSocket Notification| Client
```

---

## Enterprise System Highlights

### ⚡ Direct S3 Multipart Uploading
- Uploads bypass API Gateway servers completely.
- Files are sliced into 5MB chunks on the client and uploaded concurrently via HTTP `PUT` directly to MinIO/S3 using pre-signed URLs.
- Handles massive multi-gigabyte files with low memory overhead on backend services.

### 🧠 Content-Addressable Storage (CAS) Deduplication
- Files are hashed on the client prior to initiation.
- The `metadata-service` verifies whether the underlying content hash already exists in PostgreSQL.
- If a match is found, the system performs instant deduplication hit—linking `FileOwnership` to existing `Content` without uploading a single byte!

### 📡 Event-Driven Asynchronous Processing (Kafka)
- Decouples storage finalization from worker processing.
- Once MinIO completes multipart assembly, `upload-service` publishes `upload.completed` into Kafka.
- Background `worker-service` nodes scale horizontally to perform heavy tasks (virus scanning, thumbnail generation, hash verification).

### 🔔 Live WebSocket Updates
- Real-time notification gateway using Socket.io and `@nestjs/websockets`.
- When processing finishes, `file.available` events are consumed from Kafka and broadcast directly to active user sessions.

---

## Workspace Structure

```
├── apps/
│   ├── api-gateway/         # REST API, JWT Guard, Socket.io Gateway (:3001)
│   ├── upload-service/      # S3 Pre-signing & Multipart Upload Orchestrator (gRPC :50051)
│   ├── metadata-service/    # Prisma/PostgreSQL File Ownership & CAS Service (gRPC :50052)
│   ├── worker-service/      # Async Kafka Consumer for file processing
│   └── frontend/            # Next.js 15 React Dashboard (:3000)
├── packages/
│   ├── database/            # Prisma Schema & Client package
│   └── grpc-protos/         # Shared Protocol Buffer definitions (.proto)
├── docker-compose.yml       # Production Multi-Service Container Orchestration
└── README.md
```

---

## 🛠️ Quick Start & Local Setup

### Prerequisites
- [Node.js v18+](https://nodejs.org/)
- [Docker & Docker Desktop](https://www.docker.com/)

### Option 1: One-Command Docker Setup (Recommended)

Run the entire cluster (infrastructure + 5 microservices) in Docker containers:

```bash
docker compose up --build
```

Access the services:
- **Next.js Dashboard**: `http://localhost:3000`
- **API Gateway**: `http://localhost:3001`
- **MinIO Console**: `http://localhost:9001` (User: `admin`, Pass: `password123`)
- **Jaeger Tracing**: `http://localhost:16686`
- **Grafana Metrics**: `http://localhost:3000`

---

### Option 2: Local Development Setup

#### 1. Install Workspace Dependencies
```bash
npm install
```

#### 2. Start Infrastructure Containers
```bash
npm run infra:up
```

#### 3. Database Sync & Prisma Client Generation
```bash
npm run db:push
```

#### 4. Launch All Services concurrently
```bash
npm run dev
```

---

## 🔒 Environment Variables Reference

Copy `.env.example` to `.env`:

```env
# Database
DATABASE_URL="postgresql://admin:password@localhost:5432/upload_system?schema=public"

# Storage
MINIO_ENDPOINT="http://localhost:9000"
MINIO_ACCESS_KEY="admin"
MINIO_SECRET_KEY="password123"
MINIO_BUCKET_NAME="uploads"

# Event Bus
KAFKA_BROKER="localhost:9092"

# Security
JWT_SECRET="super-secret-jwt-key"
```

---

## 🧪 System Verification & Testing Features

1. **Multi-Part Resumable Chunking**: Drag & drop any file; watch it chunk into 5MB parts and stream concurrently into MinIO.
2. **Instant Instant Upload (Deduplication)**: Upload the exact same file twice. The second upload finishes instantly in <100ms via Content-Addressable Storage hit.
3. **Dynamic Storage Meter**: Upload and delete files to observe real-time recalculation of total byte usage.
4. **Direct Pre-signed Downloads**: Click the context menu on any file card to download directly from MinIO S3 via signed GET URLs.
