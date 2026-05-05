/** プラットフォーム共通定数 */

/** 月次精算の最低送金額（JPY）。これ未満は翌月に繰越 */
export const MIN_PAYOUT_JPY = 3000;

/** 居住認証書類の保管 TTL（日数）。経過後は自動削除 */
export const KYC_DOC_TTL_DAYS = 30;

/** 月次精算の実行日（毎月この日 03:00 JST に発火） */
export const PAYOUT_RUN_DAY_OF_MONTH = 15;

/** 記事のスポット最低数（公開要件） */
export const MIN_SPOTS_PER_ARTICLE = 1;

/** 記事本文の最低文字数（公開要件） */
export const MIN_ARTICLE_BODY_LENGTH = 800;

/** レビューに付与できるタグ数の最大値 */
export const MAX_REVIEW_TAGS = 3;

/** 旅程に追加できる1日あたりのアイテム数の上限 */
export const MAX_TRIP_ITEMS_PER_DAY = 20;

/** 全体で扱う通貨（Phase 1 は JPY 固定） */
export const PRIMARY_CURRENCY = 'JPY' as const;

/** 対応都市コード（Phase 1 はパリのみ） */
export const SUPPORTED_CITY_SLUGS = ['paris'] as const;
export type SupportedCitySlug = (typeof SUPPORTED_CITY_SLUGS)[number];
