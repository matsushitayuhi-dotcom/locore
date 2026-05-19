'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Sparkles,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Send,
} from 'lucide-react';
import {
  testAiParisEvents,
  runAiParisEventsNow,
  type AiTestResult,
} from './actions';

/**
 * /admin/board の「Claude / Anthropic API 動作確認」セクション。
 *
 * - 「テスト実行」ボタンで Server Action を呼ぶ
 * - DB に書き込まない（read-only テスト）
 * - 結果: 取得件数 / 各 event / 所要時間 / token usage / 生レスポンス
 * - 取り扱いコスト: 1 回あたり概ね $0.10 程度（web_search 含む）
 */
export function AiTestPanel() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isRealRunning, startRealRun] = useTransition();
  const [result, setResult] = useState<AiTestResult | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const onRun = () => {
    setResult(null);
    setShowRaw(false);
    startTransition(async () => {
      try {
        const res = await testAiParisEvents();
        setResult(res);
        if (res.ok) {
          toast.success(
            `${res.validCount} 件取得（${(res.durationMs / 1000).toFixed(1)} 秒）`,
          );
        } else {
          toast.error(res.error);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : '不明なエラー';
        toast.error(`実行失敗: ${msg}`);
        setResult({ ok: false, error: msg });
      }
    });
  };

  const onRealRun = () => {
    if (
      !confirm(
        'Claude を呼んで取得結果を board_posts に保存します（実際にニュースが /board や /expat に出ます）。実行しますか？',
      )
    ) {
      return;
    }
    setResult(null);
    setShowRaw(false);
    startRealRun(async () => {
      try {
        const res = await runAiParisEventsNow();
        if (res.ok) {
          const parts = [`${res.inserted} 件投稿`];
          if (res.skipped > 0) parts.push(`${res.skipped} 件は重複でスキップ`);
          toast.success(
            `${parts.join('、')}（${(res.durationMs / 1000).toFixed(1)} 秒）`,
            { description: '/board / /expat / /calendar にすぐ反映されます' },
          );
          router.refresh();
        } else {
          toast.error(res.error);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : '不明なエラー';
        toast.error(`実行失敗: ${msg}`);
      }
    });
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
            <Sparkles className="h-3 w-3" />
            Claude API 動作確認
          </p>
          <h2 className="mt-1 text-[18px] font-semibold tracking-tight">
            パリのイベント取得テスト
          </h2>
          <p className="mt-1 text-[12px] text-foreground/60">
            Claude (claude-sonnet-4-5) + web_search でパリの今週イベントを取得。
            「テスト実行」は DB に書き込まない、「本番実行」は board_posts に投稿。
            1 回 ≒ $0.10 程度。
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onRun}
            disabled={isPending || isRealRunning}
            className="inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-[12px] font-semibold text-foreground ring-1 ring-border transition hover:bg-muted disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                実行中…
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                テスト実行
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onRealRun}
            disabled={isPending || isRealRunning}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-2 text-[12px] font-bold text-neutral-950 transition hover:bg-primary-300 disabled:opacity-60"
          >
            {isRealRunning ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                投稿中…
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                本番実行 (投稿)
              </>
            )}
          </button>
        </div>
      </header>

      {result === null && !isPending ? (
        <p className="rounded-md bg-muted px-3 py-2 text-[11px] text-foreground/60">
          「テスト実行」を押すと、Anthropic API キーが本番環境変数に入っているか、
          プロンプトが期待どおりに動くかを確認できます。
        </p>
      ) : null}

      {result && !result.ok ? (
        <div className="mt-3 rounded-md bg-danger-500/10 px-3 py-2 text-[12px] text-danger-500 ring-1 ring-danger-500/30">
          <p className="font-bold">エラー</p>
          <p className="mt-0.5 break-all">{result.error}</p>
          <p className="mt-2 text-[11px] text-foreground/55">
            よくある原因: ANTHROPIC_API_KEY が未設定 / Anthropic 側でクレジット切れ /
            web_search ツールがアカウントで未許可
          </p>
        </div>
      ) : null}

      {result && result.ok ? (
        <div className="mt-3 space-y-3">
          {/* サマリー */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="取得件数" value={`${result.validCount} 件`} />
            <Metric label="raw parsed" value={`${result.rawParsedCount} 件`} />
            <Metric
              label="所要時間"
              value={`${(result.durationMs / 1000).toFixed(1)} 秒`}
            />
            <Metric label="stop_reason" value={result.stopReason ?? '—'} />
          </div>

          {/* プロンプト日付 */}
          {result.prompt ? (
            <p className="text-[11px] text-foreground/55">
              送信した日付情報: {result.prompt.today}（{result.prompt.weekdayJa}）
              → {result.prompt.inEightDays} まで
            </p>
          ) : null}

          {/* events */}
          {result.events.length === 0 ? (
            <p className="rounded-md bg-amber-500/10 px-3 py-2 text-[12px] text-amber-800 ring-1 ring-amber-500/30">
              0 件返ってきました。Claude が「条件を満たすイベントがない」と判断したか、
              プロンプトが厳しすぎる可能性。生レスポンスを下で確認してください。
            </p>
          ) : (
            <ul className="space-y-2">
              {result.events.map((e, i) => (
                <li
                  key={i}
                  className="rounded-md border border-border bg-background/40 p-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[13px] font-semibold">{e.title}</p>
                    <span className="text-[11px] tabular text-foreground/55">
                      {(() => {
                        const s = e.event_start_date ?? e.event_date ?? null;
                        const en = e.event_end_date ?? e.event_date ?? null;
                        if (!s) return '日付未定';
                        return en && en !== s ? `${s} 〜 ${en}` : s;
                      })()}
                    </span>
                  </div>
                  {e.event_location ? (
                    <p className="mt-0.5 text-[11px] text-foreground/65">
                      📍 {e.event_location}
                    </p>
                  ) : null}
                  <p className="mt-1.5 whitespace-pre-line text-[12px] leading-relaxed text-foreground/75">
                    {e.body}
                  </p>
                  {e.source_urls.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {e.source_urls.map((s, j) => (
                        <a
                          key={j}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 rounded-full bg-card px-2 py-0.5 text-[10px] font-medium text-primary-300 ring-1 ring-border hover:bg-primary-500/10"
                        >
                          {s.name}
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {/* token usage */}
          {result.usage ? (
            <pre className="overflow-x-auto rounded-md bg-muted px-3 py-2 text-[10px] tabular text-foreground/65">
              usage: {JSON.stringify(result.usage)}
            </pre>
          ) : null}

          {/* 生レスポンス */}
          <div>
            <button
              type="button"
              onClick={() => setShowRaw((s) => !s)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground/55 hover:text-foreground"
            >
              {showRaw ? (
                <>
                  <ChevronUp className="h-3 w-3" /> 生レスポンスを閉じる
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" /> 生レスポンスを表示
                </>
              )}
            </button>
            {showRaw ? (
              <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-neutral-950 px-3 py-2 text-[10px] leading-relaxed text-neutral-100">
                {result.rawText}
              </pre>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-background/40 px-3 py-2 ring-1 ring-border">
      <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">
        {label}
      </p>
      <p className="mt-0.5 text-[13px] font-semibold tabular">{value}</p>
    </div>
  );
}
