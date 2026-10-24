import { Suspense } from 'react';
import DashboardClient from '@/components/DashboardClient';

export default function DashboardPage() {
  return (
    <Suspense 
      fallback={
        <div className="flex h-full w-full items-center justify-center p-8 text-sm text-zinc-400 animate-pulse">
          Loading workspace...
        </div>
      }
    >
      <DashboardClient />
    </Suspense>
  );
}