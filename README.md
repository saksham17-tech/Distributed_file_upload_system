# DISTRIBUTED FILE UPLOAD SYSTEM

Resumable chunked uploads with a landing page, Supabase auth, and a Google Drive–style dashboard.

## Routes

| Path | Purpose |
|------|---------|
| `/` | Landing / hero |
| `/login` | Email/password + Google OAuth |
| `/dashboard` | Protected shell (Upload / My Files / Shared) |
| `/api/upload/*` | Chunked upload API |

## Setup

1. Create Supabase tables `files` and `file_chunks`, bucket `dfup`.
2. Copy `.env.example` → `.env.local` and set:
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (server)
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser auth)
3. Enable Email and Google providers in Supabase Auth; set redirect URL to `http://localhost:3000/dashboard`.

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Upload engine

- 5 MB chunks, 3 concurrent, SHA-256, 180s timeout, 3× retry
- Smooth byte-level progress via axios `onUploadProgress`
- Server merges chunks into `merged/{fileId}/{filename}`
