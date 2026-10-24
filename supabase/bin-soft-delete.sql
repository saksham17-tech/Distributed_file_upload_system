-- Vault: soft-delete (Bin) schema + optional 5-day purge

ALTER TABLE files
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS files_deleted_at_idx ON files (deleted_at);


COMMENT ON COLUMN files.deleted_at IS
  'NULL = active; set = in Bin. Purge rows older than 5 days via cron or Edge Function.';
