import type { EducationEntry } from '@locore/db';

/**
 * 学歴（education）から「在学生 / アルムナイ」ステータスを導出する表示用ヘルパ。
 * 留学特化リポジショニング: エキスパート詳細やカードで
 * 「◯◯大学 在学中」「◯◯大学 卒（2023）」のような表示に使う
 * （/experts 側の見た目は別スライスで適用）。
 */

export type EnrollmentStatus = {
  /** current=true の学歴が 1 件でもあれば在学生 */
  enrolled: boolean;
  /** 在学中の学校名（enrolled=true のとき）/ 最新の卒業校（アルムナイのとき） */
  school: string | null;
  /** アルムナイの卒業年（endYear の最大値）。在学中・年未記入は null */
  graduationYear: number | null;
};

export function deriveEnrollment(
  education: EducationEntry[] | null | undefined,
): EnrollmentStatus {
  const entries = (education ?? []).filter((e) => e.school?.trim());
  const current = entries.find((e) => e.current);
  if (current) {
    return { enrolled: true, school: current.school, graduationYear: null };
  }
  // アルムナイ: endYear の最新（null は末尾）
  let latest: EducationEntry | null = null;
  for (const e of entries) {
    if (
      !latest ||
      (e.endYear ?? -Infinity) > (latest.endYear ?? -Infinity)
    ) {
      latest = e;
    }
  }
  if (!latest) return { enrolled: false, school: null, graduationYear: null };
  return {
    enrolled: false,
    school: latest.school,
    graduationYear: latest.endYear ?? null,
  };
}

/** '在学中' / '卒（2023）' / '' の短い表示ラベル */
export function enrollmentLabel(
  education: EducationEntry[] | null | undefined,
): string {
  const s = deriveEnrollment(education);
  if (s.enrolled) return '在学中';
  if (s.school) {
    return s.graduationYear != null ? `卒（${s.graduationYear}）` : '卒';
  }
  return '';
}
