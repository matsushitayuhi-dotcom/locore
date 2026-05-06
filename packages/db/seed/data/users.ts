import type { NewUser, NewWriterProfile } from '../../src/schema';

/**
 * シード用テストユーザー。
 * UUID は固定（再シード時に冪等にするため）。
 *
 * 本番では Supabase Auth が auth.users に行を作って
 * トリガで public.users に同期する想定だが、シード環境では直接 users に流す。
 */

export const SEED_USER_IDS = {
  reader: '11111111-1111-1111-1111-111111111111',
  writerS: '22222222-2222-2222-2222-222222222222',
  writerA: '33333333-3333-3333-3333-333333333333',
  writerB: '44444444-4444-4444-4444-444444444444',
  editor: '55555555-5555-5555-5555-555555555555',
} as const;

export const seedUsers: NewUser[] = [
  {
    id: SEED_USER_IDS.reader,
    email: 'reader@locore.test',
    displayName: 'テスト読者ゆうき',
    role: 'reader',
    bio: 'パリ旅行を計画中の読者。',
  },
  {
    id: SEED_USER_IDS.writerS,
    email: 'junko@locore.test',
    displayName: 'パリ在住じゅんこ',
    role: 'resident_writer',
    bio: '在仏12年。マレ地区の朝のビストロ巡りが趣味。',
  },
  {
    id: SEED_USER_IDS.writerA,
    email: 'yuto@locore.test',
    displayName: 'ベルヴィルゆうと',
    role: 'resident_writer',
    bio: 'パリ20区在住5年。市場と移民食文化の取材を続けている。',
  },
  {
    id: SEED_USER_IDS.writerB,
    email: 'haruka@locore.test',
    displayName: 'カルチエラタンはるか',
    role: 'resident_writer',
    bio: 'ワーホリでパリに来て1年半。学生街の老舗パン屋を巡るのが好き。',
  },
  {
    id: SEED_USER_IDS.editor,
    email: 'editor@locore.test',
    displayName: 'Locore 編集部',
    role: 'editor',
    bio: 'Locore 編集チーム。コレクションのキュレーション担当。',
  },
];

/**
 * writer_profiles：3人の書き手 (Tier S/A/B 各1)。
 * residency_verified_at は Tier S/A のみセット。
 */
export const seedWriterProfiles: NewWriterProfile[] = [
  {
    userId: SEED_USER_IDS.writerS,
    tier: 'S',
    residencyCountry: 'FR',
    residencyYears: 12,
    residencyVerifiedAt: new Date('2025-08-01T00:00:00Z'),
    foundingMember: true,
    foundingJoinedAt: new Date('2025-09-01T00:00:00Z'),
    foundingFeeWaiverUntil: new Date('2027-09-01T00:00:00Z'),
    foundingStatus: 'active',
    bio: '在仏12年、料理学校卒。',
  },
  {
    userId: SEED_USER_IDS.writerA,
    tier: 'A',
    residencyCountry: 'FR',
    residencyYears: 5,
    residencyVerifiedAt: new Date('2025-09-15T00:00:00Z'),
    foundingMember: false,
    bio: 'パリ20区在住、市場文化の取材中。',
  },
  {
    userId: SEED_USER_IDS.writerB,
    tier: 'B',
    residencyCountry: 'FR',
    residencyYears: 1,
    foundingMember: false,
    bio: 'ワーホリでパリへ。',
  },
];
