'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import FileUploader from './FileUploader';
import FileDashboard from './FileDashboard';

export default function DashboardClient() {
  const searchParams = useSearchParams();
  const rawView = searchParams.get('view');
  const view = rawView === 'files' || rawView === 'bin' ? rawView : 'upload';
  
  const [refreshSignal, setRefreshSignal] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshSignal((prev) => prev + 1);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      {view === 'upload' && (
        <div className="space-y-8 transition-all duration-300">
          <FileUploader onSuccess={handleUploadSuccess} />
          <div className="pt-4">
            <h2 className="mb-4 text-lg font-medium text-zinc-200">Recent Files</h2>
            <FileDashboard refreshSignal={refreshSignal} isBin={false} />
          </div>
        </div>
      )}

      {view === 'files' && (
        <div className="transition-all duration-300">
          <h1 className="mb-6 text-2xl font-semibold text-zinc-100">My Files</h1>
          <FileDashboard refreshSignal={refreshSignal} isBin={false} />
        </div>
      )}

      {view === 'bin' && (
        <div className="transition-all duration-300">
          <h1 className="mb-2 text-2xl font-semibold text-zinc-100">Trash Bin</h1>
          <p className="mb-6 text-sm text-zinc-400">
            Files in the bin are automatically deleted after 5 days.
          </p>
          <FileDashboard refreshSignal={refreshSignal} isBin={true} />
        </div>
      )}
    </div>
  );
}