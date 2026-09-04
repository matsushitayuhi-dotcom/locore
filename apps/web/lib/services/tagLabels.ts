/**
 * user_services.tags の表示ラベルマップ。
 *
 * 旧 category enum (tourism / consulting / study_abroad / translation / attend /
 * other) と、0055 で導入したよくある補助タグ (shipping / shooting / access) を
 * 日本語に翻訳して表示する。マップに無いタグ (例: 'ワイン', 'パリ', '蚤の市')
 * はそのまま表示する想定。
 *
 * ServiceCard / ServiceCarousel / /services 詳細 / /services フィルタの
 * 全てで同じ翻訳を共有するため、ここに集約。
 */
export const TAG_LABEL: Record<string, string> = {
  tourism: '観光・現地アテンド',
  consulting: 'コンサル・相談',
  // v2 で TOPIC_TAGS('留学') と表記統一（旧: 留学サポート）
  study_abroad: '留学',
  translation: '翻訳・通訳',
  attend: '同行・代行',
  shipping: '買付・発送',
  shooting: '撮影',
  access: '限定アクセス',
  other: 'その他',
  // v2 エキスパート相談（/experts）: 予約タグ + 相談テーマタクソノミー
  consultation: 'スポット相談',
  // 2026-09 留学特化リポジショニングの新タクソノミー（lib/experts/constants.ts と同期）
  grad_school: '大学院出願',
  mba: 'MBA',
  undergrad: '学部出願',
  language_exchange: '語学・交換留学',
  application_docs: 'エッセイ・出願書類',
  interview: '面接対策',
  funding: '奨学金・費用',
  campus_life: '現地生活・キャンパス',
  majors_labs: '専攻・研究室選び',
  // ---- deprecated（旧タクソノミー）----
  // 選択肢からは撤去済みだが、既存の user_services 行・キャッシュに残る値の
  // 表示が生タグ文字列にならないようマップには残す。
  immigration: '移住',
  expat_prep: '駐在準備',
  travel: '旅行',
  childcare: '子育て・教育',
  housing: '住まい',
  work: '仕事・起業',
  procedures: '生活手続き',
};

/** タグ表示用ラベル取得。マップに無い値は raw のまま返す。 */
export function tagLabel(tag: string): string {
  return TAG_LABEL[tag] ?? tag;
}
