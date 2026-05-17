import { Construction } from 'lucide-react';
import { AdminPageHeader } from './AdminPageHeader';

/**
 * 「準備中」ページ。実装予定のセクションのナビ動線を確保するために
 * stub として置く。
 */

export function StubPage({
  title,
  description,
  plannedFeatures,
}: {
  title: string;
  description?: string;
  plannedFeatures: string[];
}) {
  return (
    <div>
      <AdminPageHeader
        title={title}
        description={description}
        kicker={
          <p className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
            <Construction className="h-3 w-3" />
            準備中
          </p>
        }
      />
      <section className="rounded-xl border-2 border-dashed border-border bg-card p-6 sm:p-8">
        <h2 className="text-[14px] font-bold">実装予定の機能</h2>
        <ul className="mt-3 space-y-1.5">
          {plannedFeatures.map((f, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-[12px] text-foreground/70"
            >
              <span className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-[11px] text-foreground/45">
          このページは「いつ作る」より「他の優先タスクが落ち着いてから」のリストです。
          急ぎ必要になったらご相談ください。
        </p>
      </section>
    </div>
  );
}
