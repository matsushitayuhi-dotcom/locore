import Link from 'next/link';
import { List, LayoutGrid } from 'lucide-react';

/**
 * コミュニティ一覧ページの「リスト / カード」表示切替トグル。
 *
 * - URL クエリ `?view=list` / `?view=card` で永続化
 * - active 側はアクセント表示
 * - 親ページが提供する `buildHref` を介して、既存のフィルタクエリは保持
 */
export type CommunityView = 'list' | 'card';

export function ViewToggle({
  currentView,
  buildHref,
}: {
  currentView: CommunityView;
  /** 引数の view を持つ URL を返す */
  buildHref: (view: CommunityView) => string;
}) {
  return (
    <div
      role="tablist"
      aria-label="表示形式を切替"
      className="inline-flex items-center gap-0.5 rounded-full bg-muted p-0.5 ring-1 ring-border"
    >
      <ToggleButton
        href={buildHref('list')}
        active={currentView === 'list'}
        label="リスト"
        icon={<List className="h-3.5 w-3.5" />}
      />
      <ToggleButton
        href={buildHref('card')}
        active={currentView === 'card'}
        label="カード"
        icon={<LayoutGrid className="h-3.5 w-3.5" />}
      />
    </div>
  );
}

function ToggleButton({
  href,
  active,
  label,
  icon,
}: {
  href: string;
  active: boolean;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      title={label}
      className={
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ' +
        (active
          ? 'bg-primary-500 text-neutral-950 shadow-sm'
          : 'text-foreground/60 hover:text-foreground')
      }
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
