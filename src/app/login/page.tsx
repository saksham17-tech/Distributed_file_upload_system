'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser, hasPublicSupabaseConfig } from '@/lib/supabaseBrowser';

export default function LoginPage() {
  const router = useRouter();
  const configured = hasPublicSupabaseConfig();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const supabase = getSupabaseBrowser();
      if (mode === 'signup') {
        const { error: signErr } = await supabase.auth.signUp({ email, password });
        if (signErr) throw signErr;
        setInfo('Check your inbox to confirm, or sign in if confirmations are off.');
      } else {
        const { error: signErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signErr) throw signErr;
        router.replace('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  async function signInGoogle() {
    setError(null);
    setBusy(true);
    try {
      const supabase = getSupabaseBrowser();
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (oauthErr) throw oauthErr;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-zinc-950 px-4 text-zinc-100">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800/50 bg-zinc-900/70 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-100 text-sm text-zinc-950">
            V
          </span>
          Vault
        </div>
        <h1 className="text-xl font-medium text-zinc-50">
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Continue with Google or email
        </p>

        {!configured && (
          <p className="mt-4 rounded-lg border border-amber-900/50 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
            Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in
            .env.local
          </p>
        )}

        <button
          type="button"
          onClick={signInGoogle}
          disabled={busy || !configured}
          className="mt-6 w-full rounded-lg bg-zinc-100 py-2.5 text-sm font-medium text-zinc-950 transition-all duration-200 hover:scale-[1.02] hover:bg-white disabled:opacity-50"
        >
          Sign in with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-zinc-600">
          <span className="h-px flex-1 bg-zinc-800" />
          or
          <span className="h-px flex-1 bg-zinc-800" />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-sm">
            <span className="text-zinc-500">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-500">Password</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500"
            />
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {info && <p className="text-sm text-green-400">{info}</p>}
          <button
            type="submit"
            disabled={busy || !configured}
            className="w-full rounded-lg border border-zinc-700 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          className="mt-4 text-sm text-zinc-500 hover:text-zinc-300"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError(null);
            setInfo(null);
          }}
        >
          {mode === 'signin' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
