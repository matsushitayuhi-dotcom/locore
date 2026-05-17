'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Mail, Loader2 } from 'lucide-react';
import { sendTestEmail } from './actions';

/**
 * 管理画面の Resend 動作確認用ボタン。
 * 一発で support@locore.app (もしくは LOCORE_SUPPORT_EMAIL) に
 * テストメールを送って、Resend のセットアップが正しいか検証する。
 */
export function TestEmailButton() {
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    setResult(null);
    startTransition(async () => {
      try {
        const res = await sendTestEmail();
        if (res.ok) {
          if (res.skipped) {
            setResult(`⚠ スキップ: ${res.reason}`);
            toast.warning('メール送信スキップ', { description: res.reason });
          } else {
            setResult(`✓ 送信成功 (id=${res.id ?? '?'})`);
            toast.success('テストメールを送信しました', {
              description: `送信先: ${res.to}`,
            });
          }
        } else {
          setResult(`✕ 失敗: ${res.error}`);
          toast.error('送信失敗', { description: res.error });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : '不明なエラー';
        setResult(`✕ 例外: ${msg}`);
        toast.error(msg);
      }
    });
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-[12px] font-semibold text-foreground ring-1 ring-border transition hover:bg-muted disabled:opacity-60"
      >
        {isPending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            送信中…
          </>
        ) : (
          <>
            <Mail className="h-3.5 w-3.5" />
            テストメール送信
          </>
        )}
      </button>
      {result ? (
        <p className="font-mono text-[11px] text-foreground/70">{result}</p>
      ) : null}
    </div>
  );
}
