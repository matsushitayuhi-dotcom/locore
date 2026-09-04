import { TOPIC_TAGS } from './constants';

/**
 * エキスパートの「得意分野」統制リスト（2 階層）— 海外留学 超特化版。
 *
 * - 第 1 階層（group）= 相談テーマ TOPIC_TAGS（lib/experts/constants.ts）と **同じ code**。
 *   相談メニューの tags と、プロフィールの得意分野の親が一致するので、
 *   一覧の列・フィルタは「メニューの tags ∪ 得意分野の親」で判定できる。
 *   ラベル・順序は constants.ts が正。ここではハードコードしない。
 * - 第 2 階層（specialty）= 留学の具体テーマ。カードのホバーとプロフィールに表示。
 *   同じテーマは 1 つの group にだけ置く。国・都市・学校は別軸。
 * - users.specialties には第 2 階層の code を配列で保存（manual/0080）。
 * - ビザ・お金まわりは「体験談」に限定する注記を UI 側で出す（資格規制）。
 *
 * 経緯: 当初は移住・駐在・旅行を含む 9×51 だったが、ビーチヘッドを「海外留学」に
 * 確定したため（docs/experts-specialty-taxonomy.md 5 章）、留学に絞って再構成。
 */

type Child = { code: string; label: string; note?: 'experience_only' };

/** 第 1 階層（TOPIC_TAGS の value）→ 第 2 階層。TOPIC_TAGS に無い key は無視される */
const CHILDREN_BY_GROUP: Record<string, ReadonlyArray<Child>> = {
  grad_school: [
    { code: 'sop_research_plan', label: '志望理由書・研究計画書' },
    { code: 'recommendation', label: '推薦状の頼み方' },
    { code: 'professor_contact', label: '教授へのコンタクト' },
    { code: 'gre_gmat', label: 'GRE・GMAT 対策' },
    { code: 'school_list', label: '学校リストの作り方' },
  ],
  mba: [
    { code: 'mba_essay', label: 'MBA エッセイ' },
    { code: 'mba_test', label: 'GMAT・GRE（MBA）' },
    { code: 'mba_career', label: 'キャリア・職務経歴の整理' },
    { code: 'mba_scholarship', label: 'MBA の費用・奨学金' },
    { code: 'post_mba', label: 'ポスト MBA の就職' },
  ],
  undergrad: [
    { code: 'sat_ib', label: 'SAT・ACT・IB' },
    { code: 'extracurricular', label: '課外活動・アピール' },
    { code: 'college_list', label: 'カレッジ選び・ランキングの読み方' },
    { code: 'common_app', label: 'Common App・UCAS など出願手続き' },
    { code: 'transfer', label: '編入・コミカレからの進学' },
  ],
  language_exchange: [
    { code: 'language_school_choice', label: '語学学校選び' },
    { code: 'exchange_credits', label: '交換留学の単位・手続き' },
    { code: 'short_term', label: '短期・サマープログラム' },
    { code: 'pathway', label: '語学→進学（進学準備コース）' },
  ],
  application_docs: [
    { code: 'essay_writing', label: 'エッセイの書き方・添削' },
    { code: 'cv_resume', label: 'CV・レジュメ' },
    { code: 'portfolio', label: 'ポートフォリオ（芸術・デザイン）' },
    { code: 'english_test', label: '英語試験（IELTS・TOEFL）' },
  ],
  interview: [
    { code: 'interview_practice', label: '模擬面接' },
    { code: 'interview_english', label: '英語面接のコツ' },
    { code: 'motivation', label: '志望動機の組み立て' },
  ],
  funding: [
    { code: 'scholarships', label: '奨学金（JASSO・大学奨学金など）', note: 'experience_only' },
    { code: 'budget', label: '学費・生活費の実額' },
    { code: 'loans', label: '教育ローン・資金計画', note: 'experience_only' },
    { code: 'ta_ra', label: 'TA・RA・学内アルバイト' },
  ],
  campus_life: [
    { code: 'student_housing', label: '住まい（寮・シェア）' },
    { code: 'student_visa', label: '学生ビザ・入国', note: 'experience_only' },
    { code: 'health_insurance', label: '医療・保険' },
    { code: 'setup', label: '銀行・携帯・初期手続き' },
    { code: 'campus_culture', label: 'キャンパス文化・友人づくり' },
    { code: 'safety_city', label: '治安・都市の暮らし' },
  ],
  majors_labs: [
    { code: 'major_choice', label: '専攻選び' },
    { code: 'lab_choice', label: '研究室・指導教員選び' },
    { code: 'career_path', label: '卒業後の進路（就職・博士）' },
    { code: 'internship', label: 'インターン・Co-op' },
  ],
};

/** 一覧の列見出しの「薄い続き」（Intro 型）。無い group は空文字 */
const LEDE_BY_GROUP: Record<string, string> = {
  grad_school: '研究計画書、推薦状、教授とのやり取り。合格した先輩に。',
  mba: 'エッセイ、GMAT、その後のキャリア。在学生・卒業生に。',
  undergrad: 'テスト、課外活動、カレッジ選び。学部で学んだ人に。',
  language_exchange: '学校選び、単位、短期プログラム。行ってきた人に。',
  application_docs: 'エッセイ、CV、ポートフォリオ。通った書類を知る人に。',
  interview: '模擬面接、英語面接、志望動機。面接を越えた人に。',
  funding: '奨学金、学費・生活費の実額、資金計画。体験談ベースで。',
  campus_life: '住まい、ビザ、医療、キャンパスの空気。いま現地にいる人に。',
  majors_labs: '専攻、研究室、卒業後の進路。中から見ている人に。',
};

export type SpecialtyGroup = {
  code: string;
  label: string;
  lede: string;
  children: ReadonlyArray<Child>;
};

/** 第 1 階層は TOPIC_TAGS の順序・ラベルに従う */
export const SPECIALTY_GROUPS: ReadonlyArray<SpecialtyGroup> = TOPIC_TAGS.map((t) => ({
  code: t.value,
  label: t.label,
  lede: LEDE_BY_GROUP[t.value] ?? '',
  children: CHILDREN_BY_GROUP[t.value] ?? [],
}));

/** プロフィールで選べる第 2 階層の上限 */
export const MAX_SPECIALTIES = 6;
/** 同時に持てる第 1 階層の上限 */
export const MAX_SPECIALTY_GROUPS = 3;

const groupByChild: Record<string, SpecialtyGroup> = {};
const labelByChild: Record<string, string> = {};
const noteByChild: Record<string, 'experience_only'> = {};
for (const g of SPECIALTY_GROUPS) {
  for (const c of g.children) {
    groupByChild[c.code] = g;
    labelByChild[c.code] = c.label;
    if (c.note) noteByChild[c.code] = c.note;
  }
}

export const SPECIALTY_CODES: ReadonlyArray<string> = Object.keys(labelByChild);
export const SPECIALTY_GROUP_CODES: ReadonlyArray<string> = SPECIALTY_GROUPS.map(
  (g) => g.code,
);

export function isSpecialtyCode(code: string): boolean {
  return code in labelByChild;
}

export function specialtyLabel(code: string): string {
  return labelByChild[code] ?? code;
}

export function specialtyGroupOf(code: string): SpecialtyGroup | null {
  return groupByChild[code] ?? null;
}

export function specialtyGroup(groupCode: string): SpecialtyGroup | null {
  return SPECIALTY_GROUPS.find((g) => g.code === groupCode) ?? null;
}

/** 「体験談ベース」の注記が要る code か（法務・金融助言と誤認されないため） */
export function isExperienceOnly(code: string): boolean {
  return noteByChild[code] === 'experience_only';
}

/**
 * 第 2 階層 code の配列 + 相談メニューの tags から、その人が属する第 1 階層 code の集合。
 * メニューの tags は第 1 階層 code そのもの（TOPIC_TAGS）なので、そのまま採用する。
 * 一覧の列振り分けと topic フィルタで使う。
 */
export function groupsOf(
  specialties: ReadonlyArray<string>,
  menuTags: ReadonlyArray<string> = [],
): Set<string> {
  const out = new Set<string>();
  for (const s of specialties) {
    const g = groupByChild[s];
    if (g) out.add(g.code);
  }
  for (const t of menuTags) {
    if (SPECIALTY_GROUP_CODES.includes(t)) out.add(t);
  }
  return out;
}

/**
 * 入力（フォーム等）を正規化: 未知の code を落とし、重複を除き、上限を適用。
 * 第 1 階層が MAX_SPECIALTY_GROUPS を超える場合は超過分（後ろ）を落とす。
 */
export function normalizeSpecialties(input: ReadonlyArray<string>): string[] {
  const seen = new Set<string>();
  const groups = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const code = String(raw).trim();
    if (!isSpecialtyCode(code) || seen.has(code)) continue;
    const g = groupByChild[code]!.code;
    if (!groups.has(g) && groups.size >= MAX_SPECIALTY_GROUPS) continue;
    seen.add(code);
    groups.add(g);
    out.push(code);
    if (out.length >= MAX_SPECIALTIES) break;
  }
  return out;
}

/**
 * 在学 / アルムナイの導出（team-lead 側ヘルパが来るまでの暫定）。
 * EducationEntry に current フラグが付く予定なので、それがあれば「在学中」。
 * 無ければ最新の卒業年から「アルムナイ」。学歴が無ければ null。
 */
export type EnrollmentStatus = {
  status: 'current' | 'alumni';
  school: string | null;
  /** 卒業年（アルムナイのみ） */
  year: number | null;
};

export function deriveEnrollment(
  education: ReadonlyArray<{
    school?: string | null;
    endYear?: number | null;
    current?: boolean | null;
  }>,
): EnrollmentStatus | null {
  const rows = education.filter((e) => e.school?.trim());
  if (rows.length === 0) return null;
  const current = rows.find((e) => e.current);
  if (current) return { status: 'current', school: current.school ?? null, year: null };
  const latest = [...rows].sort((a, b) => (b.endYear ?? 0) - (a.endYear ?? 0))[0]!;
  return { status: 'alumni', school: latest.school ?? null, year: latest.endYear ?? null };
}
