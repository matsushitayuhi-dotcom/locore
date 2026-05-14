/**
 * コミュニティ投稿の種別・メタデータ・ラベル定数。
 *
 * UI / Server Action / 型推論の全てがここを参照する。
 */

import { z } from 'zod';

// =============================================================================
// 種別
// =============================================================================

export const COMMUNITY_KINDS = [
  'job',
  'apartment',
  'marketplace',
  'group',
  'lesson',
  'mutual_aid',
] as const;
export type CommunityKind = (typeof COMMUNITY_KINDS)[number];

export const KIND_LABEL: Record<CommunityKind, string> = {
  job: '求人',
  apartment: 'アパート',
  marketplace: '売ります・買います',
  group: 'メンバー募集',
  lesson: '教えます・習います',
  mutual_aid: '助け合い',
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

export const jobMetadataSchema = z.object({
  employment_type: z.enum(JOB_EMPLOYMENT_TYPES),
  category: z.enum(JOB_CATEGORIES),
  salary_period: z.enum(['annual', 'monthly', 'hourly', 'negotiable']).optional(),
  language_requirements: z.array(z.enum(['ja', 'fr', 'en'])).optional(),
  remote_ok: z.boolean().optional(),
  hours_per_week: z.number().int().min(1).max(80).optional(),
  experience_required: z.boolean().optional(),
  /** 視覚障害者対応 / 在留資格サポートあり 等の追加メモ */
  notes: z.string().max(500).optional(),
});
export type JobMetadata = z.infer<typeof jobMetadataSchema>;

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
});
export type MarketplaceMetadata = z.infer<typeof marketplaceMetadataSchema>;

// =============================================================================
// メンバー募集 (group)
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
