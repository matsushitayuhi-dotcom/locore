import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { getRegionsWithContent } from '@/lib/geo/region-content';

/**
 * コミュニティ系ページ（/jobs, /apartments など）の都市フィルタチップ列。
 *
 * - URL クエリ ?region=<slug> を採用（CommunityRegionFilter と一致）
 * - 既存の active なフィルタクエリは preserveQuery で hydrate して保持
 * - 「全都市」「パリ＆近郊」「ボルドー」など
 * - **コンテンツのある都市のみ表示**: 記事 or コミュニティ投稿が紐付いて
 *   いる cities だけチップ化する。空っぽの都市はチップから消える
 *   (Server Component で `getRegionsWithContent` を呼ぶ)
 * - 既に絞り込み中の都市は、たとえコンテンツが消えても active chip として
 *   見え続ける (ユーザーが解除できるように)
 *
 * NOTE: 候補となる都市リストは下記の固定リストから生成し、その中で
 * コンテンツのあるものだけ表示する。新しい都市を追加した際はここに
 * 追記する。中長期的には cities テーブルから動的取得する関数を
 * `lib/geo/countries.ts` に追加して差し替える想定。
 */
const CANDIDATE_REGIONS: Array<{ slug: string; label: string }> = [
  { slug: 'paris', label: 'パリ＆近郊' },
  { slug: 'lyon', label: 'リヨン' },
  { slug: 'marseille', label: 'マルセイユ' },
  { slug: 'bordeaux', label: 'ボルドー' },
  { slug: 'toulouse', label: 'トゥールーズ' },
  { slug: 'strasbourg', label: 'ストラスブール' },
  { slug: 'lille', label: 'リール' },
  { slug: 'montpellier', label: 'モンペリエ' },
  { slug: 'nantes', label: 'ナント' },
  { slug: 'rennes', label: 'レンヌ' },
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

export async function CommunityRegionPicker({
  basePath,
  activeSlug,
  preserveQuery,
}: CommunityRegionPickerProps) {
  const slugsWithContent = await getRegionsWithContent();

  // コンテンツのある候補だけ表示。ただし「現在 active な slug」は、たとえ
  // コンテンツが空でも表示する (ユーザーが選択を解除できる導線として)
  const visible = CANDIDATE_REGIONS.filter(
    (r) => slugsWithContent.has(r.slug) || r.slug === activeSlug,
  );

  // 全 5 候補が空 (= サイトに 1 件も投稿が無い) のときは、何も出さない
  // よりは「全都市」だけ残す。エッジケース。
  if (visible.length === 0 && !activeSlug) {
    return null;
  }

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
      {visible.map((r) => (
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
