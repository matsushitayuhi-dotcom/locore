import { Briefcase, GraduationCap } from 'lucide-react';
import type { EducationEntry, WorkEntry } from '@locore/db';

/**
 * /experts/[id] の「経歴」タイムライン（学歴・職歴スライス）。
 *
 * 職歴 → 学歴の順に 1 本のリストで表示。各項目は丸アイコン
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
      name: e.school,
      sub:
        [e.degree?.trim(), e.field?.trim()].filter(Boolean).join('・') || null,
      period: periodOf(e.startYear, e.endYear, false),
      current: false,
      startYear: e.startYear ?? null,
      endYear: e.endYear ?? null,
    }));

  // 職歴 → 学歴の順に 1 本のリスト（各グループ内でソート）
  const items = [...sortItems(work), ...sortItems(edu)];
  if (items.length === 0) return null;

  const cut = initialCount != null && items.length > initialCount ? initialCount : items.length;
  const shown = items.slice(0, cut);
  const rest = items.slice(cut);

  const renderItems = (list: TimelineItem[], offset: number) =>
    list.map((item, j) => {
      const i = offset + j;
      const last = i === items.length - 1;
      const Icon = item.kind === 'work' ? Briefcase : GraduationCap;
      return (
        <li
          key={`${item.kind}-${i}`}
          className={'relative flex gap-[14px]' + (last ? '' : ' pb-5')}
        >
          {!last ? (
            <span
              className="absolute bottom-0.5 left-[17px] top-[40px] w-px bg-border"
              aria-hidden
            />
          ) : null}
          <span className="z-[1] grid h-[35px] w-[35px] shrink-0 place-items-center rounded-full border border-primary-100 bg-primary-50 text-primary-700">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-1 items-start gap-3 pt-1">
            <div className="min-w-0">
              <b className="block text-[14px] font-bold leading-snug">{item.name}</b>
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
    <div>
      <ol className="flex flex-col">{renderItems(shown, 0)}</ol>
      {rest.length > 0 ? (
        <details className="group">
          <summary className="mt-1 inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-border-strong px-3.5 py-1.5 text-[12.5px] font-semibold text-neutral-700 transition hover:border-foreground [&::-webkit-details-marker]:hidden group-open:hidden">
            残り {rest.length} 件の経歴を表示
          </summary>
          <ol className="flex flex-col pt-5">{renderItems(rest, shown.length)}</ol>
        </details>
      ) : null}
      <p className="mt-4 text-[10.5px] text-neutral-400">※経歴は本人申告の情報です</p>
    </div>
  );
}
