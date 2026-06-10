import { Suspense } from 'react';
import { CommunityNav } from '@/components/community/CommunityNav';
import { CommunityDisclaimer } from '@/components/community/CommunityDisclaimer';
import { listCommunityPosts } from '@/lib/community/db';
import { getRegionsWithContent } from '@/lib/geo/region-content';
import { JobsBrowser, type JobRegion } from './JobsBrowser';

/**
 * /jobs — 求人一覧。
 *
 * 【2026-06 キャッシュ改修】
 * このページは searchParams を一切読まない。サーバーは「最新の求人を最大 100 件」
 * 取得して静的レンダリング (revalidate=300) するだけで、フィルタは JobsBrowser
 * (client) が担当する。これにより:
 *   - /jobs が誰に対しても同一の静的 HTML となり Vercel Edge Cache に乗る
 *   - /jobs?type=... 等のクエリ付き URL も CDN が同一キャッシュを返す
 *     (= クローラの URL 総当たりが Origin に到達せず Data Transfer 課金が激減)
 *
 * 以前は searchParams をサーバーで読んでいたため Next.js が強制的に動的 (no-store)
 * 化し、エッジキャッシュ 0% / Origin 直撃で課金が暴騰していた。
 */
export const revalidate = 300;

export const metadata = {
  title: '求人 — Locore',
  description:
    '在パリ駐在員コミュニティの求人掲示板。日系企業のオフィスワーク、飲食、翻訳、教育、IT などの募集を集めています。',
};

const CANDIDATE_REGIONS: JobRegion[] = [
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

export default async function JobsIndexPage() {
  const [posts, slugsWithContent] = await Promise.all([
    listCommunityPosts({ kind: 'job', limit: 100 }),
    getRegionsWithContent(),
  ]);

  const regions = CANDIDATE_REGIONS.filter((r) => slugsWithContent.has(r.slug));

  return (
    <main className="mx-auto max-w-screen-lg px-4 pb-12 pt-4 sm:px-6">
      <CommunityNav active="job" />

      <div className="mt-3">
        {/* useSearchParams を使うため Suspense で包む。fallback は件数バーの
            高さ分の簡易プレースホルダ。静的プリレンダリングはこの境界で確定する。 */}
        <Suspense fallback={<div className="min-h-[40vh]" />}>
          <JobsBrowser posts={posts} regions={regions} />
        </Suspense>
      </div>

      <details className="mt-8 rounded-lg border border-border bg-card text-[12px] text-foreground/65">
        <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-semibold text-foreground/55">
          ⚠️ ご利用上の注意
        </summary>
        <div className="border-t border-border p-3">
          <CommunityDisclaimer kind="job" />
        </div>
      </details>
    </main>
  );
}
