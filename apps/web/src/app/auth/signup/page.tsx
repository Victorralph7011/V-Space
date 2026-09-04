'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { friendlyAuthError } from '@vspace/core';
import { useAuth } from '@/lib/auth-context';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';

export default function SignupPage() {
  const { signUpEmail } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signUpEmail(email, password, name);
      router.push('/');
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-6 py-12">
      <div className="w-full max-w-sm v-enter">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 size-11 rounded-2xl bg-accent" />
          <h1 className="text-title text-text">Create your space</h1>
          <p className="mt-1.5 text-bodySm text-text-muted">One account. Everything you save.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <Field label="Name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
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
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="text-bodySm text-overdue">{error}</p>}

          <Button type="submit" loading={loading} className="mt-1.5 w-full">
            Create account
          </Button>
        </form>

        <p className="mt-8 text-center text-bodySm text-text-muted">
          Already have a space?{' '}
          <Link href="/auth/login" className="font-semibold text-text hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
