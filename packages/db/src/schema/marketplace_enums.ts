import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Marketplace（スキル / 人脈マーケットプレイス）専用 enum 群。
 *
 * 既存の `enums.ts` には触らず、本ファイルに集約する。
 * 値は @locore/shared と同期させる方針だが、初期段階は DB 側を正とする。
 *
 * 関連: manual/0052_marketplace_schema.sql
 *      docs/marketplace-design.md
 */

// --- Listing / 出品 ---------------------------------------------------------

/**
 * 出品 (listing) の状態。
 *
 * - draft: 編集中。公開クエリには出ない。
 * - pending_review: 運営審査待ち（KYC・規約抵触チェック）
 * - published: 公開中。検索可能。
 * - paused: 出品者が一時停止。再公開は draft→pending_review を経由しない
 *   軽量再開が可能（運営判断で `published` に戻せる）。
 * - archived: 終了。orders からの履歴参照は保持。
 */
export const listingStatusEnum = pgEnum('listing_status', [
  'draft',
  'pending_review',
  'published',
  'paused',
  'archived',
]);

/**
 * 価格モデル（PRD §7）。
 *
 * - fixed:      固定金額（買付代行 1 件 = €120 等）
 * - hourly:     時間単価（通訳 €60/h 等）。Order 側に hours を持つ
 * - daily:      日単価（撮影 €600/day）
 * - per_item:   数量×単価（買付 1 点あたり €30、3 点で €90）
 * - quote_only: 見積もりベース。Order 確定時に seller が金額を提示
 * - tiered:     階層料金（オプション複数）。listing_options に詳細
 */
export const pricingModelEnum = pgEnum('pricing_model', [
  'fixed',
  'hourly',
  'daily',
  'per_item',
  'quote_only',
  'tiered',
]);

/**
 * Listing カテゴリ。PRD §3 のカテゴリツリーを 1 階層フラットにした版。
 * UI 側で外向き(A) / 現地内(B) / アクセス(C) のグループに振り分ける。
 */
export const listingCategoryEnum = pgEnum('listing_category', [
  // A. 外向き
  'procurement', // 買付・代理購入
  'attend', // アテンド・現地同行
  'photography', // 撮影
  'translation', // 通訳・翻訳
  'research', // リサーチ
  'consulting', // 専門知識コンサル
  'logistics', // 転送・発送・検品梱包
  // B. 現地日本人同士
  'childcare', // 託児・送迎・ベビーシッター
  'tutoring', // 家庭教師・補習
  'beauty', // 出張ヘアカット・美容
  'food', // 手作り料理・日本食販売
  'lesson', // ピアノ・書道・日本語維持等
  'handyman', // 引越し・運転・組立
  'family_photo', // 七五三・家族写真
  'tax_admin', // 税務・行政同行
  // C. アクセス・コーディネート
  'access_fashion',
  'access_wine',
  'access_gastronomy',
  'access_art',
  // B2B
  'b2b_research',
  'b2b_sourcing',
  'other',
]);

// --- Order / 取引 -----------------------------------------------------------

/**
 * Order の状態遷移 (PRD §4)。
 *
 *   requested → accepted → paid → scheduled → in_progress → completed → released
 *      ↓          ↓
 *   declined   cancelled
 *      ↓          ↓
 *               refunded
 *
 * - disputed は any → disputed への遷移（paid 以降のみ）
 * - released は資金が seller に渡った最終状態（成功 terminal）
 * - refunded は買い手への返金完了（失敗 terminal）
 */
export const orderStatusEnum = pgEnum('order_status', [
  'requested', // 買い手が予約申込
  'accepted', // 売り手が承諾。次は決済へ
  'declined', // 売り手が拒否（terminal）
  'paid', // PaymentIntent succeeded、エスクロー保留
  'scheduled', // 日時確定
  'in_progress', // 当日 / 実行中
  'completed', // 売り手が完了報告
  'released', // 買い手承認 or 48h 自動承認 → Transfer 実行済（terminal 成功）
  'cancelled', // 決済前にキャンセル（terminal）
  'disputed', // 紛争提起中
  'refunded', // 全額返金完了（terminal 失敗）
]);

/**
 * Order の actor 識別（メッセージ・状態遷移ログで使用）。
 */
export const orderActorEnum = pgEnum('order_actor', [
  'buyer',
  'seller',
  'system',
  'admin',
]);

// --- Commission / 料率 ------------------------------------------------------

/**
 * 料率ルールの種別。優先順位は PRD §6 の評価順。
 *
 * - founder_grant: 創業メンバー権利（user_grants 経由で 0% / 半額等）
 * - repeat_discount: 同一ペアのリピート逓減（1→12%, 2→8%, 3+→5%）
 * - category_base: カテゴリ別の基本料率（買付 12% / アクセス 15% 等）
 * - global_cap: 取引額の絶対上限（高額取引で料率を打ち切る）
 * - promotion: 期間限定キャンペーン
 */
export const commissionRuleKindEnum = pgEnum('commission_rule_kind', [
  'founder_grant',
  'repeat_discount',
  'category_base',
  'global_cap',
  'promotion',
]);

// --- Dispute / 紛争 ---------------------------------------------------------

export const disputeStatusEnum = pgEnum('dispute_status', [
  'open', // 提起済、運営未対応
  'investigating', // 運営が証拠収集中
  'awaiting_party', // 当事者の追加情報待ち
  'resolved_release', // 売り手有利（資金 release）
  'resolved_refund_full', // 買い手有利（全額返金）
  'resolved_refund_partial', // 部分返金
  'closed_no_action', // 取り下げ / 不受理
]);

export const disputeReasonEnum = pgEnum('dispute_reason', [
  'not_delivered', // サービス未提供
  'not_as_described', // 内容が違う
  'quality_issue', // 品質・態度
  'late', // 遅延
  'damaged_item', // 物品破損（買付・転送）
  'communication_breakdown',
  'other',
]);

// --- KYC --------------------------------------------------------------------

/**
 * 出品者 (seller) の KYC ステータス。
 *
 * Stripe Connect Express のオンボーディング状態と同期させるが、
 * Locore 側の追加審査（規約面談・カテゴリ別資格）も含むため独立 enum に。
 */
export const kycStatusEnum = pgEnum('kyc_status', [
  'not_started',
  'in_progress',
  'pending_review',
  'approved',
  'rejected',
  'restricted', // 出品は可だが一部カテゴリ NG / 上限あり
]);

// --- Grant / 創業メンバー権利 -----------------------------------------------

/**
 * user_grants.grant_type で使用。
 *
 * - founder_50: 創業 50 取引まで手数料 0%
 * - founder_half: 創業期 6 ヶ月、料率半額
 * - referral_bonus: 紹介プログラム由来の優遇
 * - manual_override: 運営手動付与
 */
export const userGrantTypeEnum = pgEnum('user_grant_type', [
  'founder_50',
  'founder_half',
  'referral_bonus',
  'manual_override',
]);

export const userGrantStatusEnum = pgEnum('user_grant_status', [
  'active',
  'consumed',
  'expired',
  'revoked',
]);

// --- Escrow ledger / 会計 ---------------------------------------------------

/**
 * escrow_ledger.entry_type。
 *
 * Stripe Connect の Separate Charges & Transfers モデルを
 * 内部台帳として double-entry に近い形で写し取る。
 *
 * - charge:        買い手 → Platform への入金（PaymentIntent succeeded）
 * - hold:          エスクロー保留中（charge の論理ミラー、表示用）
 * - transfer:      Platform → Seller Connect への移送（release 時）
 * - platform_fee:  Platform 収益確定（commission）
 * - stripe_fee:    決済代行手数料（Stripe 自身が引く）
 * - refund_full / refund_partial: 返金
 * - adjustment:    手動補正（運営）
 */
export const escrowEntryTypeEnum = pgEnum('escrow_entry_type', [
  'charge',
  'hold',
  'transfer',
  'platform_fee',
  'stripe_fee',
  'refund_full',
  'refund_partial',
  'adjustment',
]);

// --- Message moderation -----------------------------------------------------

/**
 * order_messages.moderation_flag。
 *
 * 連絡先マスキング（PRD §8）の検出結果を保持。none 以外なら警告 UI を出す。
 */
export const messageModerationFlagEnum = pgEnum('message_moderation_flag', [
  'none',
  'email_masked',
  'phone_masked',
  'sns_handle_masked',
  'url_masked',
  'circumvention_phrase', // 「直接やりませんか」等
  'multiple', // 複数該当
]);
