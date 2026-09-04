'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { friendlyAuthError } from '@vspace/core';
import { useAuth } from '@/lib/auth-context';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const { signInEmail, signInGoogle } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<'email' | 'google' | null>(null);

  async function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading('email');
    try {
      await signInEmail(email, password);
      router.push('/');
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(null);
    }
  }

  async function handleGoogle() {
    setError(null);
    setLoading('google');
    try {
      await signInGoogle();
      router.push('/');
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-6 py-12">
      <div className="w-full max-w-sm v-enter">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 size-11 rounded-2xl bg-accent" />
          <h1 className="text-title text-text">V-Space</h1>
          <p className="mt-1.5 text-bodySm text-text-muted">Paste anything. Find it again.</p>
        </div>

        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3.5">
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Field
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="text-bodySm text-overdue">{error}</p>}

          <Button type="submit" loading={loading === 'email'} className="mt-1.5 w-full">
            Sign in
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-micro text-text-faint">OR</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          variant="outline"
          onClick={handleGoogle}
          loading={loading === 'google'}
          className="w-full"
        >
          Continue with Google
        </Button>

        <p className="mt-8 text-center text-bodySm text-text-muted">
          New here?{' '}
          <Link href="/auth/signup" className="font-semibold text-text hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
