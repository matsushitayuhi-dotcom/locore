/**
 * 駐在員プロフィールに使う定数（family_stage / languages / interests / looking_for）。
 *
 * /settings/profile の編集フォームと /residents の検索フィルタの両方が参照する。
 */

// =============================================================================
// 家族構成
// =============================================================================

export const FAMILY_STAGES = [
  'single',
  'couple',
  'family_kids',
  'empty_nest',
] as const;
export type FamilyStage = (typeof FAMILY_STAGES)[number];

export const FAMILY_STAGE_LABEL: Record<FamilyStage, string> = {
  single: '独身',
  couple: '夫婦・パートナー（子なし）',
  family_kids: '家族（子あり）',
  empty_nest: '子育て卒業',
};

// =============================================================================
// 言語レベル
// =============================================================================

export const LANGUAGE_LEVELS = [
  'native',
  'business',
  'conversation',
  'basic',
] as const;
export type LanguageLevel = (typeof LANGUAGE_LEVELS)[number];

export const LANGUAGE_LEVEL_LABEL: Record<LanguageLevel, string> = {
  native: 'ネイティブ',
  business: 'ビジネス',
  conversation: '日常会話',
  basic: '初歩',
};

/** /residents や編集画面のチェックボックスで出す言語 */
export const COMMON_LANGUAGES = [
  { code: 'ja', label: '日本語' },
  { code: 'en', label: '英語' },
  { code: 'fr', label: 'フランス語' },
  { code: 'es', label: 'スペイン語' },
  { code: 'de', label: 'ドイツ語' },
  { code: 'it', label: 'イタリア語' },
  { code: 'zh', label: '中国語' },
  { code: 'ko', label: '韓国語' },
] as const;

// =============================================================================
// 興味タグ（プリセット） — フリー入力も可
// =============================================================================

export const INTEREST_PRESETS = [
  'カフェ巡り',
  'ワイン',
  '日本食料理',
  'マラソン・ランニング',
  'ハイキング',
  'テニス',
  '読書',
  '映画',
  '美術館・ギャラリー',
  '子育て',
  '語学学習',
  '写真',
  '音楽・ライブ',
  '料理教室',
  'マルシェ・市場',
  'バードウォッチング',
  '旅行',
  'スタートアップ',
] as const;

// =============================================================================
// 探していること（プリセット） — フリー入力も可
// =============================================================================

export const LOOKING_FOR_PRESETS = [
  '気軽な友達',
  'ご近所さん',
  'ママ友・パパ友',
  '言語交換',
  'ビジネスパートナー',
  '副業・案件',
  '習い事仲間',
  '趣味仲間（スポーツ）',
  '趣味仲間（カルチャー）',
  '日本食材の共同購入',
  '帰国情報の交換',
] as const;
