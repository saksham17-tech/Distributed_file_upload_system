# DFUP — Single Next.js App (Supabase)

Zero-Docker, zero-NestJS resumable file uploader.

- **Frontend + API** live in one Next.js 15 App Router process
- **Supabase** PostgreSQL (`files`, `file_chunks`) + Storage bucket `dfup`
- 5 MB chunks, SHA-256, 180 s timeout, 3× exponential backoff, pause/resume
- Hard **1 GB** free-tier quota

## Setup

1. Create tables in Supabase SQL editor (snake_case):

```sql
create type file_status as enum ('UPLOADING', 'COMPLETED', 'FAILED');

create table files (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  total_size bigint not null,
  total_chunks int not null,
  mime_type text not null default 'application/octet-stream',
  status file_status not null default 'UPLOADING',
  storage_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table file_chunks (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references files(id) on delete cascade,
  chunk_index int not null,
  chunk_size int not null,
  checksum text not null,
  uploaded_at timestamptz default now(),
  unique (file_id, chunk_index)
);

create index on file_chunks (file_id);
```

2. Create Storage bucket named **`dfup`**.

3. Copy `.env.example` → `.env.local` and set `SUPABASE_SERVICE_ROLE_KEY`.

```bash
npm install
npm run dev
# → http://localhost:3000
```

## API (same origin)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/upload/init` | Quota check + create file row → `{ fileId }` |
| POST | `/api/upload/:fileId/chunk?chunkIndex=&checksum=` | Binary chunk + SHA-256 |
| GET | `/api/upload/:fileId/status` | `{ status, totalChunks, uploadedChunks[] }` |

## Project tree

```
src/
  app/
    api/upload/init/route.ts
    api/upload/[fileId]/chunk/route.ts
    api/upload/[fileId]/status/route.ts
    layout.tsx
    page.tsx
  components/FileUploader.tsx
  lib/supabaseServer.ts
  lib/upload.ts
```
