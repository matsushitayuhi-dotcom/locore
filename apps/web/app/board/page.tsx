import Link from 'next/link';
import { Sparkles, MapPin, ArrowLeft, Inbox } from 'lucide-react';
import { listBoardPosts } from '@/lib/board/db';
import {
  BOARD_CATEGORIES,
  BOARD_CATEGORY_LABEL,
  type BoardCategory,
  type BoardAudience,
} from '@/lib/board/constants';

export const revalidate = 60;

export const metadata = {
  title: 'パリ・新着ニュース',
  description:
    'パリの暮らしと滞在に役立つ新着情報を、編集チームと AI が日々まとめます。イベント・交通・行政・季節食材・コミュニティ・子育て・天候警報など。',
};

type Audience = BoardAudience | 'all';

type Props = {
  searchParams?: { category?: string; audience?: string };
};

/**
 * カテゴリラベルの色 (BoardWidget と /board の各行で共通)。
 * UAT 指摘で audience タブとカテゴリチップは UI から撤去し、各行の
 * カテゴリラベルだけで判別できるようにした。URL クエリ
 * (?category=, ?audience=) は後方互換のためサーバ側では受け取って
 * フィルタするが、UI には表示しない。
 */
const CHIP_COLOR: Record<string, string> = {
  event: 'bg-primary-500/15 text-primary-300',
  transit: 'bg-slate-500/15 text-slate-600',
  admin: 'bg-blue-500/15 text-blue-600',
  food_season: 'bg-amber-500/15 text-amber-700',
  community: 'bg-purple-500/15 text-purple-600',
  family_edu: 'bg-emerald-500/15 text-emerald-600',
  health_weather: 'bg-danger-500/15 text-danger-500',
};

export default async function BoardIndexPage({ searchParams }: Props) {
  // URL クエリは引き続き受け取るが、UI ではタブ / チップを出さない方針。
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
    limit: 30,
    categories: activeCat ? [activeCat] : undefined,
    audiences: activeAud === 'all' ? undefined : [activeAud],
  });

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
        >
          今日と明日
        </h1>
        <p className="mt-2 text-[14px] leading-[1.9] text-foreground/70">
          イベント、行政の締切、旬の食材、邦人コミュニティ、子育て、緊急時の天候警報。
          書き手と編集チームが日々更新します。
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-10 text-center text-[13px] text-foreground/65">
          <Inbox className="h-8 w-8 text-foreground/35" />
          <p className="text-[14px] font-medium text-foreground/75">
            新着情報はまだありません
          </p>
          <p className="text-[12px] text-foreground/55">
            新着は毎朝、現地時間の 7 時前後に更新します。
          </p>
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
                      </div>
                      <h2 className="text-[15px] font-bold leading-snug text-foreground">
                        {p.title}
                      </h2>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-foreground/60">
                        {(() => {
                          const range = formatEventRange(
                            p.eventStartDate ?? p.eventDate,
                            p.eventEndDate ?? p.eventDate,
                          );
                          return range ? (
                            <span className="rounded-full bg-primary-500/10 px-2 py-0.5 tabular font-semibold text-primary-300">
                              開催 {range}
                            </span>
                          ) : null;
                        })()}
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
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

/**
 * 期間表示: 単日なら「M/D」、複数日なら「M/D-M/D」。
 */
function formatEventRange(
  start: string | null,
  end: string | null,
): string | null {
  if (!start) return null;
  if (!end || start === end) return formatEventDate(start);
  return `${formatEventDate(start)}-${formatEventDate(end)}`;
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
