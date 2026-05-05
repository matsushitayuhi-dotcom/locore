/**
 * 地理計算ユーティリティ。
 *
 * クリティカルパス（ビューポート検索など）は PostGIS 側で実行する。
 * このモジュールは UI / バリデーション用の軽量計算を提供する。
 */

/** 地球の平均半径（メートル） */
const EARTH_RADIUS_M = 6_371_000;

/** WGS84 の緯度経度ペア */
export interface LatLng {
  lat: number;
  lng: number;
}

const toRadians = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Haversine の式で2点間の球面距離（メートル）を返す。
 *
 * 精度はおおむね数十メートル以内。徒歩 / 数キロのレンジで十分。
 *
 * @returns 距離（メートル）
 */
export function haversineDistanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_M * c;
}

/** 緯度経度のバリデーション（WGS84 範囲） */
export function isValidLatLng(p: LatLng): boolean {
  return p.lat >= -90 && p.lat <= 90 && p.lng >= -180 && p.lng <= 180;
}
