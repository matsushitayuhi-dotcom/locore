'use client';

import { useState, useTransition } from 'react';
import { Button, Input } from '@locore/ui';
import { signIn } from '@/app/auth/login/actions';

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await signIn({ email, password, redirectTo });
      if (res && !res.ok) {
        setError(res.error);
      }
      // 成功時は redirect されるためここには来ない
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-[12px] font-medium text-foreground/80">
          メールアドレス
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-[12px] font-medium text-foreground/80">
          パスワード
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="8 文字以上"
        />
      </div>

      {error ? (
        <p role="alert" className="text-[12px] text-danger-500">
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="primary" size="md" className="w-full" disabled={pending}>
        {pending ? 'ログイン中…' : 'ログイン'}
      </Button>
    </form>
  );
}
