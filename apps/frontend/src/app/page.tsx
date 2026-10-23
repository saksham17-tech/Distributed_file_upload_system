import FileUploader from '@/components/FileUploader';

export default function Home() {
  return (
    <main style={{ padding: '2rem 1rem' }}>
      <header style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
          DFUP Streamlined
        </h1>
        <p style={{ color: '#888', marginTop: 8 }}>
          Zero-Docker · Supabase PostgreSQL + Storage · NestJS + Next.js
        </p>
      </header>
      <FileUploader />
    </main>
  );
}
