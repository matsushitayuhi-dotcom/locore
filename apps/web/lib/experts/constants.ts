/**
 * v2 エキスパート相談（/experts）の定数。
 *
 * 相談メニューは既存の user_services 行をそのまま使い、予約タグ
 * 'consultation' が tags に入っている行を「相談メニュー」とみなす。
 * スキーマ変更・マイグレーションなしで v1 のサービス群と共存させるための約束事。
 */

/** user_services.tags に入れる予約タグ。これが付いた行だけが相談メニュー扱い。 */
export const CONSULTATION_TAG = 'consultation';

/**
 * 相談テーマのタクソノミー（tags に追加で入れる）。
 * 2026-09 留学特化リポジショニング: 在学生・アルムナイによる留学相談に合わせて
 * 9 種へ刷新。旧タグ（immigration / expat_prep 等）は選択肢から外すが、
 * 既存データの表示互換のため lib/services/tagLabels.ts のマップには残す。
 *
 * 並び順は「トラック → テーマ」で固定（描画側はこの配列順をそのまま使う）:
 * 先頭 4 つ（grad_school / mba / undergrad / language_exchange）がトラック、
 * 以降 5 つがテーマ。各相談メニューの tags は最低 1 つトラックを含める約束。
 */
export const TOPIC_TAGS = [
  { value: 'grad_school', label: '大学院出願' },
  { value: 'mba', label: 'MBA' },
  { value: 'undergrad', label: '学部出願' },
  { value: 'language_exchange', label: '語学・交換留学' },
  { value: 'application_docs', label: 'エッセイ・出願書類' },
  { value: 'interview', label: '面接対策' },
  { value: 'funding', label: '奨学金・費用' },
  { value: 'campus_life', label: '現地生活・キャンパス' },
  { value: 'majors_labs', label: '専攻・研究室選び' },
] as const;

export type TopicTagValue = (typeof TOPIC_TAGS)[number]['value'];

export const TOPIC_TAG_VALUES: string[] = TOPIC_TAGS.map((t) => t.value);

/** タグ値 → 日本語ラベル。未知の値は raw のまま返す。 */
export function topicLabel(tag: string): string {
  return TOPIC_TAGS.find((t) => t.value === tag)?.label ?? tag;
}

/** /experts の料金フィルタ（30分メニューの価格帯を想定したプリセット）。
 *  留学特化に合わせて高単価帯へ改訂（大学院/MBA は 30分 ¥4,000〜6,000 が中心）。 */
export const PRICE_RANGES = [
  { value: '0-4000', label: '〜 ¥4,000', min: 0, max: 4000 },
  { value: '4001-6000', label: '¥4,001 〜 ¥6,000', min: 4001, max: 6000 },
  { value: '6001-', label: '¥6,001 〜', min: 6001, max: null },
] as const;

export type PriceRangeValue = (typeof PRICE_RANGES)[number]['value'];
