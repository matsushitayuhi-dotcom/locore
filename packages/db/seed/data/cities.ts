import type { NewCity } from '../../src/schema';

/**
 * 対応都市マスタ。
 * Phase 1 はフランス全土を active とし、書き手が記事を書ける状態にする。
 * 他国都市（NYC / London 等）は coming soon。
 */
export const seedCities: NewCity[] = [
  // フランス主要都市（active）
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
    slug: 'lyon',
    nameJa: 'リヨン',
    country: 'FR',
    lat: 45.764,
    lng: 4.8357,
    timezone: 'Europe/Paris',
    isActive: true,
  },
  {
    slug: 'marseille',
    nameJa: 'マルセイユ',
    country: 'FR',
    lat: 43.2965,
    lng: 5.3698,
    timezone: 'Europe/Paris',
    isActive: true,
  },
  {
    slug: 'nice',
    nameJa: 'ニース',
    country: 'FR',
    lat: 43.7102,
    lng: 7.262,
    timezone: 'Europe/Paris',
    isActive: true,
  },
  {
    slug: 'bordeaux',
    nameJa: 'ボルドー',
    country: 'FR',
    lat: 44.8378,
    lng: -0.5792,
    timezone: 'Europe/Paris',
    isActive: true,
  },
  {
    slug: 'toulouse',
    nameJa: 'トゥールーズ',
    country: 'FR',
    lat: 43.6047,
    lng: 1.4442,
    timezone: 'Europe/Paris',
    isActive: true,
  },
  {
    slug: 'strasbourg',
    nameJa: 'ストラスブール',
    country: 'FR',
    lat: 48.5734,
    lng: 7.7521,
    timezone: 'Europe/Paris',
    isActive: true,
  },
  {
    slug: 'lille',
    nameJa: 'リール',
    country: 'FR',
    lat: 50.6292,
    lng: 3.0573,
    timezone: 'Europe/Paris',
    isActive: true,
  },
  {
    slug: 'nantes',
    nameJa: 'ナント',
    country: 'FR',
    lat: 47.2184,
    lng: -1.5536,
    timezone: 'Europe/Paris',
    isActive: true,
  },
  {
    slug: 'montpellier',
    nameJa: 'モンペリエ',
    country: 'FR',
    lat: 43.6108,
    lng: 3.8767,
    timezone: 'Europe/Paris',
    isActive: true,
  },
  {
    slug: 'rennes',
    nameJa: 'レンヌ',
    country: 'FR',
    lat: 48.1173,
    lng: -1.6778,
    timezone: 'Europe/Paris',
    isActive: true,
  },

  // 他国（coming soon）
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
