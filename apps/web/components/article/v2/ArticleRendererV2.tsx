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
  AuthorCard,
  EssayVideos,
  HeroActions,
  PaidBodyAndExtras,
  PreviewBanner,
  RelatedArticles,
  ReviewsList,
  type EngagementProps,
} from './engagement';

/**
 * Phase B 完全置き換え版レンダラ。
 *
 * 旧 `components/article/ArticleRenderer.tsx` と同じフルバンドル props を受け取り、
 * v2 のブランドレイアウト（モデルコース / 場所あり / 場所なし）に統合する。課金分岐・
 * いいね・保存・レビュー・スポット操作・著者・関連は engagement 層（既存コンポーネント
 * 再利用）が提供するため、機能は一切落とさない。
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
  const {
    article,
    writer,
    spots,
    reviews,
    related,
    region,
    country,
    videos,
    previewMode,
    authorServices,
  } = props;

  const kind = classifyArticle(article, spots);

  // engagement props（HeroActions 等が参照する全バンドル）
  const eng: EngagementProps = props;

  const heroActions = <HeroActions {...eng} />;

  // engagement 共通フッター（著者 → レビュー → 関連）
  const footer = (
    <>
      <AuthorCard writer={writer} authorServices={authorServices} />
      <ReviewsList reviews={reviews} />
      <RelatedArticles related={related} />
    </>
  );

  if (kind === 'itinerary') {
    return (
      <>
        <PreviewBanner article={article} previewMode={previewMode} />
        <ItineraryArticleV2
          article={article}
          writer={writer}
          spots={spots}
          region={region}
          country={country}
          heroActions={heroActions}
        >
          <PaidBodyAndExtras {...eng} />
          {footer}
        </ItineraryArticleV2>
      </>
    );
  }

  if (kind === 'place-guide') {
    return (
      <>
        <PreviewBanner article={article} previewMode={previewMode} />
        <PlaceGuideArticleV2
          article={article}
          writer={writer}
          spots={spots}
          region={region}
          country={country}
          heroActions={heroActions}
        >
          <PaidBodyAndExtras {...eng} />
          {footer}
        </PlaceGuideArticleV2>
      </>
    );
  }

  // essay
  return (
    <>
      <PreviewBanner article={article} previewMode={previewMode} />
      <EssayArticleV2
        article={article}
        writer={writer}
        heroActions={heroActions}
        videosSlot={<EssayVideos videos={videos} />}
      >
        <PaidBodyAndExtras {...eng} />
        {footer}
      </EssayArticleV2>
    </>
  );
}
