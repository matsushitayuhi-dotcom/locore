/**
 * コミュニティ一覧ページ用の「対象者」フィルタチップ。
 *
 * `すべて / 旅行者向け / 駐在員向け` の 3 チップ。
 * 親ページが提供する buildHref を使って URL を組み立てる。
 */

import Link from 'next/link';
import { Plane, Briefcase } from 'lucide-react';
import {
  AUDIENCE_LABEL,
  type CommunityAudience,
} from '@/lib/community/constants';

export function AudienceChips({
  active,
  buildHref,
}: {
  active: CommunityAudience | undefined;
  /** 引数なし → すべて、引数あり → 該当 audience を選択した URL を返す */
  buildHref: (a: CommunityAudience | undefined) => string;
}) {
  const items: Array<{
    value: CommunityAudience | undefined;
    label: string;
    icon?: React.ReactNode;
  }> = [
    { value: undefined, label: 'すべて' },
    {
      value: 'traveler',
      label: AUDIENCE_LABEL.traveler,
      icon: <Plane className="h-3 w-3" />,
    },
    {
      value: 'resident',
      label: AUDIENCE_LABEL.resident,
      icon: <Briefcase className="h-3 w-3" />,
    },
  ];

  return (
    <div
      role="tablist"
      aria-label="対象者で絞り込み"
      className="flex flex-wrap items-center gap-1.5"
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
        対象者
      </span>
      {items.map((it) => {
        const on = it.value === active;
        return (
          <Link
            key={it.value ?? 'all'}
            href={buildHref(it.value)}
            role="tab"
            aria-selected={on}
            className={
              'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold transition ' +
              (on
                ? 'bg-primary-500 text-neutral-950'
                : 'bg-primary-500/10 text-primary-300 hover:bg-primary-500/15')
            }
          >
            {it.icon}
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}
