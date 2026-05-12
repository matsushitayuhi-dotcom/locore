'use client';

import Link from 'next/link';

const TABS = [
  { value: 'articles', label: '記事' },
  { value: 'itineraries', label: '旅程' },
  { value: 'spots', label: 'スポット' },
] as const;

type Tab = (typeof TABS)[number]['value'];

type Props = {
  active: Tab;
  counts: Record<Tab, number>;
};

export function LibraryTabs({ active, counts }: Props) {
  return (
    <nav className="flex gap-1 border-b border-border">
      {TABS.map((t) => {
        const isOn = active === t.value;
        return (
          <Link
            key={t.value}
            href={`/library?tab=${t.value}`}
            className={
              'rounded-t-md px-4 py-2 text-[13px] font-semibold transition ' +
              (isOn
                ? 'border-b-2 border-primary-700 -mb-px text-primary-300'
                : 'text-foreground/60 hover:text-primary-300')
            }
          >
            {t.label}
            <span className="ml-1.5 text-[11px] text-foreground/50">
              {counts[t.value]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
