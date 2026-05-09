import 'server-only';
import { eq, asc, desc, isNull, and } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import type { Article, Collection } from '@/lib/mock';

const durationMap: Record<string, '1h' | '半日' | '1日' | '数時間'> = {
  half_day: '半日',
  full_day: '1日',
  few_hours: '数時間',
  other: '半日',
};

/**
 * すべての公開コレクションを取得（mock の Collection 型互換）。
 * `articleIds` は collection_articles から position 昇順で返す。
 */
export async function listCollections(): Promise<Collection[]> {
  try {
    const db = getDb();
    const cols = await db
      .select({
        id: schema.editorCollections.id,
        title: schema.editorCollections.title,
        body: schema.editorCollections.body,
        coverImageUrl: schema.editorCollections.coverImageUrl,
        publishedAt: schema.editorCollections.publishedAt,
        editorName: schema.users.displayName,
      })
      .from(schema.editorCollections)
      .leftJoin(
        schema.users,
        eq(schema.users.id, schema.editorCollections.editorId),
      )
      .orderBy(desc(schema.editorCollections.publishedAt));

    if (cols.length === 0) return [];

    const allRels = await db
      .select({
        collectionId: schema.collectionArticles.collectionId,
        articleId: schema.collectionArticles.articleId,
        position: schema.collectionArticles.position,
      })
      .from(schema.collectionArticles)
      .orderBy(asc(schema.collectionArticles.position));

    const articleIdsByCol = new Map<string, string[]>();
    for (const r of allRels) {
      const arr = articleIdsByCol.get(r.collectionId) ?? [];
      arr.push(r.articleId);
      articleIdsByCol.set(r.collectionId, arr);
    }

    return cols.map((c): Collection => ({
      id: c.id,
      title: c.title,
      subtitle: '',
      intro: c.body ?? '',
      coverImageUrl:
        c.coverImageUrl ??
        `https://picsum.photos/seed/locore-collection-${c.id}/1280/720`,
      curatorName: c.editorName ?? 'Locore 編集部',
      curatorRole: 'ゲストキュレーター',
      articleIds: articleIdsByCol.get(c.id) ?? [],
      publishedAt: (c.publishedAt ?? new Date()).toISOString(),
    }));
  } catch {
    return [];
  }
}

/**
 * 単一コレクションを取得し、紐づく記事も Article[] として返す。
 */
export async function getCollectionWithArticles(id: string): Promise<{
  collection: Collection;
  articles: Article[];
} | null> {
  try {
    const db = getDb();
    const cols = await db
      .select({
        id: schema.editorCollections.id,
        title: schema.editorCollections.title,
        body: schema.editorCollections.body,
        coverImageUrl: schema.editorCollections.coverImageUrl,
        publishedAt: schema.editorCollections.publishedAt,
        editorName: schema.users.displayName,
      })
      .from(schema.editorCollections)
      .leftJoin(
        schema.users,
        eq(schema.users.id, schema.editorCollections.editorId),
      )
      .where(eq(schema.editorCollections.id, id))
      .limit(1);
    if (cols.length === 0) return null;
    const c = cols[0]!;

    const rels = await db
      .select({
        articleId: schema.collectionArticles.articleId,
        position: schema.collectionArticles.position,
      })
      .from(schema.collectionArticles)
      .where(eq(schema.collectionArticles.collectionId, c.id))
      .orderBy(asc(schema.collectionArticles.position));

    const ids = rels.map((r) => r.articleId);
    const articles: Article[] = [];
    if (ids.length > 0) {
      const articleRows = await db
        .select({
          id: schema.articles.id,
          title: schema.articles.title,
          body: schema.articles.body,
          bodyPaid: schema.articles.bodyPaid,
          coverImageUrl: schema.articles.coverImageUrl,
          writerId: schema.articles.writerId,
          cityId: schema.articles.cityId,
          priceJpy: schema.articles.priceJpy,
          tags: schema.articles.tags,
          durationType: schema.articles.durationType,
          articleType: schema.articles.articleType,
          createdAt: schema.articles.createdAt,
          publishedAt: schema.articles.publishedAt,
          cityNameJa: schema.cities.nameJa,
        })
        .from(schema.articles)
        .leftJoin(schema.cities, eq(schema.articles.cityId, schema.cities.id))
        .where(
          and(
            eq(schema.articles.status, 'published'),
            isNull(schema.articles.deletedAt),
          ),
        );
      const byId = new Map(articleRows.map((r) => [r.id, r]));
      for (const aid of ids) {
        const a = byId.get(aid);
        if (!a) continue;
        articles.push({
          id: a.id,
          title: a.title,
          body: a.body ?? '',
          bodyPaid: a.bodyPaid ?? null,
          coverImageUrl:
            a.coverImageUrl ?? `https://picsum.photos/seed/${a.id}/960/640`,
          writerId: a.writerId,
          cityId: a.cityId,
          area: a.cityNameJa ?? 'パリ',
          priceJpy: a.priceJpy,
          tags: a.tags ?? [],
          durationType: durationMap[a.durationType ?? 'other'] ?? '半日',
          articleType: a.articleType,
          createdAt: a.createdAt.toISOString(),
          publishedAt: (a.publishedAt ?? a.createdAt).toISOString(),
          localScoreAverage: 70,
          satisfactionAverage: 4.5,
          reviewCount: 0,
          purchaseCount: 0,
          spotIds: [],
        });
      }
    }

    return {
      collection: {
        id: c.id,
        title: c.title,
        subtitle: '',
        intro: c.body ?? '',
        coverImageUrl:
          c.coverImageUrl ??
          `https://picsum.photos/seed/locore-collection-${c.id}/1280/720`,
        curatorName: c.editorName ?? 'Locore 編集部',
        curatorRole: 'ゲストキュレーター',
        articleIds: rels.map((r) => r.articleId),
        publishedAt: (c.publishedAt ?? new Date()).toISOString(),
      },
      articles,
    };
  } catch {
    return null;
  }
}
