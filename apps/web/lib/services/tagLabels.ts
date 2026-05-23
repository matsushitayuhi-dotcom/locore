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
  study_abroad: '留学サポート',
  translation: '翻訳・通訳',
  attend: '同行・代行',
  shipping: '買付・発送',
  shooting: '撮影',
  access: '限定アクセス',
  other: 'その他',
};

/** タグ表示用ラベル取得。マップに無い値は raw のまま返す。 */
export function tagLabel(tag: string): string {
  return TAG_LABEL[tag] ?? tag;
}
