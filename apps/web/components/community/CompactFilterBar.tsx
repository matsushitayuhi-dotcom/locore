import Link from 'next/link';
import { MapPin, ChevronDown, List, LayoutGrid, Check } from 'lucide-react';
import { getRegionsWithContent } from '@/lib/geo/region-content';
import type { CommunityAudience } from '@/lib/community/constants';
import type { CommunityView } from './ViewToggle';

/**
 * コミュニティ 6 ページ共通の「コンパクトフィルタバー」。
 *
 * SUUMO スマホアプリ風の 1 行 sticky バー。
 *  - 都市ドロップダウン: 📍 パリ ▾
 *  - 対象者ドロップダウン: 🧑 駐在員 ▾
 *  - 「絞り込み (N)」ボタン (FilterSheet を開く)
 *  - リスト / カード ビュートグル
 *
 * 横スクロール対応で sm 未満では 1 行収まらない場合は右にスクロール可。
 *
 * 詳細フィルタ (kind 別) は親が <FilterSheet> 内に <children> として置く。
 * 「絞り込み」ボタンはこの中ではなく `<FilterSheet>` 側で持つので、
 * このバーには「絞り込み」のスロット (children) を取って合成する。
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

export type CompactFilterBarProps = {
  basePath: string;
  /** 現在の region slug */
  activeRegionSlug: string | undefined;
  /** 現在 active な region の日本語表示名 (なければ「全都市」) */
  activeRegionNameJa: string | undefined;
  /** region 以外のクエリを buildHref に頼まず保持するためのオブジェクト */
  preserveQuery: Record<string, string | undefined | null>;
  /**
   * audience フィルタ。2026-06 に旅行者/駐在員の概念を撤去し UI からは外したが、
   * 呼び出し側との後方互換のため optional プロップとして型だけ残す（未使用）。
   */
  activeAudience?: CommunityAudience | undefined;
  buildAudienceHref?: (a: CommunityAudience | undefined) => string;
  /** 現在のビュー */
  currentView: CommunityView;
  /** view 変更時の href を返す関数 */
  buildViewHref: (v: CommunityView) => string;
  /** 「絞り込み (N)」シートトリガー (FilterSheet) */
  sheetTrigger: React.ReactNode;
};

function buildRegionHref(
  basePath: string,
  slug: string | undefined,
  preserve: Record<string, string | undefined | null>,
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(preserve)) {
    if (v === undefined || v === null || v === '') continue;
    if (k === 'region') continue;
    params.set(k, v);
  }
  if (slug) params.set('region', slug);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export async function CompactFilterBar({
  basePath,
  activeRegionSlug,
  activeRegionNameJa,
  preserveQuery,
  currentView,
  buildViewHref,
  sheetTrigger,
}: CompactFilterBarProps) {
  const slugsWithContent = await getRegionsWithContent();
  const visibleRegions = CANDIDATE_REGIONS.filter(
    (r) => slugsWithContent.has(r.slug) || r.slug === activeRegionSlug,
  );

  const regionLabel = activeRegionNameJa ?? '都市';

  return (
    <div
      // SiteHeader (h-14=56px) + CommunityNav (py-1.5 + ピル ~28px = ~40px) の下に積む。
      // 計算: 56 + 40 = 96px。旧 top-[88px] だと CommunityNav と 8px 重なって
      // 「フィルタの上行が見切れる」問題が出ていた (2026-05 修正)。
      // 余裕を 4px 取って top-[100px] にする。
      className="sticky top-[100px] z-10 -mx-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur sm:mx-0"
      data-community-filterbar
    >
      {/* flex-wrap のまま。ここは <details> の絶対配置ドロップダウンを持つので、
          overflow-x-auto にするとメニューが切れる。320px では 2 行に折り返す。
          チップの縦は max-sm:min-h-[36px] でタップ領域 36px を確保。 */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* 都市 ドロップダウン */}
        <details className="group relative shrink-0">
          <summary
            className={
              'inline-flex cursor-pointer list-none items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-semibold transition max-sm:min-h-[36px] ' +
              (activeRegionSlug
                ? 'bg-primary-500 text-neutral-950'
                : 'bg-muted text-foreground/75 hover:bg-foreground/10')
            }
          >
            {/* アイコンと ▾ は縮まない側、都市名だけが縮む側 */}
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 max-w-[7rem] truncate">{regionLabel}</span>
            <ChevronDown className="h-3 w-3 shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          {/* w-56 = 224px。320px 幅でも画面外に出ないよう max-w も併記 */}
          <div className="absolute left-0 top-full z-30 mt-1 max-h-[60vh] w-56 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl">
            <DropdownItem
              href={buildRegionHref(basePath, undefined, preserveQuery)}
              active={!activeRegionSlug}
              label="すべて"
            />
            {visibleRegions.map((r) => (
              <DropdownItem
                key={r.slug}
                href={buildRegionHref(basePath, r.slug, preserveQuery)}
                active={activeRegionSlug === r.slug}
                label={r.label}
              />
            ))}
          </div>
        </details>

        {/* 絞り込み (シート) */}
        {sheetTrigger}

        {/* ビュートグル - 右寄せ */}
        <div className="ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-full bg-muted p-0.5 ring-1 ring-border">
          <ViewToggleButton
            href={buildViewHref('card')}
            active={currentView === 'card'}
            label="カード"
            icon={<LayoutGrid className="h-3.5 w-3.5" />}
          />
          <ViewToggleButton
            href={buildViewHref('list')}
            active={currentView === 'list'}
            label="リスト"
            icon={<List className="h-3.5 w-3.5" />}
          />
        </div>
      </div>
    </div>
  );
}

function DropdownItem({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={
        'flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[12px] transition max-sm:min-h-[40px] ' +
        (active
          ? 'bg-primary-500/15 font-semibold text-primary-300'
          : 'text-foreground/80 hover:bg-muted')
      }
    >
      {/* 都市名が縮む側、チェックは縮まない側 */}
      <span className="min-w-0 truncate">{label}</span>
      {active ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
    </Link>
  );
}

function ViewToggleButton({
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
      aria-label={label}
      title={label}
      className={
        // p-1.5 + 14px アイコン = 26px でタップ領域が足りないので、スマホだけ 36px 角に
        'inline-flex items-center justify-center rounded-full p-1.5 transition max-sm:h-9 max-sm:w-9 ' +
        (active
          ? 'bg-primary-500 text-neutral-950 shadow-sm'
          : 'text-foreground/60 hover:text-foreground')
      }
    >
      {icon}
    </Link>
  );
}
