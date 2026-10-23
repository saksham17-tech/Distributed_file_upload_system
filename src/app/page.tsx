import FileUploader from '@/components/FileUploader';
import FileDashboard from '@/components/FileDashboard';

export default function Home() {
  return (
    <main style={{ padding: '2rem 1rem', maxWidth: 720, margin: '0 auto' }}>
      <header style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
          DFUP
        </h1>
        <p style={{ color: '#888', marginTop: 8 }}>
          Resumable uploads · Next.js App Router · Supabase
        </p>
      </header>
      <FileUploader />
      <FileDashboard />
    </main>
  );
}
