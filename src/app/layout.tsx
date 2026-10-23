import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DFUP — Streamlined File Upload',
  description: 'Resumable chunked uploads with 1 GB free-tier quota',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: '#0a0a0a',
          color: '#eee',
          minHeight: '100vh',
        }}
      >
        {children}
      </body>
    </html>
  );
}
