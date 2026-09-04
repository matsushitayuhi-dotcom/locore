import type { MetadataRoute } from 'next';
import { getPublishedDbArticles } from '@/lib/articles/published';
import { listExperts } from '@/lib/experts/list';
import { getSiteUrl } from '@/lib/seo/siteUrl';

/**
 * sitemap.xml — v2 ブログ再位置付け（SEO）。
 *
 * 収録: トップ / エキスパート一覧・詳細（全件）/ 記事一覧・詳細（published 全件）。
 * 認証必須ページ・旧コンセプトのフィルタ URL は載せない（robots.ts と整合）。
 * DB 失敗時は各ローダが空配列にフォールバックするので、静的 URL だけでも返る。
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();

  const [articles, experts] = await Promise.all([
    getPublishedDbArticles(500),
    listExperts({}),
  ]);

  return [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/experts`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/articles`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/about-service`, changeFrequency: 'monthly', priority: 0.5 },
    ...experts.map((e) => ({
      url: `${base}/experts/${e.userId}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...articles.map((a) => ({
      url: `${base}/articles/${a.id}`,
      ...(a.publishedAt ? { lastModified: new Date(a.publishedAt) } : {}),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
