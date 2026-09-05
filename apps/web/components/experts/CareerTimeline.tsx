import { Briefcase, ChevronUp, GraduationCap } from 'lucide-react';
import type { EducationEntry, WorkEntry } from '@locore/db';
import { formatSchoolName } from '@/lib/experts/education';

/**
 * /experts/[id] の「経歴」タイムライン（学歴・職歴スライス）。
 *
 * 職歴・学歴をまとめて 1 本の時系列で表示（上 = いま、下 = 過去。線は下から上へ流れる）。各項目は丸アイコン
 * （Briefcase / GraduationCap）＋縦ライン、名称太字＋サブ行（役職 or 学位・専攻）、
 * 右端に期間（年未記入の項目は期間非表示）。
 * ソート: 現在（current）先頭 → endYear 降順 → startYear 降順（null は末尾）。
 * 両方空のときは親側でセクションごと出さない。
 */

type TimelineItem = {
  kind: 'work' | 'education';
  name: string;
  sub: string | null;
  period: string | null;
  current: boolean;
  startYear: number | null;
  endYear: number | null;
};

function periodOf(
  startYear: number | null | undefined,
  endYear: number | null | undefined,
  current: boolean,
): string | null {
  const s = startYear ?? null;
  const e = endYear ?? null;
  if (current) return s != null ? `${s}–現在` : '現在';
  if (s != null && e != null) return `${s}–${e}`;
  if (s != null) return `${s}–`;
  if (e != null) return `–${e}`;
  return null;
}

/** current 先頭 → endYear 降順 → startYear 降順（null 末尾） */
function sortItems(items: TimelineItem[]): TimelineItem[] {
  const numDesc = (a: number | null, b: number | null) => {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return b - a;
  };
  return [...items].sort((a, b) => {
    if (a.current !== b.current) return a.current ? -1 : 1;
    const e = numDesc(a.endYear, b.endYear);
    if (e !== 0) return e;
    return numDesc(a.startYear, b.startYear);
  });
}

export function CareerTimeline({
  workHistory,
  education,
  initialCount,
}: {
  workHistory: WorkEntry[];
  education: EducationEntry[];
  /** 最初に見せる件数。超えたぶんは <details>「残り N 件を表示」に畳む（縦長対策）。未指定は全件 */
  initialCount?: number;
}) {
  const work: TimelineItem[] = workHistory
    .filter((w) => w.company?.trim())
    .map((w) => ({
      kind: 'work',
      name: w.company,
      sub: w.title?.trim() || null,
      period: periodOf(w.startYear, w.endYear, !!w.current),
      current: !!w.current,
      startYear: w.startYear ?? null,
      endYear: w.endYear ?? null,
    }));
  const edu: TimelineItem[] = education
    .filter((e) => e.school?.trim())
    .map((e) => ({
      kind: 'education',
      // 正式名称（English）。大学マスタ経由の学歴は英語名も併記
      name: formatSchoolName(e),
      sub:
        [e.degree?.trim(), e.field?.trim()].filter(Boolean).join('・') || null,
      // 在学中（EducationEntry.current、留学特化）は「現在」として最上段に
      period: periodOf(e.startYear, e.endYear, !!e.current),
      current: !!e.current,
      startYear: e.startYear ?? null,
      endYear: e.endYear ?? null,
    }));

  // 職歴・学歴をまとめて 1 本の時系列に（現在 → 新しい順）。上が「いま」、下が過去。
  const items = sortItems([...work, ...edu]);
  if (items.length === 0) return null;

  const cut = initialCount != null && items.length > initialCount ? initialCount : items.length;
  const shown = items.slice(0, cut);
  const rest = items.slice(cut);

  const renderItems = (list: TimelineItem[], offset: number) =>
    list.map((item, j) => {
      const i = offset + j;
      const Icon = item.kind === 'work' ? Briefcase : GraduationCap;
      const now = item.current;
      return (
        <li key={`${item.kind}-${i}`} className="relative flex gap-[14px] pb-5 last:pb-0">
          <span
            className={
              'z-[1] grid h-[35px] w-[35px] shrink-0 place-items-center rounded-full border ' +
              (now
                ? 'border-primary-500 bg-primary-500 text-neutral-950'
                : 'border-border bg-card text-neutral-500')
            }
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-1 items-start gap-3 pt-1">
            <div className="min-w-0">
              <b className="block text-[14px] font-bold leading-snug">
                {item.name}
                {now ? (
                  <span className="ml-2 rounded-full bg-primary-100 px-2 py-px text-[10px] font-bold text-primary-900">
                    現在
                  </span>
                ) : null}
              </b>
              {item.sub ? (
                <span className="mt-0.5 block text-[12.5px] text-neutral-500">{item.sub}</span>
              ) : null}
            </div>
            {item.period ? (
              <span className="ml-auto shrink-0 pt-px text-[12px] tabular-nums text-neutral-500">
                {item.period}
              </span>
            ) : null}
          </div>
        </li>
      );
    });

  return (
    <div className="relative">
      {/* 時間の流れ: 下（過去）から上（いま）へ。線はライム（上）→ 罫線色（下）のグラデーション */}
      <span
        className="pointer-events-none absolute bottom-[18px] left-[17px] top-[18px] w-px bg-gradient-to-b from-primary-500 via-primary-200 to-border"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute -top-3 left-[10px] text-primary-700"
        aria-hidden
      >
        <ChevronUp className="h-[14px] w-[14px]" strokeWidth={3} />
      </span>
      <ol className="flex flex-col">{renderItems(shown, 0)}</ol>
      {rest.length > 0 ? (
        <details className="group">
          <summary className="ml-[49px] mt-4 inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-border-strong bg-card px-3.5 py-1.5 text-[12.5px] font-semibold text-neutral-700 transition hover:border-foreground [&::-webkit-details-marker]:hidden group-open:hidden">
            さらに前の経歴 {rest.length} 件を表示
          </summary>
          <ol className="flex flex-col pt-5">{renderItems(rest, shown.length)}</ol>
        </details>
      ) : null}
      <p className="ml-[49px] mt-4 text-[10.5px] text-neutral-400">
        上が現在、下が過去。※経歴は本人申告の情報です
      </p>
    </div>
  );
}
