import Link from 'next/link';
import { Bookmark } from 'lucide-react';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { Button } from '@locore/ui';
import { requireUser } from '@/lib/auth/require-user';
import { listMyBookmarks } from '@/lib/bookmarks/actions';
import { ArticleGrid } from '@/components/ArticleGrid';
import { LibraryTabs } from '@/components/library/LibraryTabs';
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
  await requireUser('/library');
  const tab = (searchParams?.tab ?? 'articles') as
    | 'articles'
    | 'itineraries'
    | 'spots';

  // ブックマーク済み記事 ID を引いて、対応する記事を DB から復元
  const bookmarks = await listMyBookmarks();
  const articleIds = bookmarks.map((b) => b.articleId);

  let articles: Article[] = [];
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
        .map(
          (r): Article => ({
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
          }),
        );
    } catch {
      articles = [];
    }
  }

  const itineraries = articles.filter((a) => a.articleType === 'itinerary');
  const guides = articles.filter((a) => a.articleType !== 'itinerary');

  // スポット
  const me = await requireUser();
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
            <h1 className="text-[28px] font-bold tracking-tight">保存ライブラリ</h1>
            <p className="mt-2 text-[13px] text-foreground/60">
              気になった記事・旅程・スポットをまとめて見返せます。
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm">
              フィードに戻る
            </Button>
          </Link>
        </header>

        <LibraryTabs
          active={tab}
          counts={{
            articles: guides.length,
            itineraries: itineraries.length,
            spots: bookmarkRows.length,
          }}
        />

        <div className="mt-6">
          {tab === 'articles' ? (
            guides.length === 0 ? (
              <Empty label="保存した記事はまだありません" />
            ) : (
              <ArticleGrid
                articles={guides}
                bookmarkedIds={new Set(guides.map((a) => a.id))}
              />
            )
          ) : null}

          {tab === 'itineraries' ? (
            itineraries.length === 0 ? (
              <Empty label="保存した旅程記事はまだありません" />
            ) : (
              <ArticleGrid
                articles={itineraries}
                bookmarkedIds={new Set(itineraries.map((a) => a.id))}
              />
            )
          ) : null}

          {tab === 'spots' ? (
            bookmarkRows.length === 0 ? (
              <Empty label="保存したスポットはまだありません" />
            ) : (
              <SpotsByFolder
                folders={foldersRows}
                bookmarks={bookmarkRows.map((r) => ({
                  spotId: r.spotId,
                  folderId: r.folderId,
                  name: r.name ?? '（削除済み）',
                  address: r.address,
                  category: r.category,
                  articleId: r.articleId ?? '',
                  notes: r.notes,
                }))}
              />
            )
          ) : null}
        </div>
      </div>
    </main>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-md bg-card p-12 text-center text-[13px] text-foreground/60 ring-1 ring-primary-100">
      {label}
    </div>
  );
}

type SpotRow = {
  spotId: string;
  folderId: string | null;
  name: string;
  address: string | null;
  category: string | null;
  articleId: string;
  notes: string | null;
};

function SpotsByFolder({
  folders,
  bookmarks,
}: {
  folders: { id: string; name: string; color: string | null }[];
  bookmarks: SpotRow[];
}) {
  const groupBy = new Map<string | null, SpotRow[]>();
  for (const b of bookmarks) {
    const arr = groupBy.get(b.folderId) ?? [];
    arr.push(b);
    groupBy.set(b.folderId, arr);
  }

  const sections: { id: string | null; name: string; rows: SpotRow[] }[] = [];
  // 未分類を先頭に
  if (groupBy.has(null)) {
    sections.push({ id: null, name: '未分類', rows: groupBy.get(null)! });
  }
  for (const f of folders) {
    const rows = groupBy.get(f.id);
    if (rows && rows.length > 0) {
      sections.push({ id: f.id, name: f.name, rows });
    }
  }

  return (
    <div className="space-y-8">
      {sections.map((s) => (
        <section key={s.id ?? 'unfiled'}>
          <h2 className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-[12px] font-bold text-primary-700">
            {s.name}
            <span className="text-[10px] font-medium text-primary-700/70">
              {s.rows.length} 件
            </span>
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {s.rows.map((r) => (
              <li
                key={r.spotId}
                className="rounded-md bg-white p-3 ring-1 ring-primary-100"
              >
                <p className="text-[13px] font-semibold">{r.name}</p>
                {r.address ? (
                  <p className="mt-0.5 text-[11px] text-foreground/60">
                    {r.address}
                  </p>
                ) : null}
                {r.notes ? (
                  <p className="mt-1 text-[11px] text-primary-700">{r.notes}</p>
                ) : null}
                {r.articleId ? (
                  <Link
                    href={`/articles/${r.articleId}`}
                    className="mt-2 inline-block text-[11px] text-primary-700 underline-offset-4 hover:underline"
                  >
                    元の記事を見る →
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
