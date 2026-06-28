/**
 * コミュニティ投稿の種別・メタデータ・ラベル定数。
 *
 * UI / Server Action / 型推論の全てがここを参照する。
 */

import { z } from 'zod';

// =============================================================================
// 種別
// =============================================================================

// 並び順は「住居 → モノ → 仕事 → コト → スキル → 助け合い」というユーザー
// 主導の暮らしの優先度順。グローバルナビ・CommunityNav・/expat ホームは
// この配列の順序を参照しているため、ここを変えるだけで全体が並び替わる。
export const COMMUNITY_KINDS = [
  'apartment',
  'marketplace',
  'job',
  'group',
  'lesson',
  'mutual_aid',
] as const;
export type CommunityKind = (typeof COMMUNITY_KINDS)[number];

export const KIND_LABEL: Record<CommunityKind, string> = {
  job: '求人',
  // ミニマリスト改修: スマホ幅でピル列が 1 行に収まるよう、すべて 2 文字以内に統一。
  apartment: '住居',
  // スマホ幅でカテゴリピル列が 1 行に収まるよう短縮。詳細ページの h1 / kicker は
  // 各 page.tsx 側でフルラベル「売ります・買います」を直接書いている。
  marketplace: '売買',
  // DB の kind は 'group' のまま (English ID は不変) だが、UI 表示は「集まり」に統一。
  group: '集まり',
  // 同上。/lessons の h1 / kicker は「教えます・習います」をフル表示。
  lesson: '習う',
  mutual_aid: '助け',
};

export const KIND_DESCRIPTION: Record<CommunityKind, string> = {
  job: '日系企業・現地企業の求人、副業案件、家庭教師、ベビーシッターなど',
  apartment: '日本人歓迎の物件、シェア、家具付き短期、サブレ、引越し時の譲渡',
  marketplace: '帰任セール、家具家電、車、子供用品。物を介して住人が繋がる場所',
  group: 'ママ友会、テニス・ランニング仲間、勉強会、言語交換',
  lesson: '子供向け日本語、フランス語家庭教師、料理、楽器。短時間から',
  mutual_aid: '空港送迎、書類のフランス語翻訳、こどもの一時預かりなど小さな相互扶助',
};

export const KIND_BASE_PATH: Record<CommunityKind, string> = {
  job: '/jobs',
  apartment: '/apartments',
  marketplace: '/marketplace',
  group: '/groups',
  lesson: '/lessons',
  mutual_aid: '/help',
};

export const COMMUNITY_STATUSES = ['active', 'closed', 'expired'] as const;
export type CommunityStatus = (typeof COMMUNITY_STATUSES)[number];

export const STATUS_LABEL: Record<CommunityStatus, string> = {
  active: '募集中',
  closed: '締切',
  expired: '期限切れ',
};

// =============================================================================
// 対象者 (audience) — 旅行者向け / 駐在員向け / 両方
// =============================================================================

export const COMMUNITY_AUDIENCES = ['traveler', 'resident', 'both'] as const;
export type CommunityAudience = (typeof COMMUNITY_AUDIENCES)[number];

export const AUDIENCE_LABEL: Record<CommunityAudience, string> = {
  traveler: '旅行者向け',
  resident: '駐在員向け',
  both: '両方',
};

export const AUDIENCE_SHORT_LABEL: Record<CommunityAudience, string> = {
  traveler: '短期',
  resident: '長期',
  both: '両方',
};

/** audience の zod スキーマ (metadata に共通で含まれる) */
export const audienceSchema = z.enum(COMMUNITY_AUDIENCES).optional();

// =============================================================================
// 金額の単位
// =============================================================================

export const PRICE_UNITS = [
  'monthly',
  'hourly',
  'annual',
  'fixed',
  'per_session',
  'negotiable',
] as const;
export type PriceUnit = (typeof PRICE_UNITS)[number];

export const PRICE_UNIT_LABEL: Record<PriceUnit, string> = {
  monthly: '月額',
  hourly: '時給',
  annual: '年収',
  fixed: '一括',
  per_session: '1回あたり',
  negotiable: '応相談',
};

// =============================================================================
// 求人 (job)
// =============================================================================

export const JOB_EMPLOYMENT_TYPES = [
  'full_time',
  'part_time',
  'contract',
  'freelance',
  'internship',
  'casual',
] as const;
export type JobEmploymentType = (typeof JOB_EMPLOYMENT_TYPES)[number];

export const JOB_EMPLOYMENT_TYPE_LABEL: Record<JobEmploymentType, string> = {
  full_time: '正社員',
  part_time: 'パート / アルバイト',
  contract: '契約社員 / 業務委託',
  freelance: 'フリーランス',
  internship: 'インターン',
  casual: 'スポット / 単発',
};

export const JOB_CATEGORIES = [
  'office',
  'restaurant_hotel',
  'translation',
  'teaching',
  'childcare',
  'beauty_health',
  'creative',
  'it',
  'sales',
  'other',
] as const;
export type JobCategory = (typeof JOB_CATEGORIES)[number];

export const JOB_CATEGORY_LABEL: Record<JobCategory, string> = {
  office: 'オフィス・事務',
  restaurant_hotel: '飲食・ホテル',
  translation: '翻訳・通訳',
  teaching: '教育・講師',
  childcare: '保育・育児',
  beauty_health: '美容・健康',
  creative: 'クリエイティブ',
  it: 'IT・エンジニア',
  sales: '営業・接客',
  other: 'その他',
};

// --- 契約形態 (フランスの労働契約。employment_type とは別軸) ---
export const JOB_CONTRACT_TYPES = [
  'cdi',
  'cdd',
  'interim',
  'stage',
  'apprentissage',
  'freelance',
  'other',
] as const;
export type JobContractType = (typeof JOB_CONTRACT_TYPES)[number];

export const JOB_CONTRACT_TYPE_LABEL: Record<JobContractType, string> = {
  cdi: '正社員（CDI・無期）',
  cdd: '契約社員（CDD・有期）',
  interim: '派遣（Intérim）',
  stage: 'インターン（Stage）',
  apprentissage: '見習い（Apprentissage）',
  freelance: 'フリーランス',
  other: 'その他',
};

// --- 業種 ---
export const JOB_INDUSTRIES = [
  'tech',
  'finance',
  'hospitality',
  'education',
  'manufacturing',
  'retail',
  'public',
  'logistics',
  'other',
] as const;
export type JobIndustry = (typeof JOB_INDUSTRIES)[number];

export const JOB_INDUSTRY_LABEL: Record<JobIndustry, string> = {
  tech: 'IT・テクノロジー',
  finance: '金融・コンサル',
  hospitality: '飲食・宿泊・観光',
  education: '教育',
  manufacturing: '製造業',
  retail: '小売・販売',
  public: '公共・団体',
  logistics: '物流・貿易',
  other: 'その他',
};

// --- リモート形態 ---
export const JOB_REMOTE_TYPES = ['onsite', 'hybrid', 'remote'] as const;
export type JobRemoteType = (typeof JOB_REMOTE_TYPES)[number];

export const JOB_REMOTE_TYPE_LABEL: Record<JobRemoteType, string> = {
  onsite: '出社',
  hybrid: 'ハイブリッド',
  remote: 'フルリモート',
};

// --- 給与の種別 (額面 / 手取り) ---
export type JobSalaryKind = 'gross' | 'net';
export const JOB_SALARY_KIND_LABEL: Record<JobSalaryKind, string> = {
  gross: '額面',
  net: '手取り',
};

// --- 語学レベル (5 段階メーター用) ---
export const JOB_LANGUAGE_LEVELS = [
  'native',
  'business',
  'intermediate',
  'basic',
] as const;
export type JobLanguageLevel = (typeof JOB_LANGUAGE_LEVELS)[number];

export const JOB_LANGUAGE_LEVEL_LABEL: Record<JobLanguageLevel, string> = {
  native: 'ネイティブ',
  business: 'ビジネス',
  intermediate: '中級',
  basic: '初級',
};

/** メーターの点灯数 (native=5 … basic=2)。0 は表示しない */
export const JOB_LANGUAGE_LEVEL_METER: Record<JobLanguageLevel, number> = {
  native: 5,
  business: 4,
  intermediate: 3,
  basic: 2,
};

// --- 日本語要件 ---
export type JobJapaneseOk = 'required' | 'preferred' | 'not_required';
export const JOB_JAPANESE_OK_LABEL: Record<JobJapaneseOk, string> = {
  required: '日本語必須',
  preferred: '日本語歓迎',
  not_required: '日本語不問',
};

/**
 * 福利厚生の一覧。詳細ページ・エディタで共用する「キー ⇔ 日本語ラベル」の写像。
 *
 * - DB では community_posts.metadata.benefits (jsonb の string[]) に key 配列で保存。
 *   ALTER TABLE は不要 (実カラム化しない / 住居の amenities とは別保存)。
 * - icon は JobDetail.tsx の BenIc に対応するインライン SVG のキー。
 *   未定義はチェックアイコンにフォールバックする。
 *
 * 配列順がそのまま詳細ページのチェックリスト表示順になる。
 */
export const JOB_BENEFITS = [
  { key: 'social_insurance', label: '社会保険完備', icon: 'shield' },
  { key: 'transport', label: '交通費補助', icon: 'card' },
  { key: 'paid_leave', label: '有給・RTF休暇', icon: 'check' },
  { key: 'meal_allowance', label: '食事補助（Tickets Resto）', icon: 'home' },
  { key: 'bonus', label: '賞与・業績手当', icon: 'up' },
  { key: 'visa_support', label: 'ビザ・更新サポート', icon: 'clock' },
  { key: 'language_support', label: '語学レッスン費補助', icon: 'book' },
  { key: 'health_check', label: '健康診断', icon: 'pulse' },
  { key: 'remote_allowance', label: '在宅勤務手当', icon: 'remote' },
  { key: 'relocation', label: '渡航・引越しサポート', icon: 'plane' },
] as const;

export type JobBenefitKey = (typeof JOB_BENEFITS)[number]['key'];

export const JOB_BENEFIT_LABEL: Record<string, string> = Object.fromEntries(
  JOB_BENEFITS.map((b) => [b.key, b.label]),
);

const jobLanguageLevelSchema = z.object({
  lang: z.enum(['ja', 'fr', 'en']),
  level: z.enum(JOB_LANGUAGE_LEVELS),
  required: z.boolean(),
});

const jobSelectionStepSchema = z.object({
  title: z.string().max(120),
  detail: z.string().max(400).optional(),
});

export const jobMetadataSchema = z.object({
  // --- 既存 (不変) ---
  employment_type: z.enum(JOB_EMPLOYMENT_TYPES),
  category: z.enum(JOB_CATEGORIES),
  salary_period: z.enum(['annual', 'monthly', 'hourly', 'negotiable']).optional(),
  language_requirements: z.array(z.enum(['ja', 'fr', 'en'])).optional(),
  remote_ok: z.boolean().optional(),
  hours_per_week: z.number().int().min(1).max(80).optional(),
  experience_required: z.boolean().optional(),
  /** 視覚障害者対応 / 在留資格サポートあり 等の追加メモ */
  notes: z.string().max(500).optional(),
  /** 対象者 (旅行者 / 駐在員 / 両方) */
  audience: audienceSchema,

  // --- 拡張 (すべて任意。旧データでも落ちない) ---
  /** フランスの契約形態 (CDI/CDD 等)。employment_type とは別軸 */
  contract_type: z.enum(JOB_CONTRACT_TYPES).optional(),
  /** 試用期間メモ (例: "試用期間3ヶ月") */
  trial_period: z.string().max(120).optional(),
  /** 業種 */
  industry: z.enum(JOB_INDUSTRIES).optional(),
  /** 給与レンジ上限 (price_amount を下限、これを上限) */
  salary_max: z.number().int().min(0).optional(),
  /** 給与が額面か手取りか (既定 gross) */
  salary_kind: z.enum(['gross', 'net']).optional(),
  /** 手取り目安 (投稿者の任意入力。偽の自動計算はしない) */
  salary_net_note: z.string().max(160).optional(),
  /** 出社 / ハイブリッド / フルリモート */
  remote_type: z.enum(JOB_REMOTE_TYPES).optional(),
  /** 休日 (例: "土日祝・有給25日") */
  holidays: z.string().max(160).optional(),
  /** 残業 (例: "月平均10時間程度") */
  overtime: z.string().max(160).optional(),
  /** 入社時期 (例: "2026年9月以降・相談可") */
  start_date: z.string().max(120).optional(),
  /** 受動喫煙対策 (例: "屋内禁煙") */
  smoking_policy: z.string().max(120).optional(),
  /** 必須スキル / 応募資格 */
  essential_skills: z.array(z.string().max(160)).max(20).optional(),
  /** 歓迎スキル */
  preferred_skills: z.array(z.string().max(160)).max(20).optional(),
  /** 語学要件 (5 段階メーター用) */
  language_levels: z.array(jobLanguageLevelSchema).max(3).optional(),
  /** 日本語の要否 */
  japanese_language_ok: z.enum(['required', 'preferred', 'not_required']).optional(),
  /** ビザサポートの有無 */
  visa_sponsorship: z.boolean().optional(),
  /** 主な業務 */
  job_duties: z.array(z.string().max(200)).max(20).optional(),
  /** 福利厚生キー (JOB_BENEFITS のキー) */
  benefits: z.array(z.string().max(40)).max(20).optional(),
  /** 選考の流れ */
  selection_steps: z.array(jobSelectionStepSchema).max(10).optional(),
  /** 募集人数 */
  open_positions: z.number().int().min(1).max(999).optional(),
  /** 応募締切 (YYYY-MM-DD) */
  application_deadline: z.string().max(20).optional(),
  /** 急募フラグ */
  urgent: z.boolean().optional(),
  /** 会社名 (無ければ投稿者名を表示) */
  company_name: z.string().max(120).optional(),
  /** 会社規模 (例: "従業員 7名") */
  company_size: z.string().max(80).optional(),
  /** 設立 (例: "2014年") */
  company_founded: z.string().max(40).optional(),
  /** 日本人スタッフ在籍 */
  japanese_staff: z.boolean().optional(),
});
export type JobMetadata = z.infer<typeof jobMetadataSchema>;
export type JobLanguageLevelEntry = z.infer<typeof jobLanguageLevelSchema>;
export type JobSelectionStep = z.infer<typeof jobSelectionStepSchema>;

// =============================================================================
// アパート (apartment)
// =============================================================================

export const APARTMENT_LISTING_TYPES = [
  'long_term',     // 1 年以上の通常賃貸
  'short_term',    // 数日〜数ヶ月の短期
  'shared',        // シェアハウス / フラットシェア
  'sublet',        // サブレ（短期借り上げ）
] as const;
export type ApartmentListingType = (typeof APARTMENT_LISTING_TYPES)[number];

export const APARTMENT_LISTING_TYPE_LABEL: Record<ApartmentListingType, string> = {
  long_term: '長期賃貸',
  short_term: '短期',
  shared: 'シェア',
  sublet: 'サブレ',
};

/**
 * 住居の設備一覧。詳細ページ・エディタで共用する「キー ⇔ 日本語ラベル」の写像。
 *
 * - DB では community_posts.amenities (text[]) に key 文字列の配列として保存する
 *   (manual/0059_community_amenities_geo.sql)。
 * - icon はインライン SVG のパスを参照するためのキー（ApartmentDetail.tsx の AmenIc に対応）。
 *   未定義 / 該当なしの場合は汎用チェックアイコンにフォールバックする。
 *
 * 配列順がそのまま詳細ページ・チェックリストの表示順になる。
 */
export const APARTMENT_AMENITIES = [
  { key: 'wifi', label: 'Wi‑Fi（無線LAN）', icon: 'wifi' },
  { key: 'kitchen', label: 'フル装備キッチン', icon: 'kitchen' },
  { key: 'washer', label: '洗濯機', icon: 'washer' },
  { key: 'dryer', label: '乾燥機', icon: 'dryer' },
  { key: 'heating', label: '暖房', icon: 'heating' },
  { key: 'aircon', label: 'エアコン', icon: 'aircon' },
  { key: 'fridge', label: '冷蔵庫', icon: 'fridge' },
  { key: 'microwave', label: '電子レンジ', icon: 'microwave' },
  { key: 'dishwasher', label: '食洗機', icon: 'dishwasher' },
  { key: 'elevator', label: 'エレベーター', icon: 'elevator' },
  { key: 'bathtub', label: 'バスタブ', icon: 'bathtub' },
  { key: 'shower', label: 'シャワー', icon: 'shower' },
  { key: 'balcony', label: 'バルコニー', icon: 'balcony' },
  { key: 'bike_parking', label: '駐輪場', icon: 'bike' },
  { key: 'bath_dryer', label: '浴室乾燥', icon: 'bath_dryer' },
  { key: 'trash_24h', label: '24時間ゴミ出し', icon: 'trash' },
  { key: 'tv', label: 'テレビ', icon: 'tv' },
  { key: 'workspace', label: 'ワークスペース', icon: 'workspace' },
] as const;

export type ApartmentAmenityKey = (typeof APARTMENT_AMENITIES)[number]['key'];

export const APARTMENT_AMENITY_LABEL: Record<string, string> = Object.fromEntries(
  APARTMENT_AMENITIES.map((a) => [a.key, a.label]),
);

export const apartmentMetadataSchema = z.object({
  listing_type: z.enum(APARTMENT_LISTING_TYPES),
  rent_monthly: z.number().int().min(0).optional(),
  charges_monthly: z.number().int().min(0).optional(),
  deposit: z.number().int().min(0).optional(),
  bedrooms: z.number().int().min(0).max(20).optional(),
  size_sqm: z.number().int().min(0).max(2000).optional(),
  furnished: z.boolean().optional(),
  utilities_included: z.boolean().optional(),
  available_from: z.string().optional(), // YYYY-MM-DD
  available_until: z.string().optional(),
  arrondissement: z.string().max(20).optional(), // "11e" など
  nearest_station: z.string().max(80).optional(),
  pets_ok: z.boolean().optional(),
  smoking_ok: z.boolean().optional(),
  /** 物件の特徴・周辺環境メモ */
  notes: z.string().max(500).optional(),
  /** 対象者 (旅行者 / 駐在員 / 両方) */
  audience: audienceSchema,
});
export type ApartmentMetadata = z.infer<typeof apartmentMetadataSchema>;

// =============================================================================
// 売ります買います (marketplace)
// =============================================================================

export const MARKETPLACE_CONDITIONS = [
  'new',
  'like_new',
  'good',
  'fair',
  'for_parts',
] as const;
export type MarketplaceCondition = (typeof MARKETPLACE_CONDITIONS)[number];

export const MARKETPLACE_CONDITION_LABEL: Record<MarketplaceCondition, string> = {
  new: '新品',
  like_new: 'ほぼ新品',
  good: '良好',
  fair: 'やや使用感',
  for_parts: '部品取り / 訳あり',
};

export const MARKETPLACE_CATEGORIES = [
  'furniture',
  'appliance',
  'kitchen',
  'baby_kids',
  'electronics',
  'vehicle',
  'books_media',
  'clothing',
  'other',
] as const;
export type MarketplaceCategory = (typeof MARKETPLACE_CATEGORIES)[number];

export const MARKETPLACE_CATEGORY_LABEL: Record<MarketplaceCategory, string> = {
  furniture: '家具',
  appliance: '家電',
  kitchen: 'キッチン用品',
  baby_kids: 'ベビー・子供用品',
  electronics: 'PC・スマホ',
  vehicle: '自動車・自転車',
  books_media: '本・メディア',
  clothing: '衣類',
  other: 'その他',
};

export const marketplaceMetadataSchema = z.object({
  condition: z.enum(MARKETPLACE_CONDITIONS),
  category: z.enum(MARKETPLACE_CATEGORIES),
  pickup_required: z.boolean().optional(),
  delivery_available: z.boolean().optional(),
  /** 売る or 買う */
  side: z.enum(['sell', 'buy']).optional(),
  /** 対象者 (旅行者 / 駐在員 / 両方) */
  audience: audienceSchema,
});
export type MarketplaceMetadata = z.infer<typeof marketplaceMetadataSchema>;

// =============================================================================
// イベント (group) — DB の kind は 'group' のまま、UI 表記のみ「イベント」
// =============================================================================

export const groupMetadataSchema = z.object({
  meeting_frequency: z
    .enum(['weekly', 'biweekly', 'monthly', 'one_off', 'flexible'])
    .optional(),
  skill_level: z.enum(['beginner', 'intermediate', 'advanced', 'any']).optional(),
  group_size: z.number().int().min(1).max(500).optional(),
  age_range: z.string().max(60).optional(),
  category: z
    .enum(['sport', 'study', 'hobby', 'parenting', 'language', 'other'])
    .optional(),
  /** 対象者 (旅行者 / 駐在員 / 両方) */
  audience: audienceSchema,
});
export type GroupMetadata = z.infer<typeof groupMetadataSchema>;

// =============================================================================
// 教えます・習います (lesson)
// =============================================================================

export const lessonMetadataSchema = z.object({
  side: z.enum(['teach', 'learn']),
  format: z.enum(['in_person', 'online', 'both']).optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'any']).optional(),
  trial_available: z.boolean().optional(),
  max_students: z.number().int().min(1).max(50).optional(),
  category: z
    .enum(['language', 'music', 'cooking', 'art', 'sport', 'study_aid', 'other'])
    .optional(),
  /** 対象者 (旅行者 / 駐在員 / 両方) */
  audience: audienceSchema,
});
export type LessonMetadata = z.infer<typeof lessonMetadataSchema>;

// =============================================================================
// 助け合い (mutual_aid)
// =============================================================================

export const mutualAidMetadataSchema = z.object({
  request_type: z.enum(['offer', 'need']),
  urgency: z.enum(['now', 'this_week', 'flexible']).optional(),
  compensation: z.enum(['none', 'small_thanks', 'negotiable']).optional(),
  category: z
    .enum([
      'transport',
      'translation',
      'childcare',
      'pet_care',
      'admin_help',
      'moving_help',
      'other',
    ])
    .optional(),
  /** 対象者 (旅行者 / 駐在員 / 両方) */
  audience: audienceSchema,
});
export type MutualAidMetadata = z.infer<typeof mutualAidMetadataSchema>;

// =============================================================================
// 統合
// =============================================================================

export type AnyCommunityMetadata =
  | JobMetadata
  | ApartmentMetadata
  | MarketplaceMetadata
  | GroupMetadata
  | LessonMetadata
  | MutualAidMetadata;

export function metadataSchemaForKind(kind: CommunityKind) {
  switch (kind) {
    case 'job':
      return jobMetadataSchema;
    case 'apartment':
      return apartmentMetadataSchema;
    case 'marketplace':
      return marketplaceMetadataSchema;
    case 'group':
      return groupMetadataSchema;
    case 'lesson':
      return lessonMetadataSchema;
    case 'mutual_aid':
      return mutualAidMetadataSchema;
  }
}

// =============================================================================
// 期限管理
// =============================================================================

/** kind 別の標準的な投稿有効期限（日数）。投稿時にこれで expires_at を埋める */
export const DEFAULT_EXPIRY_DAYS: Record<CommunityKind, number> = {
  job: 60,
  apartment: 60,
  marketplace: 30,
  group: 90,
  lesson: 120,
  mutual_aid: 14,
};
