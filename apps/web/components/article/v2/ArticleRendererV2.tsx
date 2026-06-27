'use client';

import type { Article, Writer, Spot } from '@/lib/mock';
import { classifyArticle, type ArticleVideoRow } from './classify';
import { ItineraryArticleV2 } from './ItineraryArticleV2';
import { PlaceGuideArticleV2 } from './PlaceGuideArticleV2';
import { EssayArticleV2 } from './EssayArticleV2';

/**
 * Phase A 新レンダラの振り分け（入口2択ベース）:
 *   - itinerary               → ItineraryArticleV2（モデルコース）
 *   - standard & spots>0       → PlaceGuideArticleV2（ブログ・場所あり）
 *   - standard & spots===0     → EssayArticleV2（ブログ・場所なし）
 *
 * 本番 /articles/[id] と ArticleRenderer は変更しない。これは新規・プレビュー専用。
 */
export function ArticleRendererV2({
  article,
  writer,
  spots,
  related,
  region,
  country,
  videos,
}: {
  article: Article;
  writer: Writer | null;
  spots: Spot[];
  related: Article[];
  region: { nameJa: string } | null;
  country: { nameJa: string } | null;
  videos: ArticleVideoRow[];
}) {
  const kind = classifyArticle(article, spots);

  if (kind === 'itinerary') {
    return (
      <ItineraryArticleV2
        article={article}
        writer={writer}
        spots={spots}
        related={related}
        region={region}
        country={country}
      />
    );
  }

  if (kind === 'place-guide') {
    return (
      <PlaceGuideArticleV2
        article={article}
        writer={writer}
        spots={spots}
        related={related}
        region={region}
        country={country}
      />
    );
  }

  return (
    <EssayArticleV2
      article={article}
      writer={writer}
      related={related}
      videos={videos}
    />
  );
}
