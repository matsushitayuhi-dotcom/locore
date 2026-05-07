import Link from 'next/link';
import Image from 'next/image';
import { Button, Badge, Avatar, AvatarImage, AvatarFallback } from '@locore/ui';
import { ArrowRight, Sparkles } from 'lucide-react';
import {
  articles as mockArticles,
  collections,
  crisisEvents,
  lightDiaries,
  getArticle,
} from '../lib/mock';
import { CrisisBanner } from '../components/CrisisBanner';
import { FeedFilters } from '../components/FeedFilters';
import { getPublishedDbArticles } from '../lib/articles/published';

// DB から最新の published 記事を読むため、フィードは動的レンダリング
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // 実 DB の published 記事を先頭に、後ろに mock 記事を続ける（重複は ID で除外）
  const dbArticles = await getPublishedDbArticles(50);
  const dbIdSet = new Set(dbArticles.map((a) => a.id));
  const articles = [
    ...dbArticles,
    ...mockArticles.filter((a) => !dbIdSet.has(a.id)),
  ];

  const pickedCollection = collections[0]!;
  const pickedArticles = pickedCollection.articleIds
    .map(getArticle)
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    .slice(0, 3);
  const seriousCrisis = crisisEvents.find((e) => e.severity >= 3);

  return (
    <main className="bg-background">
      {/* Hero */}
      <section className="border-b border-border bg-neutral-25">
        <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/60">
                <Sparkles className="h-3 w-3" /> Editorial first, since 2026
              </p>
              <h1
                className="text-[40px] font-semibold leading-[1.1] tracking-tight text-foreground sm:text-[56px]"
                style={{
                  fontFamily: 'var(--font-serif), var(--font-serif-jp), serif',
                }}
              >
                現地民が語る、
                <br className="hidden sm:block" />
                その土地の本当の物語。
              </h1>
              <p className="mt-6 max-w-xl text-[16px] leading-[1.9] text-foreground/70">
                Locore は、在外邦人ライターが現地で書く、観光ガイドにはない短尺の旅行誌。
                映え目当てではなく、街の輪郭を持ち帰るための、有料・編集的な記事を1本¥600〜。
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="#feed">
                  <Button variant="primary" size="lg">
                    記事を見る
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/founders">
                  <Button variant="outline" size="lg">
                    Founders 枠（先着50人）
                  </Button>
                </Link>
              </div>

              <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-border pt-6 text-[13px]">
                <div>
                  <dt className="text-foreground/50">対応都市</dt>
                  <dd className="mt-1 font-medium text-foreground">
                    パリ
                    <span className="ml-1 text-[11px] text-foreground/40">
                      / NYC・London Coming Soon
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground/50">記事</dt>
                  <dd className="mt-1 font-medium text-foreground">
                    {articles.length} 本
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground/50">価格</dt>
                  <dd className="mt-1 font-medium tabular text-foreground">
                    ¥600〜¥1,500
                  </dd>
                </div>
              </dl>
            </div>

            <div className="relative aspect-cover overflow-hidden rounded-lg border border-border bg-muted shadow-sm">
              <Image
                src="https://picsum.photos/seed/locore-hero/1200/800"
                alt="パリの路地裏のビストロ前で、地元の人が新聞を読みながらコーヒーを飲んでいる様子"
                fill
                className="object-cover"
                priority
                sizes="(min-width: 768px) 50vw, 100vw"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-neutral-900/70 to-transparent p-5">
                <p className="text-[12px] uppercase tracking-[0.2em] text-white/70">
                  Cover story
                </p>
                <p
                  className="mt-1 text-[20px] font-semibold leading-snug text-white"
                  style={{
                    fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
                  }}
                >
                  マレ地区で観光客が来ない、地元のおじさんが集う朝のビストロ3軒
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-screen-xl space-y-12 px-4 py-10 sm:px-6">
        {/* Crisis banner if severity >= 3 */}
        {seriousCrisis ? (
          <section>
            <CrisisBanner event={seriousCrisis} />
          </section>
        ) : null}

        {/* Featured collection */}
        <section>
          <SectionHeader
            kicker="編集チーム特集"
            title={pickedCollection.title}
            subtitle={pickedCollection.subtitle}
            href={`/collections/${pickedCollection.id}`}
          />
          <div className="grid gap-4 md:grid-cols-3">
            {pickedArticles.map((a) => (
              <Link
                key={a.id}
                href={`/articles/${a.id}`}
                className="group block overflow-hidden rounded-md border border-border bg-card transition hover:shadow-sm"
              >
                <div className="relative aspect-cover bg-muted">
                  <Image
                    src={a.coverImageUrl}
                    alt={a.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    sizes="(min-width: 768px) 33vw, 100vw"
                  />
                </div>
                <div className="p-4">
                  <Badge variant="outline" className="text-[10px]">
                    {a.area}
                  </Badge>
                  <p
                    className="mt-2 line-clamp-2 text-[15px] font-semibold leading-snug"
                    style={{
                      fontFamily:
                        'var(--font-serif-jp), var(--font-serif), serif',
                    }}
                  >
                    {a.title}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Feed */}
        <section id="feed">
          <SectionHeader
            kicker="フィード"
            title="パリ・ぜんぶの記事"
            subtitle="ローカル度・価格・テーマで絞り込んで、自分の旅にあうものを選ぶ"
          />
          <FeedFilters articles={articles} />
        </section>

        {/* Light diaries */}
        <section>
          <SectionHeader
            kicker="無料 / ライト旅行記"
            title="一般ユーザーの、短い記録"
            subtitle="編集を経ない、生の声。気軽に読める"
            href="/light-diaries"
          />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lightDiaries.slice(0, 3).map((d) => (
              <article
                key={d.id}
                className="rounded-md border border-border bg-card p-5 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <Avatar size="sm">
                    <AvatarImage src={d.avatarUrl} alt={d.authorName} />
                    <AvatarFallback>{d.authorName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-[13px] font-medium">{d.authorName}</p>
                    <p className="text-[11px] text-foreground/50">{d.visitedAt}</p>
                  </div>
                </div>
                <h3 className="mt-3 text-[15px] font-semibold leading-snug">
                  {d.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-foreground/70">
                  {d.body}
                </p>
                <p className="mt-3 text-[11px] text-foreground/40">♡ {d.likes}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Founders */}
        <section className="rounded-lg border border-secondary-300/50 bg-secondary-50/60 p-8 sm:p-10">
          <div className="grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary-700">
                Founders 枠
              </p>
              <h2
                className="mt-2 text-[28px] font-semibold leading-[1.2] tracking-tight"
                style={{
                  fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
                }}
              >
                先着50人。Locore を一緒に育てる書き手を、いま探しています。
              </h2>
              <p className="mt-4 text-[15px] leading-[1.9] text-foreground/70">
                取り分の優遇、永久バッジ、編集チームへのフィードバック権。
                フォロワー数ではなく、街への深さを最優先で選びます。
              </p>
            </div>
            <div className="flex justify-end">
              <Link href="/founders">
                <Button size="lg" variant="primary">
                  応募ページを見る
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function SectionHeader({
  kicker,
  title,
  subtitle,
  href,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  href?: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/50">
          {kicker}
        </p>
        <h2
          className="mt-1 text-[24px] font-semibold leading-tight tracking-tight"
          style={{
            fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
          }}
        >
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-[13px] text-foreground/60">{subtitle}</p>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="hidden whitespace-nowrap text-[13px] text-foreground/70 transition hover:text-foreground sm:inline-flex"
        >
          すべて見る →
        </Link>
      ) : null}
    </div>
  );
}
