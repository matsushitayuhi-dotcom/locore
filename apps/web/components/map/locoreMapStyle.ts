/**
 * Locore 用の Google Maps スタイル — Editorial Light v3。
 *
 * 設計指針:
 *   - 全体をウォームオフホワイト (#FAFAF7) ベースで「紙の地図」感を出す
 *   - 道路は控えめな白〜薄ベージュで地形の主張を抑え、terra ピンが目立つようにする
 *   - 水域は穏やかな青グレー、公園は淡い warm green
 *   - POI / transit は全部 OFF（"Google 地図感" の消去）
 */
export const locoreMapStyles: google.maps.MapTypeStyle[] = [
  // 全体ベース：ウォームオフホワイト
  {
    elementType: 'geometry',
    stylers: [{ color: '#FAFAF7' }],
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
    stylers: [{ color: '#FFFFFF' }],
  },

  // 行政界・ラベルは「主要都市・国名」だけ薄く残す
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#A5A09A' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#A5A09A' }, { visibility: 'on' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#FFFFFF' }, { weight: 3 }],
  },
  // 主要道路の名前だけ薄く残す
  {
    featureType: 'road.arterial',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#A5A09A' }, { visibility: 'on' }],
  },

  // POI (店・観光地アイコン) は全部消す
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction', stylers: [{ visibility: 'off' }] },

  // 道路：ほぼ白
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#FFFFFF' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#F4F2EC' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#E7E5E0' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#FBFAF5' }],
  },

  // 公園：淡い warm green
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#EDF1E5' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ visibility: 'on' }, { color: '#E4ECD2' }],
  },

  // 水域：穏やかな青グレー
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#DCEAF5' }],
  },
];

/** ピンの色（local score に応じて切り替え）— terra-cotta 系の濃淡で */
export function pinColorForScore(score: number): string {
  if (score >= 70) return '#D4634A'; // 鮮やか terra-cotta（最もローカル）
  if (score >= 30) return '#DD9477'; // 中間
  return '#C9C5BB'; // 淡いグレー（観光地寄り）
}

/** ピンの「クラス」（HTML 用、locore-pin と組み合わせ） */
export function pinModifierClass(score: number): string {
  if (score >= 70) return 'locore-pin--high';
  if (score >= 30) return 'locore-pin--mid';
  return 'locore-pin--low';
}
