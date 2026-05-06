import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq, asc } from 'drizzle-orm';
import { schema } from '@locore/db';
import { Badge } from '@locore/ui';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { ArticleForm } from '@/components/writer/ArticleForm';
import { ArticleBodyEditor } from '@/components/writer/ArticleBodyEditor';
import { SpotList, type SpotRow } from '@/components/writer/SpotList';
import { VideoEmbedEditor, type VideoRow } from '@/components/writer/VideoEmbedEditor';
import { ModerationBanner } from '@/components/writer/ModerationBanner';
import { PublishControls } from '@/components/writer/PublishControls';

export const metadata = {
  title: '記事を編集',
};

export const dynamic = 'force-dynamic';

const TAB_OPTIONS = ['basic', 'body', 'spots', 'videos'] as const;
type Tab = (typeof TAB_OPTIONS)[number];

const TAB_LABEL: Record<Tab, string> = {
  basic: '基本情報',
  body: '本文',
  spots: 'スポット',
  videos: '動画埋め込み',
};

const STATUS_LABEL: Record<string, string> = {
  draft: '下書き',
  pending_review: '審査中',
  published: '公開中',
  archived: 'アーカイブ',
};

export default async function EditArticlePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { tab?: string };
}) {
  const user = await requireUser();
  const db = getDb();

  const articleRows = await db
    .select()
    .from(schema.articles)
    .where(eq(schema.articles.id, params.id))
    .limit(1);

  if (articleRows.length === 0) return notFound();
  const article = articleRows[0]!;
  if (article.writerId !== user.id && user.role !== 'editor') {
    return notFound();
  }

  // 関連データを並列取得
  const [spotRowsRaw, videoRowsRaw, cityRows, writerProfileRows] = await Promise.all([
    db
      .select({
        id: schema.spots.id,
        articleId: schema.spots.articleId,
        name: schema.spots.name,
        address: schema.spots.address,
        category: schema.spots.category,
        priceEstimate: schema.spots.priceEstimate,
        openingHours: schema.spots.openingHours,
        tags: schema.spots.tags,
        position: schema.spots.position,
      })
      .from(schema.spots)
      .where(eq(schema.spots.articleId, params.id))
      .orderBy(asc(schema.spots.position)),
    db
      .select()
      .from(schema.articleVideos)
      .where(eq(schema.articleVideos.articleId, params.id))
      .orderBy(asc(schema.articleVideos.position)),
    db
      .select({ id: schema.cities.id, nameJa: schema.cities.nameJa })
      .from(schema.cities)
      .where(eq(schema.cities.isActive, true)),
    db
      .select({ tier: schema.writerProfiles.tier })
      .from(schema.writerProfiles)
      .where(eq(schema.writerProfiles.userId, user.id))
      .limit(1),
  ]);

  // Spot は ST_X / ST_Y を別途取得しないと lat/lng が取れない。
  // 表示時の暫定対応として、PostgreSQL から ST_X / ST_Y を別クエリで取得する。
  const spotIds = spotRowsRaw.map((s) => s.id);
  const coordsMap = new Map<string, { lat: number; lng: number }>();
  if (spotIds.length > 0) {
    const dbAny = db as unknown as {
      execute: (q: ReturnType<typeof import('drizzle-orm').sql>) => Promise<unknown>;
    };
    const { sql } = await import('drizzle-orm');
    const result = (await dbAny.execute(
      sql`select id, ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng from spots where id = ANY(${spotIds})`,
    )) as unknown as Array<{ id: string; lat: number; lng: number }> | { rows: Array<{ id: string; lat: number; lng: number }> };
    const rows = Array.isArray(result) ? result : result.rows;
    for (const r of rows) {
      coordsMap.set(r.id, { lat: Number(r.lat), lng: Number(r.lng) });
    }
  }

  const spots: SpotRow[] = spotRowsRaw.map((s) => {
    const coords = coordsMap.get(s.id) ?? { lat: 0, lng: 0 };
    const oh = s.openingHours;
    const openingHoursText =
      oh == null
        ? ''
        : typeof oh === 'object' && 'note' in oh && Object.keys(oh).length === 1
          ? (oh as { note?: string }).note ?? ''
          : JSON.stringify(oh, null, 2);
    return {
      id: s.id,
      articleId: s.articleId,
      name: s.name,
      address: s.address,
      lat: coords.lat,
      lng: coords.lng,
      category: s.category,
      priceEstimate: s.priceEstimate,
      openingHoursText,
      tags: s.tags ?? [],
      position: s.position,
    };
  });

  const videos: VideoRow[] = videoRowsRaw.map((v) => ({
    id: v.id,
    platform: v.platform,
    embedUrl: v.embedUrl,
    position: v.position,
  }));

  const tier = (writerProfileRows[0]?.tier ?? 'B') as 'S' | 'A' | 'B';
  const tab: Tab = (TAB_OPTIONS.includes((searchParams?.tab as Tab) ?? 'basic')
    ? (searchParams?.tab as Tab)
    : 'basic') as Tab;

  const isPublished = article.status === 'published';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-foreground/50">
            <Link href="/writer/articles" className="hover:underline">
              ← 一覧に戻る
            </Link>
          </p>
          <h2
            className="mt-2 truncate text-[20px] font-semibold tracking-tight"
            style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
          >
            {article.title || '（無題）'}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant={article.status === 'published' ? 'secondary' : 'outline'}>
              {STATUS_LABEL[article.status]}
            </Badge>
            <span className="text-[11px] text-foreground/50">
              更新 {article.updatedAt.toLocaleString('ja-JP')}
            </span>
          </div>
        </div>
        <PublishControls
          articleId={article.id}
          status={article.status}
          bodyLength={article.body.length}
        />
      </div>

      <ModerationBanner
        finalScore={article.moderationScore}
        warned={article.warned}
        status={article.status}
      />

      {/* タブ */}
      <div className="flex gap-1 border-b border-border" role="tablist" aria-label="編集タブ">
        {TAB_OPTIONS.map((t) => {
          const active = t === tab;
          return (
            <Link
              key={t}
              role="tab"
              aria-selected={active}
              href={`/writer/articles/${article.id}/edit?tab=${t}`}
              className={
                'rounded-t-sm px-4 py-2 text-[13px] transition-colors ' +
                (active
                  ? 'border-b-2 border-primary-700 font-medium text-foreground'
                  : 'text-foreground/60 hover:text-foreground')
              }
            >
              {TAB_LABEL[t]}
            </Link>
          );
        })}
      </div>

      <div>
        {tab === 'basic' ? (
          <ArticleForm
            initial={{
              id: article.id,
              title: article.title,
              priceJpy: article.priceJpy,
              durationType: article.durationType,
              articleType: article.articleType,
              tags: article.tags ?? [],
              cityId: article.cityId,
              coverImageUrl: article.coverImageUrl,
            }}
            cities={cityRows}
            tier={tier}
            isPublished={isPublished}
          />
        ) : null}

        {tab === 'body' ? (
          <ArticleBodyEditor
            articleId={article.id}
            initialBody={article.body}
            isPublished={isPublished}
          />
        ) : null}

        {tab === 'spots' ? <SpotList articleId={article.id} initial={spots} /> : null}

        {tab === 'videos' ? (
          <VideoEmbedEditor articleId={article.id} initial={videos} />
        ) : null}
      </div>
    </div>
  );
}
