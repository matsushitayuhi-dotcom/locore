import Link from 'next/link';
import { ArrowRight, Check, Circle } from 'lucide-react';
import type { SectionProgress as SectionProgressData } from '@/lib/experts/completeness';

/**
 * /settings/services・/settings/availability に出すセクション別のミニ進捗
 * （overall は /settings ハブのみ）。presentational（server 描画可）。
 */
export function SectionProgress({
  title,
  section,
}: {
  title: string;
  section: SectionProgressData;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md bg-card px-4 py-3 ring-1 ring-border">
      <span className="text-[12px] font-bold text-foreground/80">{title}</span>
      <span className="text-[12px] tabular-nums text-foreground/60">
        {section.done}/{section.total} 完了
      </span>
      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary-500"
          style={{ width: `${section.percent}%` }}
        />
      </div>
      <span className="flex flex-wrap items-center gap-2 text-[11px] text-foreground/60">
        {section.items.map((i) => (
          <span key={i.key} className="inline-flex items-center gap-1">
            {i.done ? (
              <Check className="h-3 w-3 text-primary-700" strokeWidth={3} aria-hidden />
            ) : (
              <Circle className="h-3 w-3 text-border-strong" aria-hidden />
            )}
            {i.label}
            {i.recommended ? (
              <span className="text-[9px] text-foreground/40">(推奨)</span>
            ) : null}
          </span>
        ))}
      </span>
      <Link
        href="/settings"
        className="ml-auto inline-flex items-center gap-1 text-[11.5px] font-bold text-primary-700 hover:underline hover:underline-offset-4"
      >
        公開ステータス
        <ArrowRight className="h-3 w-3" aria-hidden />
      </Link>
    </div>
  );
}
