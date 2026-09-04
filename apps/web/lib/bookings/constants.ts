/**
 * 予約スライスの共有定数。server / client 両方から import できる純定数のみ。
 */

import type { ConsultationBookingStatus } from '@locore/db';

/** プラットフォーム手数料率（リクエスト時に booking へスナップショット保存） */
export const PLATFORM_FEE_RATE = 0.2;

/** リクエストできる最短リード時間（開始まで 12 時間を切った枠は出さない） */
export const MIN_LEAD_HOURS = 12;

/** 空き枠を提示する window（今後 28 日） */
export const BOOKING_WINDOW_DAYS = 28;

/** 開始時刻候補の刻み（分） */
export const SLOT_STEP_MINUTES = 30;

/**
 * 空き枠・重複チェックで「枠を塞ぐ」扱いにするステータス。
 * 返答期限は開始時刻そのもの（start_at < now で expired）— 別の期限定数は持たない。
 */
export const BLOCKING_STATUSES = ['requested', 'accepted', 'paid'] as const;

/** 一括追加フォームの既定週数（「今後4週間分に追加」） */
export const DEFAULT_BULK_WEEKS = 4;

export const STATUS_LABELS: Record<ConsultationBookingStatus, string> = {
  requested: 'リクエスト中',
  accepted: '確定',
  declined: '辞退',
  cancelled: 'キャンセル',
  expired: '期限切れ',
  paid: '支払い済み',
  completed: '完了',
};

/**
 * タイムゾーン選択肢（エキスパートの都市に対応 + 日本）。
 * label は select 表示、short は「◯◯時間」の併記に使う。
 */
export const TIMEZONE_OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
  short: string;
}> = [
  { value: 'Europe/Paris', label: 'Europe/Paris（パリ）', short: 'パリ時間' },
  { value: 'Europe/London', label: 'Europe/London（ロンドン）', short: 'ロンドン時間' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin（ベルリン）', short: 'ベルリン時間' },
  { value: 'America/New_York', label: 'America/New_York（ニューヨーク）', short: 'ニューヨーク時間' },
  { value: 'America/Vancouver', label: 'America/Vancouver（バンクーバー）', short: 'バンクーバー時間' },
  { value: 'Asia/Bangkok', label: 'Asia/Bangkok（バンコク）', short: 'バンコク時間' },
  { value: 'Australia/Melbourne', label: 'Australia/Melbourne（メルボルン）', short: 'メルボルン時間' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore（シンガポール）', short: 'シンガポール時間' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo（日本）', short: '日本時間' },
];

/** '◯◯時間' の短縮ラベル。選択肢に無い IANA 名は末尾セグメントで代用 */
export function tzShortLabel(tz: string): string {
  const opt = TIMEZONE_OPTIONS.find((o) => o.value === tz);
  if (opt) return opt.short;
  const seg = tz.split('/').pop()?.replace(/_/g, ' ') ?? tz;
  return `${seg}時間`;
}
