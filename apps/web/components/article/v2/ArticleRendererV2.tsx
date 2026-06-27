'use client';

import type {
  ArticleBundleRegion,
  ArticleBundleCountry,
} from '@/lib/articles/published';
import { classifyArticle } from './classify';
import { ItineraryArticleV2 } from './ItineraryArticleV2';
import { PlaceGuideArticleV2 } from './PlaceGuideArticleV2';
import { EssayArticleV2 } from './EssayArticleV2';
import {
  EssayVideos,
  HeroActions,
  PreviewBanner,
  type EngagementProps,
} from './engagement';

/**
 * v2 レンダラ。
 *
 * 旧 `components/article/ArticleRenderer.tsx` と同じフルバンドル props を受け取り、
 * v2 のブランドレイアウト（モデルコース / 場所あり / 場所なし）に振り分ける。各レイアウトは
 * Phase A の新デザイン本文を実データで描きつつ、課金（Paywall）・いいね/保存・スポット保存・
 * レビュー・著者・関連・地図を新スタイルの中に織り込む（機能は一切落とさない）。
 *
 * 振り分け（入口2択 / classify.ts）:
 *   - itinerary            → ItineraryArticleV2
 *   - standard & spots>0    → PlaceGuideArticleV2
 *   - standard & spots===0  → EssayArticleV2
 *
 * region/country は本番ローダの型（ArticleBundleRegion/Country）を受ける。
 */
export type ArticleRendererV2Props = EngagementProps & {
  region: ArticleBundleRegion | null;
  country: ArticleBundleCountry | null;
};

export function ArticleRendererV2(props: ArticleRendererV2Props) {
  const { article, spots, videos, previewMode, region, country } = props;

  const kind = classifyArticle(article, spots);

  // 各レイアウトに渡す共通 props（EngagementProps の全バンドル）
  const eng: EngagementProps = props;

  if (kind === 'itinerary') {
    return (
      <>
        <PreviewBanner article={article} previewMode={previewMode} />
        <ItineraryArticleV2
          {...eng}
          region={region}
          country={country}
          heroActions={<HeroActions {...eng} variant="tj" />}
        />
      </>
    );
  }

  if (kind === 'place-guide') {
    return (
      <>
        <PreviewBanner article={article} previewMode={previewMode} />
        <PlaceGuideArticleV2
          {...eng}
          region={region}
          country={country}
          heroActions={<HeroActions {...eng} variant="pg" />}
        />
      </>
    );
  }

  // essay
  return (
    <>
      <PreviewBanner article={article} previewMode={previewMode} />
      <EssayArticleV2
        {...eng}
        heroActions={<HeroActions {...eng} variant="es" />}
        videosSlot={<EssayVideos videos={videos} />}
      />
    </>
  );
}
