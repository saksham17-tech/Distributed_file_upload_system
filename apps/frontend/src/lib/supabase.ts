import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yauufbejsxlouihtocyp.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhdXVmYmVqc3hsb3VpaHRvY3lwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjAwMjIyNiwiZXhwIjoyMTAxNTc4MjI2fQ.yw0ZPw9pFr7W5AbV655gNp17AFsMPGpjlVcNwYGEA3I';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
