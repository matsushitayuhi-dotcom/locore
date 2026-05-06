import type { NewCity } from '../../src/schema';

/**
 * 対応都市マスタの初期データ。
 * Phase 1 はパリのみ active。
 */
export const seedCities: NewCity[] = [
  {
    slug: 'paris',
    nameJa: 'パリ',
    country: 'FR',
    lat: 48.8566,
    lng: 2.3522,
    timezone: 'Europe/Paris',
    isActive: true,
  },
  {
    slug: 'london',
    nameJa: 'ロンドン',
    country: 'GB',
    lat: 51.5074,
    lng: -0.1278,
    timezone: 'Europe/London',
    isActive: false,
  },
  {
    slug: 'nyc',
    nameJa: 'ニューヨーク',
    country: 'US',
    lat: 40.7128,
    lng: -74.006,
    timezone: 'America/New_York',
    isActive: false,
  },
];
