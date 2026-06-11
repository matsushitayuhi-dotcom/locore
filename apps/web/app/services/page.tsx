import { Suspense } from 'react';
import { listServices, listAllTagsForServices } from '@/lib/services/list';
import { getActiveCitiesForPicker } from '@/lib/geo/countries';
import { ServicesBrowser } from './ServicesBrowser';

/**
 * /services — サービス一覧（ブラウズ）。
 *
 * 【2026-06 キャッシュ改修 / /jobs と同方針】
 * このページは searchParams を一切読まない。サーバーは全アクティブサービス
 * (最大 200) + 都市 + タグ一覧を取得して静的レンダリング (revalidate=300) し、
 * フィルタは ServicesBrowser (client) が担う。これにより /services が静的化され、
 * /services?tags=... 等のクエリ付き URL も CDN が同一キャッシュを返す
 * (= クローラがタグリンクを総当たりしても Origin に到達しない)。
 *
 * 以前は searchParams をサーバーで読んでいたため Next.js が強制的に動的 (no-store)
 * 化し、エッジキャッシュ 0% / Origin 直撃で課金が嵩んでいた。
 */
export const revalidate = 300;

export const metadata = {
  title: 'サービスを探す — Locore',
  description:
    '現地駐在員が提供する観光アテンド・通訳・相談・留学サポートなどのサービスを探せます。',
};

export default async function ServicesPage() {
  const [{ services }, cities, allTags] = await Promise.all([
    listServices({ limit: 200 }),
    getActiveCitiesForPicker(),
    listAllTagsForServices(),
  ]);

  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-xl px-4 py-4 sm:px-6 sm:py-8">
        {/* useSearchParams を使うため Suspense で包む（静的プリレンダ境界） */}
        <Suspense fallback={<div className="min-h-[50vh]" />}>
          <ServicesBrowser
            services={services}
            cities={cities}
            allTags={allTags}
          />
        </Suspense>
      </div>
    </main>
  );
}
