import { notFound } from 'next/navigation';
import { getServiceById } from '@/lib/services/byId';
import { getCurrentUser } from '@/lib/auth/current-user';
import { ServiceDetail } from '@/components/services/ServiceDetail';

/**
 * /services/[id] — サービス（体験）詳細ページ。Airbnb 風レイアウト。
 *
 * 表示はクライアントコンポーネント ServiceDetail に委譲（.sd- scoped CSS）。
 * page.tsx は実データの取得と受け渡しのみを担う。
 *
 * セクション (ServiceDetail 側):
 *   - 写真ギャラリー ([cover, ...gallery_images])
 *   - タイトル / 都市 / カテゴリタグ / 共有・保存
 *   - 左: ホスト行 / クイックファクト / この体験について / 特徴 / 含まれるもの /
 *         ホスト紹介 / 集合場所マップ
 *   - 右(sticky): 価格 + 問い合わせ CTA + 注記
 *   - 駐在員の記事 / 他サービス (横スクロール)
 *
 * 偽データ (★評価・レビュー件数・偽予約) は出さない。
 * ISR (revalidate=60)。
 */

export const revalidate = 60;

type Params = { params: { id: string } };

export async function generateMetadata({ params }: Params) {
  const bundle = await getServiceById(params.id);
  if (!bundle) return { title: 'サービス — Locore' };
  return {
    title: `${bundle.service.title} — ${bundle.provider.displayName} | Locore`,
    description: bundle.service.description ?? undefined,
  };
}

export default async function ServiceDetailPage({ params }: Params) {
  const bundle = await getServiceById(params.id);
  if (!bundle) notFound();
  const { service, provider } = bundle;

  const me = await getCurrentUser();

  return (
    <main className="bg-background">
      <ServiceDetail
        service={service}
        provider={provider}
        viewerUserId={me?.id ?? null}
      />
    </main>
  );
}
