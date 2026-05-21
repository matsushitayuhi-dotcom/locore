import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import type { BoardPostListItem } from '@/lib/board/db';
import {
  BOARD_CATEGORY_LABEL,
  type BoardCategory,
} from '@/lib/board/constants';

/**
 * 掲示板ウィジェット (コンパクト版)。
 *
 * UAT 指摘で説明・場所などのメタ行を撤去、タイトル + 行頭カテゴリラベルの
 * 一覧に。上位 5 件まで表示し、行高を詰めて縦幅をタイトに。
 * - AI 自動投稿: 紫 Sparkles、それ以外: terra ドット
 * - 各行クリックで /board/[id] へ
 * - イベント日付があれば右端に M/D を小さく表示 (情報密度の妥協点)
 * - タイトル左に【イベント】【交通】等のカテゴリラベルを表示し、
 *   ユーザーが行ごとに情報種別を一目で判別できるようにする
 */
const DEFAULT_LIMIT = 5;

/** カテゴリラベルの色 (BoardWidget / /board 両方で使う) */
const CATEGORY_LABEL_COLOR: Record<BoardCategory, string> = {
  event: 'bg-primary-500/15 text-primary-300',
  transit: 'bg-slate-500/15 text-slate-600',
  admin: 'bg-blue-500/15 text-blue-600',
  food_season: 'bg-amber-500/15 text-amber-700',
  community: 'bg-purple-500/15 text-purple-600',
  family_edu: 'bg-emerald-500/15 text-emerald-600',
  health_weather: 'bg-danger-500/15 text-danger-500',
};

export function BoardWidget({
  posts,
  limit = DEFAULT_LIMIT,
}: {
  posts: BoardPostListItem[];
  limit?: number;
}) {
  const visible = posts.slice(0, limit);
  if (visible.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-3 text-center text-[11px] text-foreground/55">
        今朝はまだ更新がありません
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg bg-card ring-1 ring-border">
      <header className="flex items-center justify-between border-b border-border bg-primary-500/10 px-3 py-1.5">
        <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary-300">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-500" />
          新着ニュース
        </p>
        <Link
          href="/board"
          className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary-300 hover:underline"
        >
          すべて見る
          <ArrowRight className="h-3 w-3" />
        </Link>
      </header>
      <ul className="divide-y divide-border">
        {visible.map((p) => {
          const cat = p.category as BoardCategory;
          const catLabel = BOARD_CATEGORY_LABEL[cat];
          const catColor =
            CATEGORY_LABEL_COLOR[cat] ?? 'bg-foreground/10 text-foreground/65';
          return (
          <li key={p.id}>
            <Link
              href={`/board/${p.id}`}
              className="flex items-center gap-2 px-3 py-1.5 transition hover:bg-primary-500/10"
            >
              <span className="shrink-0">
                {p.autoCollected ? (
                  <Sparkles className="h-3 w-3 text-accent-500" />
                ) : (
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary-500" />
                )}
              </span>
              {catLabel ? (
                <span
                  className={`shrink-0 rounded-sm px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider ${catColor}`}
                  aria-label={`カテゴリ: ${catLabel}`}
                >
                  {catLabel}
                </span>
              ) : null}
              <p className="line-clamp-1 min-w-0 flex-1 text-[12px] font-medium leading-snug text-foreground">
                {p.title}
              </p>
              {(() => {
                const range = formatEventRange(
                  p.eventStartDate ?? p.eventDate,
                  p.eventEndDate ?? p.eventDate,
                );
                return range ? (
                  <span className="shrink-0 tabular text-[10px] font-semibold text-primary-300">
                    {range}
                  </span>
                ) : null;
              })()}
            </Link>
          </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatEventDate(d: string) {
  const date = new Date(d.length === 10 ? d + 'T00:00:00Z' : d);
  if (isNaN(date.getTime())) return d;
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

/**
 * start と end が同値なら「M/D」、違えば「M/D-M/D」。両方 NULL なら null。
 */
function formatEventRange(
  start: string | null,
  end: string | null,
): string | null {
  if (!start) return null;
  if (!end || start === end) return formatEventDate(start);
  return `${formatEventDate(start)}-${formatEventDate(end)}`;
}
