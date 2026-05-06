import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  CreatorBadge,
  ResidencyBadge,
} from '@locore/ui';
import { ExternalLink } from '@locore/ui/icons';
import { articlesByWriter, getWriter, writers } from '../../../lib/mock';
import { ArticleGrid } from '../../../components/ArticleGrid';

export function generateStaticParams() {
  return writers.map((w) => ({ id: w.id }));
}

export default function WriterPage({ params }: { params: { id: string } }) {
  const writer = getWriter(params.id);
  if (!writer) return notFound();
  const articles = articlesByWriter(writer.id);
  const totalRevenue = articles.reduce(
    (acc, a) => acc + a.purchaseCount * a.priceJpy,
    0,
  );
  const avgLocal =
    articles.length > 0
      ? Math.round(
          articles.reduce((acc, a) => acc + a.localScoreAverage, 0) /
            articles.length,
        )
      : 0;
  const avgSat =
    articles.length > 0
      ? +(
          articles.reduce((acc, a) => acc + a.satisfactionAverage, 0) /
          articles.length
        ).toFixed(1)
      : 0;

  return (
    <main className="bg-background">
      <div className="border-b border-border bg-neutral-25">
        <div className="mx-auto flex max-w-screen-lg flex-col items-start gap-6 px-4 py-12 sm:flex-row sm:px-6">
          <Avatar size="xl" className="ring-2 ring-border shadow-sm">
            <AvatarImage src={writer.avatarUrl} alt={writer.name} />
            <AvatarFallback>{writer.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1
                className="text-[28px] font-semibold tracking-tight"
                style={{
                  fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
                }}
              >
                {writer.name}
              </h1>
              <ResidencyBadge tier={writer.tier} years={writer.residencyYears} />
              {writer.isVerifiedCreator ? <CreatorBadge type="verified" /> : null}
              {writer.isFounding ? <CreatorBadge type="founding" /> : null}
            </div>
            <p className="mt-2 text-[13px] text-foreground/60">
              パリ在住 {writer.residencyYears}年 ・ {writer.followerCount.toLocaleString('ja-JP')} followers
            </p>
            <p className="mt-4 max-w-2xl text-[15px] leading-[1.95] text-foreground/80">
              {writer.bio}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(writer.social).map(([k, v]) =>
                v ? (
                  <a
                    key={k}
                    href={v}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-[12px] text-foreground/70 transition hover:bg-muted"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {k.toUpperCase()}
                  </a>
                ) : null,
              )}
              <Button variant="outline" size="sm">
                フォロー
              </Button>
            </div>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-screen-lg px-4 py-8 sm:px-6">
        <dl className="grid grid-cols-2 gap-3 rounded-md border border-border bg-card p-5 sm:grid-cols-4">
          <Stat label="記事数" value={`${articles.length}本`} />
          <Stat
            label="累計売上（推定）"
            value={`¥${totalRevenue.toLocaleString('ja-JP')}`}
          />
          <Stat label="平均ローカル度" value={`${avgLocal} / 100`} />
          <Stat label="平均満足度" value={`★ ${avgSat}`} />
        </dl>
      </section>

      <section className="mx-auto max-w-screen-xl px-4 pb-16 sm:px-6">
        <h2
          className="mb-5 text-[20px] font-semibold tracking-tight"
          style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
        >
          {writer.name}さんの記事
        </h2>
        <ArticleGrid articles={articles} hideAuthor />
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/50">
        {label}
      </dt>
      <dd className="mt-1 text-[16px] font-semibold tabular">{value}</dd>
    </div>
  );
}
