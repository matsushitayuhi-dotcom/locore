import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq, asc } from 'drizzle-orm';
import { schema } from '@locore/db';
import { Badge } from '@locore/ui';
import { getDb } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/auth/current-user';

export const metadata = {
  title: '公開前プレビュー',
};

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  draft: '下書き',
  pending_review: '審査中',
  published: '公開中',
  archived: 'アーカイブ',
};

export default async function PreviewArticlePage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
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

  const [spotRows, videoRows, cityRow] = await Promise.all([
    db
      .select()
      .from(schema.spots)
      .where(eq(schema.spots.articleId, article.id))
      .orderBy(asc(schema.spots.position)),
    db
      .select()
      .from(schema.articleVideos)
      .where(eq(schema.articleVideos.articleId, article.id))
      .orderBy(asc(schema.articleVideos.position)),
    db
      .select({ nameJa: schema.cities.nameJa })
      .from(schema.cities)
      .where(eq(schema.cities.id, article.cityId))
      .limit(1),
  ]);

  const cityName = cityRow[0]?.nameJa ?? '';

  return (
    <div className="space-y-8">
      <div className="rounded-md border border-warning-500 bg-warning-50 px-4 py-3 text-warning-700">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] font-medium">公開前プレビュー</p>
          <Link
            href={`/writer/articles/${article.id}/edit`}
            className="text-[12px] text-warning-700 underline-offset-4 hover:underline"
          >
            編集に戻る →
          </Link>
        </div>
        <p className="mt-1 text-[12px]">
          これは書き手専用のプレビュー画面です。公開済みページとは別実装のため、
          実際の表示と微妙に異なる場合があります。
        </p>
      </div>

      <article className="space-y-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-foreground/60">
            <Badge variant={article.status === 'published' ? 'secondary' : 'outline'}>
              {STATUS_LABEL[article.status]}
            </Badge>
            {cityName ? <span>{cityName}</span> : null}
            <span>¥{article.priceJpy.toLocaleString('ja-JP')}</span>
          </div>
          <h1
            className="text-[28px] font-semibold tracking-tight"
            style={{
              fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
            }}
          >
            {article.title || '（無題）'}
          </h1>
          {(article.tags ?? []).length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {article.tags.map((t) => (
                <Badge key={t} variant="outline">
                  #{t}
                </Badge>
              ))}
            </div>
          ) : null}
        </header>

        {article.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.coverImageUrl}
            alt=""
            className="aspect-cover w-full rounded-lg border border-border bg-muted object-cover"
          />
        ) : null}

        <section
          className="prose prose-neutral max-w-none whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90"
          style={{
            fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
          }}
        >
          {article.body || '（本文未入力）'}
        </section>

        {spotRows.length > 0 ? (
          <section className="space-y-3">
            <h2
              className="text-[18px] font-semibold tracking-tight"
              style={{
                fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
              }}
            >
              スポット
            </h2>
            <ol className="space-y-2">
              {spotRows.map((s, i) => (
                <li
                  key={s.id}
                  className="rounded-md border border-border bg-card p-3"
                >
                  <p className="text-[14px] font-medium text-foreground">
                    {i + 1}. {s.name}
                  </p>
                  {s.address ? (
                    <p className="text-[12px] text-foreground/60">{s.address}</p>
                  ) : null}
                  {s.priceEstimate ? (
                    <p className="text-[11px] text-foreground/50">
                      料金目安：{s.priceEstimate}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {videoRows.length > 0 ? (
          <section className="space-y-3">
            <h2
              className="text-[18px] font-semibold tracking-tight"
              style={{
                fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
              }}
            >
              動画
            </h2>
            <ul className="space-y-2">
              {videoRows.map((v) => (
                <li
                  key={v.id}
                  className="rounded-md border border-border bg-card p-3 text-[12px]"
                >
                  <span className="mr-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700">
                    {v.platform}
                  </span>
                  <a
                    href={v.embedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-700 underline-offset-4 hover:underline"
                  >
                    {v.embedUrl}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </div>
  );
}
