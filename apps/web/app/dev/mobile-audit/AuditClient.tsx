'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { auditRoute, type RouteResult } from './audit';
import { ROUTES } from './routes';

/** よく使う端末幅（CSS ピクセル）。iPhone は物理ピクセルではなくこの値でレイアウトされる */
const WIDTHS = [
  { w: 320, label: '320 — 画面表示「拡大」' },
  { w: 375, label: '375 — SE / mini' },
  { w: 390, label: '390 — 14 / 15' },
  { w: 402, label: '402 — 17（実測）' },
  { w: 430, label: '430 — Plus / Pro Max' },
];

export function AuditClient() {
  const [width, setWidth] = useState(390);
  const [list, setList] = useState(ROUTES.join('\n'));
  const [results, setResults] = useState<RouteResult[]>([]);
  const [running, setRunning] = useState(false);
  const [now, setNow] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const cancel = useRef(false);

  const paths = useMemo(
    () => list.split('\n').map((s) => s.trim()).filter((s) => s.startsWith('/')),
    [list],
  );

  const run = useCallback(async () => {
    cancel.current = false;
    setRunning(true);
    setResults([]);
    for (const p of paths) {
      if (cancel.current) break;
      setNow(p);
      const r = await auditRoute(p, width);
      setResults((prev) => [...prev, r]);
    }
    setNow(null);
    setRunning(false);
  }, [paths, width]);

  const ng = results.filter((r) => r.status === 'ng');
  const ok = results.filter((r) => r.status === 'ok');
  const skipped = results.filter((r) => r.status === 'redirected' || r.status === 'error');

  return (
    <main className="mx-auto max-w-[1200px] px-5 py-8">
      <h1 className="text-[24px] font-bold">スマホ幅レイアウト検査</h1>
      <p className="mt-2 max-w-[70ch] text-[13.5px] leading-[1.9] text-neutral-600">
        各ページを指定した幅の iframe で開いて、
        <b>横スクロール</b>・<b>画面からのはみ出し</b>・
        <b>日本語が 1 文字ずつ縦積みになっている箇所</b>を数えます。
        ログインが要るページも、いまのセッションのまま検査できます。
        開発サーバーだと各ページの初回コンパイルで数秒かかるので、
        <b>プレビューや本番のデプロイ先で開くほうが速く、実データも入ります</b>。
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-4 border-y border-border py-4">
        <label className="text-[12.5px]">
          <span className="mb-1 block font-bold text-neutral-500">幅</span>
          <select
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="h-9 rounded-md border border-border bg-background px-2 text-[13px]"
          >
            {WIDTHS.map((d) => (
              <option key={d.w} value={d.w}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={running ? () => { cancel.current = true; } : () => void run()}
          className="h-9 shrink-0 whitespace-nowrap rounded-full bg-neutral-900 px-5 text-[13px] font-bold text-white hover:bg-neutral-700"
        >
          {running ? '中止' : `${paths.length} ページを検査`}
        </button>
        {running ? <span className="text-[12px] text-neutral-500">検査中… {now}</span> : null}
        {results.length > 0 && !running ? (
          <span className="text-[12.5px]">
            <b className="text-danger-500">崩れ {ng.length}</b> ／ 問題なし {ok.length} ／ 見られず {skipped.length}
          </span>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          {ng.map((r) => (
            <section key={r.path} className="mb-5 rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <button
                  type="button"
                  onClick={() => setOpen(open === r.path ? null : r.path)}
                  className="text-[14px] font-bold underline decoration-dotted underline-offset-4"
                >
                  {r.path}
                </button>
                {r.overflow > 0 ? (
                  <span className="shrink-0 whitespace-nowrap rounded-full bg-danger-500 px-2.5 py-0.5 text-[11px] font-bold text-white">
                    横スクロール +{r.overflow}px
                  </span>
                ) : null}
                <span className="text-[12px] text-neutral-500">{r.findings.length} 件</span>
              </div>
              <ul className="mt-3 space-y-2">
                {r.findings.slice(0, 12).map((f, i) => (
                  <li key={i} className="min-w-0 border-t border-border pt-2 text-[12.5px] leading-[1.7]">
                    <span
                      className={
                        'mr-2 inline-block shrink-0 whitespace-nowrap rounded px-1.5 py-px text-[10.5px] font-bold ' +
                        (f.kind === '縦積み'
                          ? 'bg-danger-500 text-white'
                          : f.kind === 'はみ出し'
                            ? 'bg-neutral-900 text-white'
                            : 'bg-muted text-neutral-600')
                      }
                    >
                      {f.kind}
                    </span>
                    <b>{f.text || `<${f.tag}>`}</b>
                    <span className="ml-2 text-neutral-500">{f.detail}</span>
                    <code className="mt-0.5 block truncate font-mono text-[11px] text-neutral-400">{f.className}</code>
                  </li>
                ))}
                {r.findings.length > 12 ? (
                  <li className="pt-2 text-[12px] text-neutral-400">ほか {r.findings.length - 12} 件</li>
                ) : null}
              </ul>
            </section>
          ))}
          {results.length > 0 && ng.length === 0 && !running ? (
            <p className="text-[14px] font-bold">崩れは見つかりませんでした。</p>
          ) : null}
          {skipped.length > 0 && !running ? (
            <details className="mt-4 text-[12.5px] text-neutral-500">
              <summary className="cursor-pointer">見られなかったページ {skipped.length} 件</summary>
              <ul className="mt-2 space-y-1">
                {skipped.map((r) => (
                  <li key={r.path}>
                    {r.path} — {r.status === 'redirected' ? `${r.redirectedTo} に飛ばされた` : r.message}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          <details className="mt-8">
            <summary className="cursor-pointer text-[12.5px] font-bold text-neutral-500">検査するページ一覧を編集</summary>
            <textarea
              value={list}
              onChange={(e) => setList(e.target.value)}
              rows={12}
              className="mt-2 w-full rounded-md border border-border bg-background p-3 font-mono text-[12px]"
            />
          </details>
        </div>

        {/* 選んだページをその幅のまま隣に出す */}
        {open ? (
          <div className="shrink-0 max-lg:hidden">
            <div className="sticky top-4">
              <div className="mb-1 text-[12px] text-neutral-500">
                {open} — {width}px
              </div>
              <iframe
                key={open + width}
                src={open}
                title={open}
                style={{ width, height: 720 }}
                className="rounded-xl border border-border bg-white"
              />
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
