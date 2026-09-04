/**
 * エキスパートの「得意分野」統制リスト（2 階層）。
 * 根拠と設計ルールは docs/experts-specialty-taxonomy.md。
 *
 * - 第 1 階層（group）= 相談者の状況・目的。/experts のテーマ列とフィルタチップに使う。
 * - 第 2 階層（specialty）= 具体テーマ。カードのホバーとプロフィールに表示。
 *   同じテーマは 1 つの group にだけ置く。国・都市は別軸（country / city フィルタ）。
 * - users.specialties には第 2 階層の code を配列で保存（manual/0080）。
 * - 税金・資産・ビザ系は「体験談」に限定する注記を UI 側で出す（資格規制）。
 */

export type SpecialtyGroup = {
  code: string;
  label: string;
  /** Intro 型の列見出しの「薄い続き」。列にだけ使う */
  lede: string;
  children: ReadonlyArray<{ code: string; label: string; note?: 'experience_only' }>;
};

export const SPECIALTY_GROUPS: ReadonlyArray<SpecialtyGroup> = [
  {
    code: 'immigration',
    label: '移住・ビザ',
    lede: 'ビザ、国選び、段取り。「実際のところ」を住んでいる人に。',
    children: [
      { code: 'visa', label: 'ビザ・永住権', note: 'experience_only' },
      { code: 'country_choice', label: '国・都市選び' },
      { code: 'relocation_plan', label: '移住の段取り・準備' },
      { code: 'retirement', label: '老後移住・リタイア' },
      { code: 'family_visa', label: '国際結婚・家族の呼び寄せ', note: 'experience_only' },
      { code: 'returning', label: '本帰国の準備' },
    ],
  },
  {
    code: 'expat',
    label: '駐在・帯同',
    lede: '赴任準備から帯同家族の立ち上げ、帰任まで。経験者に。',
    children: [
      { code: 'assignment_prep', label: '赴任準備・引越し' },
      { code: 'expat_work', label: '駐在員の働き方・現地マネジメント' },
      { code: 'family_setup', label: '帯同家族の生活立ち上げ' },
      { code: 'spouse_career', label: '帯同配偶者のキャリア・就労' },
      { code: 'repatriation', label: '帰任・帰国後' },
    ],
  },
  {
    code: 'study_abroad',
    label: '留学',
    lede: '学校選びから費用、卒業後の進路まで。卒業した人に。',
    children: [
      { code: 'school_choice', label: '学校選び・出願' },
      { code: 'tuition', label: '費用・奨学金' },
      { code: 'language_school', label: '語学学校・英語力' },
      { code: 'housing_student', label: '滞在先（寮・ホームステイ）' },
      { code: 'post_grad', label: '卒業後の現地就職・ビザ' },
      { code: 'after_return', label: '帰国後の進路' },
    ],
  },
  {
    code: 'working_holiday',
    label: 'ワーホリ',
    lede: '最初の 3 か月の設計、仕事探し、住まい。やり切った人に。',
    children: [
      { code: 'first_3_months', label: '渡航準備・最初の3か月' },
      { code: 'job_hunt_wh', label: '仕事探し・レジュメ' },
      { code: 'sharehouse', label: '住まい（シェアハウス）' },
      { code: 'budget_wh', label: '資金計画' },
      { code: 'wh_next', label: '2か国目・その後のキャリア' },
    ],
  },
  {
    code: 'work',
    label: '仕事・起業',
    lede: '現地就職、ビザ、起業、フリーランス。現地で働いている人に。',
    children: [
      { code: 'local_job', label: '現地就職・転職' },
      { code: 'work_visa', label: '就労ビザ', note: 'experience_only' },
      { code: 'local_hire', label: '現地採用の待遇・労働環境' },
      { code: 'startup', label: '起業・現地法人' },
      { code: 'freelance', label: 'フリーランス・リモート副業' },
      { code: 'market_research', label: 'ビジネス視察・現地調査' },
    ],
  },
  {
    code: 'living',
    label: '暮らし・手続き',
    lede: '部屋探し、治安、役所・銀行。生活を立ち上げた人に。',
    children: [
      { code: 'rental', label: '部屋探し・賃貸契約' },
      { code: 'area_safety', label: 'エリア・治安' },
      { code: 'cost_of_living', label: '生活コスト' },
      { code: 'setup_admin', label: '役所・銀行・保険の初期手続き' },
      { code: 'car_license', label: '車・運転免許' },
      { code: 'moving_pets', label: '引越し・荷物・ペット' },
      { code: 'language_culture', label: '語学・文化適応' },
    ],
  },
  {
    code: 'childcare',
    label: '子育て・教育',
    lede: '出産、保育園、学校選び、日本語維持。いま子育て中の人に。',
    children: [
      { code: 'pregnancy', label: '妊娠・出産' },
      { code: 'daycare', label: '保育園・幼稚園' },
      { code: 'school_selection', label: '学校選び（現地校・日本人学校・インター）' },
      { code: 'japanese_retention', label: '日本語維持・補習校' },
      { code: 'returnee_exam', label: '帰国子女・受験' },
      { code: 'kids_life', label: '子連れの暮らし・習い事' },
    ],
  },
  {
    code: 'health_money',
    label: '医療・お金・こころ',
    lede: '病院、保険、税金・年金、メンタル。体験談ベースで。',
    children: [
      { code: 'medical', label: '医療機関・保険' },
      { code: 'tax_pension', label: '税金・年金・送金', note: 'experience_only' },
      { code: 'property', label: '不動産・資産', note: 'experience_only' },
      { code: 'mental', label: 'メンタル・孤独' },
      { code: 'elder_care', label: '介護・終活' },
    ],
  },
  {
    code: 'travel',
    label: '旅行',
    lede: 'プラン、穴場、移動、子連れ・シニア。地元の人に。',
    children: [
      { code: 'itinerary', label: 'プラン作成' },
      { code: 'local_tips', label: '穴場・ローカルの楽しみ方' },
      { code: 'transport', label: '交通・移動' },
      { code: 'family_senior_travel', label: '子連れ・シニア旅' },
      { code: 'long_stay', label: '長期滞在・ロングステイ' },
    ],
  },
];

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

/** 「体験談ベース」の注記が要る code か（税務・法務・投資助言と誤認されないため） */
export function isExperienceOnly(code: string): boolean {
  return noteByChild[code] === 'experience_only';
}

/**
 * 旧 TOPIC_TAGS（相談メニューの tags）→ 第 1 階層 code。
 * メニューにしか付いていないテーマも、一覧の列・フィルタで拾えるようにする。
 */
export const LEGACY_TOPIC_TO_GROUP: Record<string, string> = {
  immigration: 'immigration',
  study_abroad: 'study_abroad',
  expat_prep: 'expat',
  travel: 'travel',
  childcare: 'childcare',
  housing: 'living',
  work: 'work',
  procedures: 'living',
};

/**
 * 第 2 階層 code の配列 + メニュー tags から、その人が属する第 1 階層 code の集合を返す。
 * 一覧の列振り分けと group フィルタで使う。
 */
export function groupsOf(
  specialties: ReadonlyArray<string>,
  legacyTopics: ReadonlyArray<string> = [],
): Set<string> {
  const out = new Set<string>();
  for (const s of specialties) {
    const g = groupByChild[s];
    if (g) out.add(g.code);
  }
  for (const t of legacyTopics) {
    const g = LEGACY_TOPIC_TO_GROUP[t];
    if (g) out.add(g);
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
