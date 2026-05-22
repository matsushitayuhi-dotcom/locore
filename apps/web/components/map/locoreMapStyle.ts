/**
 * Locore 用の Google Maps スタイル — Prism Japan 風 Monochrome v1。
 *
 * 設計指針:
 *   - 紙の地図のような完全モノクロ。色相は一切持たない (neutral zinc / stone のみ)
 *   - 道路は純白に近い、ストロークは細い neutral-200
 *   - 水域は淡いグレー (青は廃止)
 *   - landscape / park の緑は廃止
 *   - POI / transit / 行政ラベル / 道路ラベルは限界まで間引き、ラベルが残るときも
 *     neutral-500 を薄く一段だけ
 *   - Apple Maps / Mapbox monochrome に近い視覚密度
 */
export const locoreMapStyles: google.maps.MapTypeStyle[] = [
  // ベース：ほぼ白い zinc-50
  {
    elementType: 'geometry',
    stylers: [{ color: '#FAFAFA' }],
  },
  // ラベルはほぼ全て OFF
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
    stylers: [{ color: '#FFFFFF' }, { weight: 3 }],
  },

  // 国名 / 主要都市名だけ、超薄く残す
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
    stylers: [{ color: '#FFFFFF' }, { weight: 3 }],
  },

  // POI / transit / business / attraction はすべて消す
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'off' }] },

  // 道路 — 純白 + 細い neutral-200 のストローク
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#FFFFFF' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#E4E4E7' }, { weight: 0.6 }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#FFFFFF' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#D4D4D8' }, { weight: 0.8 }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#FFFFFF' }],
  },
  // 道路ラベルは消す（"Google らしさ" の排除）
  {
    featureType: 'road',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },

  // 自然 / landscape — 紙のグレー
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#F4F4F5' }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#F4F4F5' }],
  },

  // 水域 — 淡い neutral-200 (青を廃止して紙の質感に)
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#E4E4E7' }],
  },
  {
    featureType: 'water',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
];

/**
 * ピンの色（local score に応じて切り替え）— モノクロ階調で。
 *   high   → ink (#18181b) zinc-900
 *   mid    → zinc-600
 *   low    → zinc-400
 */
export function pinColorForScore(score: number): string {
  if (score >= 70) return '#18181B'; // ink
  if (score >= 30) return '#52525B'; // zinc-600
  return '#A1A1AA'; // zinc-400
}

/** ピンの「クラス」（HTML 用、locore-pin と組み合わせ） */
export function pinModifierClass(score: number): string {
  if (score >= 70) return 'locore-pin--high';
  if (score >= 30) return 'locore-pin--mid';
  return 'locore-pin--low';
}
