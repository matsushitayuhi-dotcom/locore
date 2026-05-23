/**
 * Locore 用の Google Maps スタイル — Prism Japan 風 Monochrome + 緑アクセント v2。
 *
 * 設計指針:
 *   - 基本はモノクロ紙地図のトーン (zinc グレースケール)
 *   - 水域に primary-50 の極めて薄いシャルトリューズ緑を差し、ブランド配色を匂わせる
 *   - 公園 / landscape.natural は非表示にせず、薄い primary-50 で控えめに復活
 *   - 道路は引き続き純白
 *   - 行政ラベル (administrative.locality) は primary-700 系を薄く（読みやすさ優先）
 *   - POI / transit / business / attraction はノイズなので消す
 *   - 「全面緑」ではなく、印象として "うっすら緑が差す" レベル
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

  // 国名 / 主要都市名 — primary-700 を薄く効かせてブランドの匂いを残す
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#A1A1AA' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#5d8d0e' }, { visibility: 'on' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#FFFFFF' }, { weight: 3 }],
  },

  // POI / transit / business / attraction はノイズなので消す
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction', stylers: [{ visibility: 'off' }] },

  // 公園だけは控えめに復活させる — primary-50 の極淡シャルトリューズ
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#f3f9e1' }, { visibility: 'on' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },

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

  // landscape — 紙のグレー基調
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#F4F4F5' }],
  },
  // landscape.natural（森・河川敷など）はうっすら primary-50 で緑を匂わせる
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#f3f9e1' }],
  },

  // 水域 — primary-50 のごく薄い緑 (ブランド色を最も自然に差せるエリア)
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#f3f9e1' }],
  },
  {
    featureType: 'water',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
];

/**
 * ピンの色（local score に応じて切り替え）— Deloitte グリーン階調。
 * 地図ベースが薄いグレースケールなので、最もローカルなスポットだけ
 * ビビッドなグリーンで目立たせる。
 *   high   → #86BC25 (Deloitte chartreuse, primary-500)
 *   mid    → #A8D255 (primary-300, soft green)
 *   low    → #A1A1AA (zinc-400 muted)
 */
export function pinColorForScore(score: number): string {
  if (score >= 70) return '#86BC25';
  if (score >= 30) return '#A8D255';
  return '#A1A1AA';
}

/** ピンの「クラス」（HTML 用、locore-pin と組み合わせ） */
export function pinModifierClass(score: number): string {
  if (score >= 70) return 'locore-pin--high';
  if (score >= 30) return 'locore-pin--mid';
  return 'locore-pin--low';
}
