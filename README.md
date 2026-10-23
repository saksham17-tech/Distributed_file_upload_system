# DISTRUBUTED FILE UPLOAD SYSTEM

Zero-Docker, zero-NestJS resumable file uploader with a buttery-smooth UI.

- **Frontend + API** live in one Next.js 15 App Router process.
- **Supabase** PostgreSQL (`files`, `file_chunks`) + Storage bucket (`dfup`).
- **High Performance:** 5 MB chunks, **3× concurrent uploads** (sliding window pool).
- **Smooth UX:** Byte-level progress tracking via Axios `onUploadProgress` with fluid CSS transitions (no 5 MB stair-stepping).
- **Resilient:** 180s timeout, 3× exponential backoff per chunk, fail-fast pause, and delta-resumption.
- **Quota Guard:** Hard 1 GB free-tier storage limit enforced at the database level.
- **Serverless Merge:** Auto-assembles chunks via `Buffer.concat` into a final downloadable file.

## Setup

1. Create tables in the Supabase SQL editor (snake_case):

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

2. Create a Storage bucket named **`dfup`**.

3. Copy `.env.example` → `.env.local` and set your variables (make sure to use the Service Role Key to bypass RLS for quota checks):
```env
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

4. Install and run:
```bash
npm install
npm run dev
# → http://localhost:3000
```

## API (Same Origin)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/upload/init` | Quota check + create file row → `{ fileId }` |
| POST | `/api/upload/:fileId/chunk?chunkIndex=&checksum=` | Binary chunk + SHA-256 + final merge trigger |
| GET | `/api/upload/:fileId/status` | `{ status, totalChunks, uploadedChunks[] }` |
| GET | `/api/upload/usage/quota` | Returns total used storage bytes vs 1 GB limit |
| GET | `/api/upload/files/list` | Returns completed files with 1-hour signed download URLs |

## Project Tree

```text
src/
  app/
    api/
      upload/
        init/route.ts
        [fileId]/chunk/route.ts
        [fileId]/status/route.ts
        usage/quota/route.ts
        files/list/route.ts
    layout.tsx
    page.tsx
  components/
    FileUploader.tsx
    FileDashboard.tsx
  lib/
    supabaseServer.ts
    upload.ts
```