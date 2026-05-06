'use client';

import { useState } from 'react';
import { Button } from '@locore/ui';
import { createClient } from '@/lib/supabase/client';

/**
 * Google OAuth ログインボタン。
 * Supabase ダッシュボード側で Google Provider を有効化しておく必要がある。
 */
export function GoogleButton({ redirectTo }: { redirectTo?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const callbackBase = `${window.location.origin}/auth/callback`;
      const callback = redirectTo
        ? `${callbackBase}?redirect_to=${encodeURIComponent(redirectTo)}`
        : callbackBase;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callback,
        },
      });
      if (oauthError) {
        setError('Google ログインに失敗しました。時間をおいて再度お試しください。');
        setBusy(false);
      }
      // 成功時は Google にリダイレクトされるため、setBusy(false) は不要
    } catch {
      setError('Google ログインに失敗しました。');
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="md"
        className="w-full"
        onClick={handleClick}
        disabled={busy}
      >
        <GoogleLogo />
        Google で続ける
      </Button>
      {error ? (
        <p role="alert" className="text-[12px] text-danger-500">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21.6 12.227c0-.713-.064-1.398-.182-2.057H12v3.892h5.382a4.6 4.6 0 0 1-1.997 3.018v2.51h3.232c1.892-1.742 2.983-4.305 2.983-7.363Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.964-.895 6.617-2.41l-3.232-2.51c-.895.6-2.04.955-3.385.955-2.605 0-4.81-1.76-5.596-4.124H3.064v2.59A9.996 9.996 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.404 13.911A6.01 6.01 0 0 1 6.09 12c0-.664.114-1.31.314-1.911v-2.59H3.064A9.996 9.996 0 0 0 2 12c0 1.614.386 3.14 1.064 4.501l3.34-2.59Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.965c1.469 0 2.786.505 3.823 1.495l2.866-2.866C16.96 2.99 14.696 2 12 2 8.105 2 4.74 4.235 3.064 7.499l3.34 2.59C7.19 7.726 9.395 5.965 12 5.965Z"
        fill="#EA4335"
      />
    </svg>
  );
}
