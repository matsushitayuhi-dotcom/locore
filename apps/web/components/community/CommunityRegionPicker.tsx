import Link from 'next/link';
import { MapPin } from 'lucide-react';

/**
 * コミュニティ系ページ（/jobs, /apartments など）の都市フィルタチップ列。
 *
 * - URL クエリ ?region=<slug> を採用（CommunityRegionFilter と一致）
 * - 既存の active なフィルタクエリは preserveQuery で hydrate して保持
 * - 「全都市」「パリ＆近郊」「ボルドー」など。
 *
 * NOTE: 現状はフランス主要都市を固定リストで持つ（DB 全件取得を避けるため）。
 * 新しい都市を追加した際はここを更新する。
 * 中長期的には cities テーブルから動的に取得する関数 (e.g. getActiveRegions)
 * を `lib/geo/countries.ts` に追加して差し替える想定。
 */
const REGIONS: Array<{ slug: string; label: string }> = [
  { slug: 'paris', label: 'パリ＆近郊' },
  { slug: 'bordeaux', label: 'ボルドー' },
  { slug: 'nice-cote-azur', label: 'ニース' },
  { slug: 'lyon', label: 'リヨン' },
  { slug: 'marseille', label: 'マルセイユ' },
];

export type CommunityRegionPickerProps = {
  /** 例: '/jobs', '/apartments' */
  basePath: string;
  /** 現在 active な region slug。なければ undefined（=「全都市」） */
  activeSlug: string | undefined;
  /**
   * region 以外の既存クエリを保持する。
   * value が空文字 / undefined / null のキーは無視。
   */
  preserveQuery?: Record<string, string | undefined | null>;
};

function buildHref(
  basePath: string,
  slug: string | undefined,
  preserve: Record<string, string | undefined | null> | undefined,
): string {
  const params = new URLSearchParams();
  if (preserve) {
    for (const [k, v] of Object.entries(preserve)) {
      if (v === undefined || v === null || v === '') continue;
      if (k === 'region') continue; // region は明示引数で上書き
      params.set(k, v);
    }
  }
  if (slug) params.set('region', slug);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function CommunityRegionPicker({
  basePath,
  activeSlug,
  preserveQuery,
}: CommunityRegionPickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/55">
        <MapPin className="h-3 w-3" />
        都市
      </span>
      <RegionChip
        href={buildHref(basePath, undefined, preserveQuery)}
        label="全都市"
        active={!activeSlug}
      />
      {REGIONS.map((r) => (
        <RegionChip
          key={r.slug}
          href={buildHref(basePath, r.slug, preserveQuery)}
          label={r.label}
          active={activeSlug === r.slug}
        />
      ))}
    </div>
  );
}

function RegionChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={
        'rounded-full px-3 py-1 text-[11px] font-semibold transition ' +
        (active
          ? 'bg-primary-500 text-neutral-950'
          : 'bg-muted text-foreground/65 hover:bg-foreground/10')
      }
    >
      {label}
    </Link>
  );
}
