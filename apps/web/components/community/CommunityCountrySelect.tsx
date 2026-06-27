'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Globe } from 'lucide-react';

/**
 * コミュニティ一覧（求人/住居/…）の国フィルタ。
 *
 * - `?country=fr` を URL に反映し、サーバ側で listCommunityPosts({countryCode}) が絞る。
 * - 国を変えても他のクエリ（region/sort 等）は保持する（現在のクエリを引き継ぐ）。
 * - 国マスタ（server-only）はサーバ側から countries prop で渡す。
 */

type Country = { code: string; nameJa: string; emoji: string };

export function CommunityCountrySelect({
  current,
  countries,
}: {
  current?: string;
  countries: Country[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  const onChange = (v: string) => {
    const p = new URLSearchParams(sp?.toString() ?? '');
    if (v === 'all') p.delete('country');
    else p.set('country', v);
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <label className="relative inline-flex items-center">
      <Globe className="pointer-events-none absolute left-3 h-4 w-4 text-foreground/45" />
      <select
        value={current ?? 'all'}
        onChange={(e) => onChange(e.target.value)}
        aria-label="国で絞り込む"
        className="h-9 cursor-pointer appearance-none rounded-full border border-border bg-card pl-9 pr-8 text-[13px] font-medium text-foreground transition hover:border-primary-300 focus:border-primary-500 focus:outline-none"
      >
        <option value="all">すべての国</option>
        {countries.map((c) => (
          <option key={c.code} value={c.code}>
            {c.emoji} {c.nameJa}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-foreground/45"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </label>
  );
}
