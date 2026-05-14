import Link from 'next/link';
import { Bookmark } from 'lucide-react';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { Button } from '@locore/ui';
import { requireUser } from '@/lib/auth/require-user';
import {
  listMyBookmarks,
  listMyBookmarkFolders,
} from '@/lib/bookmarks/actions';
import { LibraryTabs } from '@/components/library/LibraryTabs';
import { LibraryArticlesView } from '@/components/library/LibraryArticlesView';
import { LibrarySpotsView } from '@/components/library/LibrarySpotsView';
import type { Article } from '@/lib/mock';

export const metadata = {
  title: '保存ライブラリ',
  description: '保存した記事・旅程記事・スポットの一覧',
};

export const dynamic = 'force-dynamic';

const durationMap: Record<string, '1h' | '半日' | '1日' | '数時間'> = {
  half_day: '半日',
  full_day: '1日',
  few_hours: '数時間',
  other: '半日',
};

type SearchProps = { searchParams?: { tab?: string } };

export default async function LibraryPage({ searchParams }: SearchProps) {
  const me = await requireUser('/library');
  const tab = (searchParams?.tab ?? 'articles') as
    | 'articles'
    | 'itineraries'
    | 'spots';

  // ブックマーク済み記事 ID + folderId を取得
  const bookmarks = await listMyBookmarks();
  const articleIds = bookmarks.map((b) => b.articleId);
  const folderByArticleId = new Map(
    bookmarks.map((b) => [b.articleId, b.folderId ?? null]),
  );

  // 自分のブックマークフォルダ
  const bookmarkFolders = await listMyBookmarkFolders();

  let articles: Array<Article & { folderId: string | null }> = [];
  if (articleIds.length > 0) {
    try {
      const db = getDb();
      const rows = await db
        .select({
          id: schema.articles.id,
          title: schema.articles.title,
          body: schema.articles.body,
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
          writerName: schema.users.displayName,
          writerAvatar: schema.users.avatarUrl,
          writerTier: schema.writerProfiles.tier,
          writerYears: schema.writerProfiles.residencyYears,
        })
        .from(schema.articles)
        .leftJoin(schema.users, eq(schema.articles.writerId, schema.users.id))
        .leftJoin(
          schema.writerProfiles,
          eq(schema.writerProfiles.userId, schema.articles.writerId),
        )
        .leftJoin(schema.cities, eq(schema.articles.cityId, schema.cities.id))
        .where(
          and(
            eq(schema.articles.status, 'published'),
            isNull(schema.articles.deletedAt),
          ),
        );
      const byId = new Map(rows.map((r) => [r.id, r]));
      articles = articleIds
        .map((id) => byId.get(id))
        .filter((r): r is NonNullable<typeof r> => Boolean(r))
        .map((r) => ({
          id: r.id,
          title: r.title,
          body: r.body ?? '',
          coverImageUrl:
            r.coverImageUrl ?? `https://picsum.photos/seed/${r.id}/960/640`,
          writerId: r.writerId,
          writerName: r.writerName ?? '匿名',
          writerAvatarUrl: r.writerAvatar ?? null,
          writerTier: (r.writerTier ?? 'B') as 'S' | 'A' | 'B',
          writerYears: r.writerYears ?? 0,
          cityId: r.cityId,
          area: r.cityNameJa ?? 'パリ',
          priceJpy: r.priceJpy,
          tags: r.tags ?? [],
          durationType: durationMap[r.durationType ?? 'other'] ?? '半日',
          articleType: r.articleType,
          createdAt: r.createdAt.toISOString(),
          publishedAt: (r.publishedAt ?? r.createdAt).toISOString(),
          localScoreAverage: 70,
          satisfactionAverage: 4.5,
          reviewCount: 0,
          purchaseCount: 0,
          spotIds: [],
          folderId: folderByArticleId.get(r.id) ?? null,
        }));
    } catch {
      articles = [];
    }
  }

  const itineraries = articles.filter((a) => a.articleType === 'itinerary');
  const guides = articles.filter((a) => a.articleType !== 'itinerary');
  const allArticleIds = new Set(articles.map((a) => a.id));

  // スポット（me は冒頭で取得済み）
  const db = getDb();
  const [foldersRows, bookmarkRows] = await Promise.all([
    db
      .select({
        id: schema.spotFolders.id,
        name: schema.spotFolders.name,
        color: schema.spotFolders.color,
      })
      .from(schema.spotFolders)
      .where(eq(schema.spotFolders.userId, me.id)),
    db
      .select({
        spotId: schema.spotBookmarks.spotId,
        folderId: schema.spotBookmarks.folderId,
        notes: schema.spotBookmarks.notes,
        createdAt: schema.spotBookmarks.createdAt,
        name: schema.spots.name,
        address: schema.spots.address,
        category: schema.spots.category,
        articleId: schema.spots.articleId,
      })
      .from(schema.spotBookmarks)
      .leftJoin(schema.spots, eq(schema.spots.id, schema.spotBookmarks.spotId))
      .where(eq(schema.spotBookmarks.userId, me.id))
      .orderBy(desc(schema.spotBookmarks.createdAt)),
  ]);

  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/60">
              <Bookmark className="h-3 w-3" />
              Library
            </p>
            <h1 className="text-[28px] font-bold tracking-tight">あとで読む / 行く</h1>
            <p className="mt-2 text-[13px] text-foreground/65">
              気になった記事・旅程・スポットを、自分の旅の前夜に見返せるようにしておく場所。フォルダで自由に整理してください。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/residents/${me.id}`}
              className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-[12px] font-semibold text-foreground ring-1 ring-border hover:bg-muted"
            >
              プロフィール
            </Link>
            <Link
              href={`/residents/${me.id}/followers`}
              className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-[12px] font-semibold text-foreground ring-1 ring-border hover:bg-muted"
            >
              フォロワー
            </Link>
            <Link
              href={`/residents/${me.id}/following`}
              className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-[12px] font-semibold text-foreground ring-1 ring-border hover:bg-muted"
            >
              フォロー中
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm">
                フィードに戻る
              </Button>
            </Link>
          </div>
        </header>

        <LibraryTabs
          active={tab}
          counts={{
            articles: guides.length,
            itineraries: itineraries.length,
            spots: bookmarkRows.length,
          }}
        />

        <div className="mt-2">
          {tab === 'articles' ? (
            <LibraryArticlesView
              items={guides}
              folders={bookmarkFolders}
              bookmarkedIds={allArticleIds}
              kindLabel="記事"
              emptyLabel="保存した記事はまだありません"
            />
          ) : null}

          {tab === 'itineraries' ? (
            <LibraryArticlesView
              items={itineraries}
              folders={bookmarkFolders}
              bookmarkedIds={allArticleIds}
              kindLabel="旅程"
              emptyLabel="保存した旅程記事はまだありません"
            />
          ) : null}

          {tab === 'spots' ? (
            <LibrarySpotsView
              bookmarks={bookmarkRows.map((r) => {
                // スポットに紐づく記事のカバー画像をプレビューに流用
                // （Wishlist カードの 2x2 コラージュ用）
                const article = articles.find((a) => a.id === r.articleId);
                return {
                  spotId: r.spotId,
                  folderId: r.folderId,
                  name: r.name ?? '（削除済み）',
                  address: r.address,
                  category: r.category,
                  articleId: r.articleId ?? '',
                  notes: r.notes,
                  previewImageUrl: article?.coverImageUrl ?? null,
                };
              })}
              folders={foldersRows}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}
