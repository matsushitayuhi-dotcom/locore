import { AlertTriangle } from '@locore/ui/icons';
import type { CrisisEvent } from '../lib/mock';

export function CrisisBanner({ event }: { event: CrisisEvent }) {
  const tone =
    event.severity >= 4
      ? 'bg-danger-500/10 border-danger-500/40 text-danger-500'
      : event.severity >= 3
        ? 'bg-warning-50 border-warning-500/40 text-warning-700'
        : 'bg-info-50 border-info-500/30 text-info-500';

  return (
    <div
      className={`flex items-start gap-3 rounded-md border px-4 py-3 ${tone}`}
      role="status"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          {/* 10px はスマホで読めないので 11px。PC は sm: で据え置き（規約7） */}
          <span className="shrink-0 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.18em] sm:text-[10px]">
            severity {event.severity}
          </span>
          <p className="text-[14px] font-semibold leading-snug">{event.title}</p>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-foreground/70">
          {event.summary}
        </p>
        {event.affectedRoutes && event.affectedRoutes.length > 0 ? (
          <p className="mt-2 text-[11px] tracking-wide text-foreground/50">
            影響路線：{event.affectedRoutes.join(' / ')}
          </p>
        ) : null}
      </div>
    </div>
  );
}
