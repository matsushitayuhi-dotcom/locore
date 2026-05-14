import Link from 'next/link';
import { Sparkles, MapPin, ArrowLeft } from 'lucide-react';
import { listBoardPosts } from '@/lib/board/db';
import {
  BOARD_CATEGORIES,
  BOARD_CATEGORY_LABEL,
  BOARD_CATEGORY_HINT,
  type BoardCategory,
  type BoardAudience,
} from '@/lib/board/constants';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'パリ・新着ニュース',
  description:
    'パリの暮らしと滞在に役立つ新着情報を、編集チームと AI が日々まとめます。イベント・交通・行政・季節食材・コミュニティ・子育て・天候警報など。',
};

type Audience = BoardAudience | 'all';

type Props = {
  searchParams?: { category?: string; audience?: string };
};

const AUDIENCE_TABS: { id: Audience; label: string }[] = [
  { id: 'all', label: 'すべて' },
  { id: 'traveler', label: '旅行者向け' },
  { id: 'resident', label: '駐在員向け' },
];

const CHIP_COLOR: Record<string, string> = {
  event: 'bg-primary-500/10 text-primary-300',
  transit: 'bg-slate-500/10 text-slate-600',
  admin: 'bg-blue-500/10 text-blue-600',
  food_season: 'bg-amber-500/10 text-amber-700',
  community: 'bg-purple-500/10 text-purple-600',
  family_edu: 'bg-emerald-500/10 text-emerald-600',
  health_weather: 'bg-danger-500/10 text-danger-500',
};

export default async function BoardIndexPage({ searchParams }: Props) {
  const activeCat =
    (searchParams?.category as BoardCategory | undefined) &&
    BOARD_CATEGORIES.includes(searchParams?.category as BoardCategory)
      ? (searchParams!.category as BoardCategory)
      : undefined;

  const activeAud: Audience =
    searchParams?.audience === 'traveler'
      ? 'traveler'
      : searchParams?.audience === 'resident'
        ? 'resident'
        : 'all';

  const posts = await listBoardPosts({
    limit: 60,
    categories: activeCat ? [activeCat] : undefined,
    audiences: activeAud === 'all' ? undefined : [activeAud],
  });

  const buildHref = (
    nextCat?: BoardCategory,
    nextAud?: Audience,
  ): string => {
    const params = new URLSearchParams();
    const c = nextCat ?? activeCat;
    const a = nextAud ?? activeAud;
    if (c) params.set('category', c);
    if (a && a !== 'all') params.set('audience', a);
    const qs = params.toString();
    return qs ? `/board?${qs}` : '/board';
  };

  return (
    <main className="mx-auto max-w-screen-md px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        ホームに戻る
      </Link>

      <header className="mt-4 mb-6">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-500" />
          新着ニュース
        </p>
        <h1
          className="mt-2 text-[30px] font-bold leading-tight tracking-tight"
          style={{
            fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
          }}
        >
          パリの、今日と明日。
        </h1>
        <p className="mt-2 text-[14px] leading-[1.9] text-foreground/70">
          イベント、行政の締切、旬の食材、邦人コミュニティ、子育て、緊急時の天候警報。
          書き手と編集チームが日々更新します。
        </p>
      </header>

      {/* 対象切替（旅行者 / 駐在員 / すべて） */}
      <div
        role="tablist"
        aria-label="対象読者で絞り込み"
        className="mb-3 flex flex-wrap items-center gap-1.5"
      >
        {AUDIENCE_TABS.map((t) => {
          const on = t.id === activeAud;
          return (
            <Link
              key={t.id}
              href={buildHref(undefined, t.id)}
              role="tab"
              aria-selected={on}
              className={
                'inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-medium transition ' +
                (on
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-background text-foreground/70 hover:border-foreground/30')
              }
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* カテゴリタブ */}
      <div
        role="tablist"
        aria-label="カテゴリで絞り込み"
        className="mb-6 flex flex-wrap items-center gap-1.5"
      >
        <Link
          href={buildHref(undefined, undefined).replace(/[?&]category=[^&]*/, '')}
          role="tab"
          aria-selected={!activeCat}
          className={
            'rounded-full px-3 py-1 text-[11px] font-semibold transition ' +
            (!activeCat
              ? 'bg-primary-500 text-neutral-950'
              : 'bg-primary-500/10 text-primary-300 hover:bg-primary-500/15')
          }
        >
          すべて
        </Link>
        {BOARD_CATEGORIES.map((cat) => {
          const on = cat === activeCat;
          return (
            <Link
              key={cat}
              href={buildHref(cat, undefined)}
              role="tab"
              aria-selected={on}
              title={BOARD_CATEGORY_HINT[cat]}
              className={
                'rounded-full px-3 py-1 text-[11px] font-semibold transition ' +
                (on
                  ? 'bg-primary-500 text-neutral-950'
                  : 'bg-primary-500/10 text-primary-300 hover:bg-primary-500/15')
              }
            >
              {BOARD_CATEGORY_LABEL[cat]}
            </Link>
          );
        })}
      </div>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-[13px] text-foreground/55">
          {activeCat
            ? `「${BOARD_CATEGORY_LABEL[activeCat]}」の投稿はまだありません`
            : '今はまだ投稿がありません。毎朝、現地時間の 7 時前後に更新します。'}
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => {
            const cat = p.category as BoardCategory;
            const chipColor =
              CHIP_COLOR[cat] ?? 'bg-foreground/10 text-foreground/65';
            return (
              <li key={p.id}>
                <Link
                  href={`/board/${p.id}`}
                  className="block rounded-lg bg-card p-4 ring-1 ring-border transition hover:bg-primary-500/10 hover:ring-primary-300"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-1 shrink-0">
                      {p.autoCollected ? (
                        <Sparkles className="h-4 w-4 text-accent-500" />
                      ) : (
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary-500" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${chipColor}`}
                        >
                          {BOARD_CATEGORY_LABEL[cat] ?? cat}
                        </span>
                        {p.audience === 'traveler' ? (
                          <span className="rounded-sm bg-accent-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent-500">
                            旅行者向け
                          </span>
                        ) : null}
                      </div>
                      <h2 className="text-[15px] font-bold leading-snug text-foreground">
                        {p.title}
                      </h2>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-foreground/60">
                        {p.eventDate ? (
                          <span className="rounded-full bg-primary-500/10 px-2 py-0.5 tabular font-semibold text-primary-300">
                            開催 {formatEventDate(p.eventDate)}
                          </span>
                        ) : null}
                        {p.eventLocation ? (
                          <span className="inline-flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />
                            {p.eventLocation}
                          </span>
                        ) : null}
                        <span className="text-foreground/40">
                          {formatPublishedAt(p.publishedAt)}
                        </span>
                        {p.autoCollected ? (
                          <span className="ml-auto rounded-sm bg-accent-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent-500">
                            AI 自動
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function formatEventDate(d: string) {
  const date = new Date(d.length === 10 ? d + 'T00:00:00Z' : d);
  if (isNaN(date.getTime())) return d;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatPublishedAt(d: string) {
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const h = Math.floor(diffMs / (1000 * 60 * 60));
  if (h < 1) return 'たった今';
  if (h < 24) return `${h}時間前`;
  const day = Math.floor(h / 24);
  return `${day}日前`;
}
