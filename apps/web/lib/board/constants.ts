/**
 * 掲示板のカテゴリと対象読者の共通定数。
 * UI ラベルとアプリ側 enum をここ 1 箇所で管理する。
 */

export const BOARD_CATEGORIES = [
  'event',
  'transit',
  'admin',
  'food_season',
  'community',
  'family_edu',
  'health_weather',
] as const;

export type BoardCategory = (typeof BOARD_CATEGORIES)[number];

export const BOARD_CATEGORY_LABEL: Record<BoardCategory, string> = {
  event: 'イベント',
  transit: '交通情報',
  admin: '行政・締切',
  food_season: '食・季節',
  community: 'コミュニティ',
  family_edu: '子育て・教育',
  health_weather: '天候・健康',
};

/** カテゴリの短い説明（タブのホバー、admin フォームのヒント等で使う） */
export const BOARD_CATEGORY_HINT: Record<BoardCategory, string> = {
  event: 'マルシェ、展示、フェス、ソルドなど期間限定の催し',
  transit: 'ストライキ、運休、迂回ルート、Pass Navigo の値上げなど',
  admin: '確定申告、滞在許可更新、CAF など行政の締切',
  food_season: '白アスパラ解禁、ジビエ、ボージョレーなど旬の食材',
  community: '在仏邦人会、日本酒会、邦人クリエイター展など',
  family_edu: '学校休暇、補習校イベント、子供向けの催し',
  health_weather: '熱波・大気汚染・花粉など緊急時の警報のみ',
};

export const BOARD_AUDIENCES = ['both', 'traveler', 'resident'] as const;
export type BoardAudience = (typeof BOARD_AUDIENCES)[number];

export const BOARD_AUDIENCE_LABEL: Record<BoardAudience, string> = {
  both: '両方向け',
  traveler: '旅行者向け',
  resident: '駐在員向け',
};

/** 旅行者タグを付けられるのは event カテゴリだけ */
export function isAudienceAllowed(
  category: BoardCategory,
  audience: BoardAudience,
): boolean {
  if (category === 'event') return true;
  return audience === 'resident';
}

/** カテゴリから既定の対象を返す（admin フォーム初期値や AI cron 用） */
export function defaultAudienceForCategory(
  category: BoardCategory,
): BoardAudience {
  return category === 'event' ? 'both' : 'resident';
}
