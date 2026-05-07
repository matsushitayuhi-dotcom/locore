/**
 * Locore 用の Google Maps スタイル。
 *
 * 設計指針:
 *   - Google Maps の "Google らしさ" を消す（POI、business、transit、ラベルを省略）
 *   - Locore のエメラルドベース（mint background, soft beige roads）に揃える
 *   - 道路は控えめな白〜ベージュで地形の主張を抑え、ピンが目立つようにする
 */
export const locoreMapStyles: google.maps.MapTypeStyle[] = [
  // 全体ベース：ミント寄りのオフホワイト
  {
    elementType: 'geometry',
    stylers: [{ color: '#F1F6F3' }],
  },
  {
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#7C8C84' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#FFFFFF' }],
  },

  // 行政界・ラベルは「主要都市・国名」だけ薄く残す
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#A8B6AF' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#A8B6AF' }, { visibility: 'on' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#FFFFFF' }, { weight: 3 }],
  },
  // 道路の主要なものだけ薄く名前を残す
  {
    featureType: 'road.arterial',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#A8B6AF' }, { visibility: 'on' }],
  },

  // POI (店・観光地アイコン) は全部消す → "Google地図感" の最大の元
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
    stylers: [{ color: '#E3EBE7' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#CDD8D2' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#FBFBF8' }],
  },

  // 公園：薄いミントエメラルド
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#E6F7EF' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ visibility: 'on' }, { color: '#C0ECD6' }],
  },

  // 水域：少し青みのあるミント
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#BFE3D6' }],
  },
];

/** ピンの色（local score に応じて切り替え）— emerald 単色系の濃淡で */
export function pinColorForScore(score: number): string {
  if (score >= 70) return '#0D7A5C'; // 深い emerald
  if (score >= 30) return '#54C79A'; // 中間
  return '#C6ECD9'; // 淡い mint
}

/** ピンの「クラス」（HTML 用、locore-pin と組み合わせ） */
export function pinModifierClass(score: number): string {
  if (score >= 70) return 'locore-pin--high';
  if (score >= 30) return 'locore-pin--mid';
  return 'locore-pin--low';
}
