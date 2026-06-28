import { Suspense } from 'react';
import { listServices } from '@/lib/services/list';
import { ServicesShelves } from './ServicesShelves';

/**
 * /services — サービス一覧（Airbnb 風の棚デザイン）。
 *
 * 【2026-06 キャッシュ改修 / /jobs と同方針】
 * このページは searchParams を一切読まない。サーバーは全アクティブサービス
 * (最大 200) を取得して静的レンダリング (revalidate=300) し、棚分け
 * (新着 / 人気 / カテゴリ別)・カテゴリ別リスト・国フィルタ (?country=) は
 * ServicesShelves (client) が担う。これにより /services が静的化され、
 * クエリ付き URL も CDN が同一キャッシュを返す。
 *
 * 以前は searchParams をサーバーで読んでいたため Next.js が強制的に動的 (no-store)
 * 化し、エッジキャッシュ 0% / Origin 直撃で課金が嵩んでいた。
 *
 * 【2026-06 デザイン刷新】
 * 旧 ServicesBrowser (フィルタ + グリッド) を承認済みモック準拠の
 * ServicesShelves (横スクロール棚 + 画像カルーセルカード + リスト) に置換。
 */
export const revalidate = 300;

export const metadata = {
  title: 'サービスを探す — Locore',
  description:
    '現地駐在員が提供する観光アテンド・通訳・相談・留学サポートなどのサービスを探せます。',
};

export default async function ServicesPage() {
  const { services } = await listServices({ limit: 200 });

  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-xl px-4 py-4 sm:px-6 sm:py-8">
        {/* useSearchParams を使うため Suspense で包む（静的プリレンダ境界） */}
        <Suspense fallback={<div className="min-h-[50vh]" />}>
          <ServicesShelves services={services} />
        </Suspense>
      </div>
    </main>
  );
}
