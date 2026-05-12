/**
 * Locore 用の Google Maps スタイル — Premium Dark v2。
 *
 * 設計指針:
 *   - 全体を near-black 寄りの warm gray にして、amber ピンが最大限映えるように。
 *   - 道路は薄いグレーで地形の輪郭だけ残す（道の名前は主要なもの以外消す）。
 *   - 水域・公園は彩度を抑えたダーク。
 *   - POI / transit / business は全部 OFF（"Google 地図感" の消去）。
 */
export const locoreMapStyles: google.maps.MapTypeStyle[] = [
  // 全体ベース：温かみのあるダーク
  {
    elementType: 'geometry',
    stylers: [{ color: '#18181B' }],
  },
  {
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#71717A' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#0E0E10' }],
  },

  // 行政界・ラベルは「主要都市・国名」だけ薄く残す
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#A1A1AA' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#A1A1AA' }, { visibility: 'on' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#0E0E10' }, { weight: 3 }],
  },
  // 主要道路の名前だけ薄く残す
  {
    featureType: 'road.arterial',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#71717A' }, { visibility: 'on' }],
  },

  // POI (店・観光地アイコン) は全部消す
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction', stylers: [{ visibility: 'off' }] },

  // 道路：ダークグレー（道の存在は分かるが主張しない）
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#27272A' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3F3F46' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#52525B' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#2A2A2D' }],
  },

  // 公園：暗いミュート緑（自然を残しつつ主張しない）
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#1F2A24' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ visibility: 'on' }, { color: '#1F3328' }],
  },

  // 水域：暗いミュート青（コントラストで川や海が分かる）
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0F1F2E' }],
  },
];

/** ピンの色（local score に応じて切り替え）— amber 系の濃淡で */
export function pinColorForScore(score: number): string {
  if (score >= 70) return '#F59E0B'; // 鮮やかな amber（最もローカル）
  if (score >= 30) return '#FBD27D'; // 中間
  return '#6B4504'; // 深いブラウン（観光地寄り）
}

/** ピンの「クラス」（HTML 用、locore-pin と組み合わせ） */
export function pinModifierClass(score: number): string {
  if (score >= 70) return 'locore-pin--high';
  if (score >= 30) return 'locore-pin--mid';
  return 'locore-pin--low';
}
