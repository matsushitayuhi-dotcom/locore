import Link from 'next/link';
import Image from 'next/image';
import { Button, Badge, Avatar, AvatarImage, AvatarFallback } from '@locore/ui';
import { ArrowRight, Sparkles } from 'lucide-react';
import { CrisisBanner } from '../components/CrisisBanner';
import { FeedFilters } from '../components/FeedFilters';
import { getPublishedDbArticles } from '../lib/articles/published';
import { listCrisisEvents } from '../lib/crisis/db';
import { listLightDiaries } from '../lib/lightDiaries/db';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [articles, crises, lightDiaries] = await Promise.all([
    getPublishedDbArticles(50),
    listCrisisEvents(20),
    listLightDiaries(6),
  ]);

  const seriousCrisis = crises.find((e) => e.severity >= 3);

  return (
    <main className="bg-background">
      {/* Hero — emerald 単色のソフトグラデ + 控えめ blob 装飾 */}
      <section className="relative overflow-hidden border-b border-primary-100 bg-gradient-to-br from-primary-50 via-white to-primary-50/30">
        {/* 装飾 blob — 透明度低めで奥に。emerald のみ */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 -top-24 h-96 w-96 rounded-full bg-primary-200/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 right-0 h-80 w-80 rounded-full bg-primary-100/60 blur-3xl"
        />
        <div className="relative mx-auto max-w-screen-xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
            <div>
              <p className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-700 shadow-sm ring-1 ring-primary-100">
                <Sparkles className="h-3 w-3 text-primary-500" />
                現地民の "本物" だけ、編集して届ける
              </p>
              <h1 className="text-[44px] font-bold leading-[1.05] tracking-tight text-neutral-900 sm:text-[60px]">
                その土地の
                <span className="relative inline-block whitespace-nowrap">
                  <span className="relative z-10 text-primary-700">本当の物語</span>
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-1 z-0 h-2.5 rounded-full bg-primary-100"
                  />
                </span>
                を、
                <br className="hidden sm:block" />
                現地民が語る。
              </h1>
              <p className="mt-6 max-w-xl text-[17px] leading-[1.85] text-neutral-700">
                Locore は、在外邦人ライターが現地で書く、観光ガイドにはない短尺の旅行誌。
                映え目当てではなく、街の輪郭を持ち帰るための有料・編集的な記事が、1 本{' '}
                <span className="font-bold text-primary-700">¥600〜</span>。
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

              <dl className="mt-10 grid grid-cols-3 gap-3 rounded-2xl bg-white/70 p-4 text-[13px] shadow-sm ring-1 ring-primary-100 backdrop-blur sm:gap-4 sm:p-5">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-primary-700/70">
                    対応都市
                  </dt>
                  <dd className="mt-1 font-bold text-neutral-900">
                    パリ
                    <span className="ml-1 text-[10px] font-medium text-foreground/50">
                      / NYC・London Soon
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-primary-700/70">
                    記事
                  </dt>
                  <dd className="mt-1 font-bold tabular text-neutral-900">
                    {articles.length}
                    <span className="ml-0.5 text-[12px] font-medium text-foreground/60">
                      本
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-primary-700/70">
                    価格
                  </dt>
                  <dd className="mt-1 font-bold tabular text-neutral-900">
                    ¥600〜
                    <span className="ml-0.5 text-[12px] font-medium text-foreground/60">
                      1,500
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="relative aspect-cover overflow-hidden rounded-2xl shadow-md ring-1 ring-primary-100">
              <Image
                src="https://picsum.photos/seed/locore-hero/1200/800"
                alt="パリの路地裏のビストロ前で、地元の人が新聞を読みながらコーヒーを飲んでいる様子"
                fill
                className="object-cover"
                priority
                sizes="(min-width: 768px) 50vw, 100vw"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary-900/85 via-primary-900/40 to-transparent p-5">
                <p className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary-700">
                  Cover story
                </p>
                <p className="mt-2 text-[20px] font-bold leading-snug text-white">
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

        {/* Founders — emerald 単色のソフトバナー */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-50 via-white to-primary-50/40 p-8 shadow-sm ring-1 ring-primary-100 sm:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary-200/30 blur-3xl"
          />
          <div className="relative grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <p className="inline-flex items-center gap-1 rounded-full bg-primary-700 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                Founders 枠（先着 50 人）
              </p>
              <h2 className="mt-3 text-[28px] font-bold leading-[1.2] tracking-tight">
                Locore を一緒に育てる書き手、
                <br className="hidden md:block" />
                いま探してます。
              </h2>
              <p className="mt-4 text-[15px] leading-[1.9] text-neutral-700">
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
        <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-700">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-500" />
          {kicker}
        </p>
        <h2
          className="mt-2 text-[26px] font-bold leading-tight tracking-tight"
          style={{
            fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
          }}
        >
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-[13px] text-neutral-700">{subtitle}</p>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="hidden whitespace-nowrap rounded-full bg-white px-4 py-1.5 text-[13px] font-semibold text-primary-700 ring-1 ring-primary-100 transition hover:bg-primary-50 hover:ring-primary-300 sm:inline-flex"
        >
          すべて見る →
        </Link>
      ) : null}
    </div>
  );
}
