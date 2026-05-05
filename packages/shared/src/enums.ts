/**
 * Locore 共通 enum 定義。
 *
 * 値そのものを安定リテラルとして扱うため、`as const` オブジェクト + Union 型のパターンを採用する
 * （DB の enum / Algolia ファセット / API レスポンスで一貫した文字列を使う）。
 */

/** クリエイターのランク（PRD §クリエイターランク参照） */
export const Tier = {
  /** S: 居住認証済み + 実績多数（手数料優遇） */
  S: 'S',
  /** A: 居住認証済み */
  A: 'A',
  /** B: 未認証（価格上限あり） */
  B: 'B',
} as const;
export type Tier = (typeof Tier)[keyof typeof Tier];

/** 記事のステータス */
export const ArticleStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
  PENDING_REVIEW: 'pending_review',
} as const;
export type ArticleStatus = (typeof ArticleStatus)[keyof typeof ArticleStatus];

/** 書き手の役割（複数兼務あり） */
export const WriterRole = {
  /** 在外邦人ライター（メイン） */
  RESIDENT_WRITER: 'resident_writer',
  /** 編集チーム（コレクション制作・キュレーション） */
  EDITOR: 'editor',
  /** ライト旅行記の投稿者（旅行者の感想） */
  LIGHT_DIARIST: 'light_diarist',
  /** 一般読者（書き手機能なし） */
  READER: 'reader',
} as const;
export type WriterRole = (typeof WriterRole)[keyof typeof WriterRole];

/** レビュー時に付与できるタグ（最大3つ） */
export const ReviewTag = {
  LOCAL_FEEL: 'local_feel',
  WORTH_THE_PRICE: 'worth_the_price',
  EASY_TO_FIND: 'easy_to_find',
  GOOD_FOR_FAMILY: 'good_for_family',
  GOOD_FOR_COUPLES: 'good_for_couples',
  HIDDEN_GEM: 'hidden_gem',
  PHOTO_FRIENDLY: 'photo_friendly',
  KID_FRIENDLY: 'kid_friendly',
  VEGAN_FRIENDLY: 'vegan_friendly',
  ENGLISH_OK: 'english_ok',
  CASH_ONLY: 'cash_only',
  RESERVATION_REQUIRED: 'reservation_required',
} as const;
export type ReviewTag = (typeof ReviewTag)[keyof typeof ReviewTag];
