import { redirect } from 'next/navigation';

/** Legacy path — send to main dashboard (upload), never force bin. */
export default function LegacyBinPath() {
  redirect('/dashboard');
}
