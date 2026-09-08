'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

/**
 * /residents/[id] エラーバウンダリ。
 * 本番デバッグ中に画面に message / digest / stack を表示する。
 */
export default function ResidentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[residents/[id] error.tsx]', error);
  }, [error]);

  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-md px-4 py-10 sm:px-6 sm:py-14">
        <div className="rounded-2xl bg-danger-50 p-6 ring-1 ring-danger-500/30 sm:p-8">
          {/* 見出しは 402px で 2 行になる。アイコンに shrink-0 が無いと三角が横に潰れる。
              見出しが 1 行に収まる PC 側は元の中央揃えのまま（sm: で据え置き） */}
          <div className="flex items-start gap-2 text-danger-500 sm:items-center">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 sm:mt-0" />
            <h1 className="min-w-0 text-[18px] font-bold">
              駐在員プロフィールの読み込みでエラー
            </h1>
          </div>
          <dl className="mt-4 space-y-2 text-[13px] text-foreground/80">
            <div>
              <dt className="font-bold text-foreground/55">message</dt>
              <dd className="font-mono text-[12px] text-foreground/85 break-words">
                {error?.message ?? '(no message)'}
              </dd>
            </div>
            {error?.digest ? (
              <div>
                <dt className="font-bold text-foreground/55">digest</dt>
                <dd className="font-mono text-[12px] text-foreground/85">
                  {error.digest}
                </dd>
              </div>
            ) : null}
            {error?.stack ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-[12px] font-bold text-foreground/55">
                  スタックトレース (タップして開く)
                </summary>
                {/* スタックは 10px だと実機で読めない。スマホは 11px、PC は sm: で据え置き */}
                <pre className="mt-2 max-h-72 overflow-auto rounded bg-foreground/5 p-3 text-[11px] leading-relaxed text-foreground/80 sm:text-[10px]">
                  {error.stack}
                </pre>
              </details>
            ) : null}
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-2 text-[13px] font-bold text-neutral-950 hover:bg-primary-300"
            >
              再試行
            </button>
            <Link
              href="/services"
              className="inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-[13px] font-semibold text-foreground/75 ring-1 ring-border hover:bg-muted"
            >
              サービス一覧に戻る
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
