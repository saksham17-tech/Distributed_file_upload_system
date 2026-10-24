'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  UploadCloud,
  Folder,
  Trash2,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { getSupabaseBrowser, hasPublicSupabaseConfig } from '@/lib/supabaseBrowser';

const NAV = [
  { href: '/dashboard?view=upload', view: 'upload', label: 'Upload', icon: UploadCloud },
  { href: '/dashboard?view=files', view: 'files', label: 'My Files', icon: Folder },
  { href: '/dashboard?view=bin', view: 'bin', label: 'Bin', icon: Trash2 },
] as const;

function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get('view');
  const view =
    raw === 'files' || raw === 'bin' || raw === 'upload' ? raw : 'upload';

  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(true);

  // Canonicalize /dashboard → /dashboard?view=upload
  useEffect(() => {
    if (!raw || !['upload', 'files', 'bin'].includes(raw)) {
      router.replace('/dashboard?view=upload');
    }
  }, [raw, router]);

  useEffect(() => {
    if (!hasPublicSupabaseConfig()) {
      router.replace('/login');
      return;
    }

    const supabase = getSupabaseBrowser();
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (!data.session) {
        router.replace('/login');
        return;
      }
      setEmail(data.session.user.email ?? 'Signed in');
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/login');
        return;
      }
      setEmail(session.user.email ?? 'Signed in');
      setReady(true);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  async function logout() {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-zinc-950 text-sm text-zinc-500">
        Checking session…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-50">
      <aside
        className={`flex shrink-0 flex-col transition-all duration-300 ease-in-out ${
          open ? 'w-60 opacity-100' : 'w-0 overflow-hidden opacity-0'
        }`}
      >
        <div className="m-3 flex h-[calc(100%-1.5rem)] w-[calc(15rem-0.25rem)] flex-col rounded-2xl border border-zinc-800/50 bg-zinc-900/70 p-3 backdrop-blur-xl">
          <Link
            href="/"
            className="mb-5 flex items-center gap-2.5 px-2 font-semibold tracking-tight transition-all duration-200 hover:opacity-90"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-sm text-zinc-950">
              V
            </span>
            Vault
          </Link>
          <nav className="flex flex-1 flex-col gap-0.5">
            {NAV.map((item) => {
              const active = view === item.view;
              const Icon = item.icon;
              return (
                <Link
                  key={item.view}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                    active
                      ? 'border-l-2 border-blue-400 bg-zinc-800/50 font-medium text-blue-400'
                      : 'border-l-2 border-transparent text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-100'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-3 border-t border-zinc-800/60 pt-3">
            <p className="truncate px-2 text-xs text-zinc-500" title={email ?? ''}>
              {email}
            </p>
            <button
              type="button"
              onClick={logout}
              className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-zinc-400 transition-all duration-200 hover:bg-zinc-800/40 hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col transition-all duration-300">
        <header className="flex h-14 items-center gap-3 border-b border-zinc-800/50 px-4 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-xl text-zinc-400 transition-all duration-200 hover:bg-zinc-800/50 hover:text-zinc-100"
            aria-label={open ? 'Collapse sidebar' : 'Open sidebar'}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="text-sm font-medium text-zinc-300">Vault</span>
        </header>
        <main className="min-w-0 flex-1 px-6 py-6 transition-all duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-zinc-950 text-sm text-zinc-500">
          Loading…
        </div>
      }
    >
      <Shell>{children}</Shell>
    </Suspense>
  );
}
