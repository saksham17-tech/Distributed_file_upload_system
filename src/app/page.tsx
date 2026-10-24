import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-950 text-zinc-50">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800/40 via-zinc-950 to-zinc-950"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      
      <div className="relative z-10 flex flex-col items-center px-4 text-center">
        <div className="mb-8 flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-1.5 text-sm font-medium text-zinc-400 backdrop-blur-md">
          <span className="flex h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
          Vault Storage Architecture
        </div>
        
        <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight sm:text-7xl">
          Next-Generation File Storage. <br />
          <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Built for Scale.
          </span>
        </h1>
        
        <p className="mt-8 max-w-2xl text-lg text-zinc-400 sm:text-xl">
          Secure, high-speed chunked file uploads engineered to bypass server limits. Seamlessly upload, manage, and retrieve massive files.
        </p>
        
        <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:scale-105 hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]"
          >
            Get Started
          </Link>
          <Link
            href="https://github.com/xsanchitgupta/distributed_file_upload_system"
            target="_blank"
            className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-8 py-3.5 text-sm font-semibold text-zinc-300 backdrop-blur-md transition-colors hover:bg-zinc-800"
          >
            View on GitHub
          </Link>
        </div>
      </div>
    </div>
  );
}
