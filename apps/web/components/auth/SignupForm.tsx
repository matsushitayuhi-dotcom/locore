'use client';

import { useState, useTransition } from 'react';
import { Button, Input } from '@locore/ui';
import { signUp } from '@/app/auth/signup/actions';

export function SignupForm({ redirectTo }: { redirectTo?: string }) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await signUp({ displayName, email, password, redirectTo });
      if (res && !res.ok) {
        setError(res.error);
      }
      // 成功時は redirect される
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="displayName" className="text-[12px] font-medium text-foreground/80">
          表示名
        </label>
        <Input
          id="displayName"
          type="text"
          autoComplete="nickname"
          required
          maxLength={50}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="例：パリの順子"
        />
      </div>

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
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="8 文字以上"
        />
        <p className="text-[11px] text-foreground/55">
          英字・数字を含む 8 文字以上を推奨します。
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-[12px] text-danger-500">
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="primary" size="md" className="w-full" disabled={pending}>
        {pending ? '登録中…' : 'アカウントを作成'}
      </Button>

      <p className="text-[11px] leading-relaxed text-foreground/55">
        登録は{' '}
        <a href="/legal#terms" className="underline-offset-4 hover:underline">
          利用規約
        </a>{' '}
        と{' '}
        <a href="/legal#privacy" className="underline-offset-4 hover:underline">
          プライバシーポリシー
        </a>{' '}
        に同意したものとみなされます。
      </p>
    </form>
  );
}
