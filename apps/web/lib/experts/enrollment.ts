import type { EducationEntry } from '@locore/db';

/**
 * 学歴（users.education）から「在学生 / アルムナイ」を導出する正式ヘルパ。
 * 一覧（lib/experts/list.ts の ExpertCard.enrollment）と詳細ページの両方が
 * この導出を使う（/experts 再デザイン側もここを import する約束）。
 */

export type Enrollment = {
  /** current=true の学歴が 1 件でもあれば 'current'（在学中） */
  status: 'current' | 'alumni';
  /** 在学中の学校名 / アルムナイの最新の卒業校 */
  school: string | null;
  /** アルムナイの卒業年（endYear の最大値）。在学中・年未記入は null */
  year: number | null;
};

/** 学歴が空（未記入）のときは null を返す。 */
export function deriveEnrollment(
  education: EducationEntry[] | null | undefined,
): Enrollment | null {
  const entries = (education ?? []).filter((e) => e.school?.trim());
  const current = entries.find((e) => e.current);
  if (current) {
    return { status: 'current', school: current.school, year: null };
  }
  // アルムナイ: endYear の最新（null は末尾）
  let latest: EducationEntry | null = null;
  for (const e of entries) {
    if (!latest || (e.endYear ?? -Infinity) > (latest.endYear ?? -Infinity)) {
      latest = e;
    }
  }
  if (!latest) return null;
  return { status: 'alumni', school: latest.school, year: latest.endYear ?? null };
}

/** '在学中' / '卒（2023）' / '卒' / ''（学歴なし）の短い表示ラベル */
export function enrollmentLabel(
  education: EducationEntry[] | null | undefined,
): string {
  const s = deriveEnrollment(education);
  if (!s) return '';
  if (s.status === 'current') return '在学中';
  return s.year != null ? `卒（${s.year}）` : '卒';
}
