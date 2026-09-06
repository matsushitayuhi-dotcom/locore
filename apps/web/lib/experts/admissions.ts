import type { AdmissionEntry, EducationEntry } from '@locore/db';
import { formatSchoolName } from '@/lib/experts/education';

/**
 * 「合格実績」の表示データ（0087）。
 *
 * 進学した学校 = users.education のうち applicationYear があるもの（enrolled=true）、
 * 進学しなかった合格校 = users.admissions。両方を出願年ごとにまとめ、新しい年から並べる。
 * 出願年が未記入の合格校は末尾の「年未記入」グループに入れる（education 側は出願年が
 * 無ければ合格実績に含めない＝経歴として既に出ているため）。
 */

export type AdmissionItem = {
  name: string;
  degree: string | null;
  /** 進学した学校（education 由来） */
  enrolled: boolean;
};

export type AdmissionYearGroup = {
  /** null = 出願年未記入 */
  year: number | null;
  items: AdmissionItem[];
};

export function groupAdmissions(
  education: EducationEntry[],
  admissions: AdmissionEntry[],
): AdmissionYearGroup[] {
  const map = new Map<number | null, AdmissionItem[]>();
  const push = (year: number | null, item: AdmissionItem) => {
    const list = map.get(year) ?? [];
    list.push(item);
    map.set(year, list);
  };
  for (const e of education) {
    if (!e.school?.trim() || e.applicationYear == null) continue;
    push(e.applicationYear, {
      name: formatSchoolName(e),
      degree: e.degree?.trim() || null,
      enrolled: true,
    });
  }
  for (const a of admissions) {
    if (!a.school?.trim()) continue;
    push(a.applicationYear ?? null, {
      name: formatSchoolName(a),
      degree: a.degree?.trim() || null,
      enrolled: false,
    });
  }
  return Array.from(map.entries())
    .map(([year, items]) => ({
      year,
      // 進学校を先頭に
      items: [...items].sort((x, y) => Number(y.enrolled) - Number(x.enrolled)),
    }))
    .sort((a, b) => {
      if (a.year == null) return 1;
      if (b.year == null) return -1;
      return b.year - a.year;
    });
}

/** 合格実績の総件数（セクション表示可否の判定用） */
export function countAdmissions(groups: AdmissionYearGroup[]): number {
  return groups.reduce((n, g) => n + g.items.length, 0);
}
