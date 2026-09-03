/**
 * v2 エキスパート相談（/experts）の定数。
 *
 * 相談メニューは既存の user_services 行をそのまま使い、予約タグ
 * 'consultation' が tags に入っている行を「相談メニュー」とみなす。
 * スキーマ変更・マイグレーションなしで v1 のサービス群と共存させるための約束事。
 */

/** user_services.tags に入れる予約タグ。これが付いた行だけが相談メニュー扱い。 */
export const CONSULTATION_TAG = 'consultation';

/** 相談テーマのタクソノミー（tags に追加で入れる）。 */
export const TOPIC_TAGS = [
  { value: 'immigration', label: '移住' },
  { value: 'study_abroad', label: '留学' },
  { value: 'expat_prep', label: '駐在準備' },
  { value: 'travel', label: '旅行' },
  { value: 'childcare', label: '子育て・教育' },
  { value: 'housing', label: '住まい' },
  { value: 'work', label: '仕事・起業' },
  { value: 'procedures', label: '生活手続き' },
] as const;

export type TopicTagValue = (typeof TOPIC_TAGS)[number]['value'];

export const TOPIC_TAG_VALUES: string[] = TOPIC_TAGS.map((t) => t.value);

/** タグ値 → 日本語ラベル。未知の値は raw のまま返す。 */
export function topicLabel(tag: string): string {
  return TOPIC_TAGS.find((t) => t.value === tag)?.label ?? tag;
}

/** /experts の料金フィルタ（30分メニューの価格帯を想定したプリセット）。 */
export const PRICE_RANGES = [
  { value: '0-3000', label: '〜 ¥3,000', min: 0, max: 3000 },
  { value: '3001-4000', label: '¥3,001 〜 ¥4,000', min: 3001, max: 4000 },
  { value: '4001-', label: '¥4,001 〜', min: 4001, max: null },
] as const;

export type PriceRangeValue = (typeof PRICE_RANGES)[number]['value'];
