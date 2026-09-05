import 'server-only';
import { and, eq, gt, sql } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { CONSULTATION_TAG } from './constants';

/**
 * プロフィール完成度（公開関門・0084）の単一情報源。
 *
 * 必須（すべて満たすと公開できる）:
 *   ① 学歴 1 件以上（education）
 *   ② 得意分野 1 件以上（specialties・0080）
 *   ③ active な consultation タグ付き相談メニュー 1 件以上
 *   ④ 自己紹介（bio）非空
 * 推奨（公開は妨げない）:
 *   顔写真 / 今後の空き枠 1 件以上 / 本人確認の申請
 *
 * percent は必須4＋推奨3の 7 項目均等割。
 * /settings ハブの表示と publishProfile のサーバー再検証の両方がここを使う。
 */

export type SectionItem = {
  key: string;
  label: string;
  done: boolean;
  /** true = 推奨（公開は妨げない） */
  recommended: boolean;
};

export type SectionProgress = {
  items: SectionItem[];
  done: number;
  total: number;
  /** セクション内の均等割（0-100・四捨五入） */
  percent: number;
};

export type ProfileCompleteness = {
  required: {
    education: boolean;
    specialties: boolean;
    menu: boolean;
    bio: boolean;
  };
  recommended: {
    photo: boolean;
    availability: boolean;
    verification: boolean;
  };
  /**
   * セクション別内訳（/settings/services・/settings/availability の
   * ミニ進捗表示用。overall は従来どおりトップレベルの percent 等）:
   *   profile      = 学歴 / 得意分野 / 自己紹介 / 写真(推奨) → /settings/profile
   *   services     = 相談メニュー → /settings/services
   *   availability = 空き枠(推奨) → /settings/availability
   *   verification = 本人確認申請(推奨) → /settings/verification
   */
  sections: {
    profile: SectionProgress;
    services: SectionProgress;
    availability: SectionProgress;
    verification: SectionProgress;
  };
  /** 7 項目均等割（0-100・四捨五入）= overall percent */
  percent: number;
  canPublish: boolean;
  published: boolean;
  /** 未充足の必須項目ラベル（公開ボタンの不足列挙用） */
  missingLabels: string[];
};

function toSection(items: SectionItem[]): SectionProgress {
  const done = items.filter((i) => i.done).length;
  return {
    items,
    done,
    total: items.length,
    percent: items.length === 0 ? 100 : Math.round((done / items.length) * 100),
  };
}

const REQUIRED_LABELS: Record<keyof ProfileCompleteness['required'], string> = {
  education: '学校・学歴',
  specialties: '得意分野',
  menu: '相談メニュー',
  bio: '自己紹介',
};

/**
 * 対象エキスパートが公開済みか（予約・申込アクションのガード用）。
 *
 * フォールバック方針:
 *   - 「列が存在しない」（0084 未適用環境）のときだけ true（従来挙動＝全員公開）
 *   - それ以外のエラー（timeout / プール枯渇等の transient）は **フェイルクローズ**
 *     — false を返し、下書きエキスパートへの予約/申込をすり抜けさせない
 */
export async function isProfilePublished(userId: string): Promise<boolean> {
  try {
    const db = getDb();
    const rows = await db
      .select({ profilePublished: schema.users.profilePublished })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    return rows[0]?.profilePublished ?? false;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/column .* does not exist|does not exist/i.test(msg)) {
      console.warn(
        '[isProfilePublished] profile_published 未適用（0084）。公開扱いで続行します。',
      );
      return true;
    }
    console.error('[isProfilePublished] failed (fail-close):', err);
    return false;
  }
}

export async function getProfileCompleteness(
  userId: string,
): Promise<ProfileCompleteness> {
  const db = getDb();

  // users 行（bio / avatar / education / specialties / published）。
  // 旧環境で列が無い場合は false 側に倒す（公開関門としては安全側）。
  let bio = '';
  let avatarUrl: string | null = null;
  let educationCount = 0;
  let specialtiesCount = 0;
  let published = false;
  try {
    const rows = await db
      .select({
        bio: schema.users.bio,
        avatarUrl: schema.users.avatarUrl,
        education: schema.users.education,
        specialties: schema.users.specialties,
        profilePublished: schema.users.profilePublished,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    const u = rows[0];
    bio = u?.bio?.trim() ?? '';
    avatarUrl = u?.avatarUrl ?? null;
    educationCount = Array.isArray(u?.education) ? u!.education.length : 0;
    specialtiesCount = Array.isArray(u?.specialties)
      ? u!.specialties.length
      : 0;
    published = u?.profilePublished ?? false;
  } catch (err) {
    console.warn('[getProfileCompleteness] users fetch failed:', err);
  }

  // active な consultation メニュー
  let hasMenu = false;
  try {
    const rows = await db
      .select({ id: schema.userServices.id })
      .from(schema.userServices)
      .where(
        and(
          eq(schema.userServices.userId, userId),
          eq(schema.userServices.isActive, true),
          sql`${schema.userServices.tags} && ARRAY[${CONSULTATION_TAG}]::text[]`,
        ),
      )
      .limit(1);
    hasMenu = rows.length > 0;
  } catch (err) {
    console.warn('[getProfileCompleteness] menu fetch failed:', err);
  }

  // 今後の空き枠（推奨）
  let hasAvailability = false;
  try {
    const rows = await db
      .select({ id: schema.expertAvailability.id })
      .from(schema.expertAvailability)
      .where(
        and(
          eq(schema.expertAvailability.userId, userId),
          gt(schema.expertAvailability.startAt, new Date()),
        ),
      )
      .limit(1);
    hasAvailability = rows.length > 0;
  } catch (err) {
    console.warn('[getProfileCompleteness] availability fetch failed:', err);
  }

  // 本人確認の申請（推奨。承認済みでなく「申請したか」を見る）
  let hasVerification = false;
  try {
    const rows = await db
      .select({ id: schema.residencyVerifications.id })
      .from(schema.residencyVerifications)
      .where(eq(schema.residencyVerifications.userId, userId))
      .limit(1);
    hasVerification = rows.length > 0;
  } catch (err) {
    console.warn('[getProfileCompleteness] verification fetch failed:', err);
  }

  const required = {
    education: educationCount > 0,
    specialties: specialtiesCount > 0,
    menu: hasMenu,
    bio: bio.length > 0,
  };
  const recommended = {
    photo: !!avatarUrl,
    availability: hasAvailability,
    verification: hasVerification,
  };
  const done =
    Object.values(required).filter(Boolean).length +
    Object.values(recommended).filter(Boolean).length;
  const canPublish = Object.values(required).every(Boolean);
  const missingLabels = (
    Object.keys(required) as Array<keyof typeof required>
  )
    .filter((k) => !required[k])
    .map((k) => REQUIRED_LABELS[k]);

  const sections = {
    profile: toSection([
      { key: 'education', label: '学校・学歴', done: required.education, recommended: false },
      { key: 'specialties', label: '得意分野', done: required.specialties, recommended: false },
      { key: 'bio', label: '自己紹介', done: required.bio, recommended: false },
      { key: 'photo', label: '顔写真', done: recommended.photo, recommended: true },
    ]),
    services: toSection([
      { key: 'menu', label: '相談メニュー', done: required.menu, recommended: false },
    ]),
    availability: toSection([
      { key: 'availability', label: '空き時間', done: recommended.availability, recommended: true },
    ]),
    verification: toSection([
      { key: 'verification', label: '本人確認の申請', done: recommended.verification, recommended: true },
    ]),
  };

  return {
    required,
    recommended,
    sections,
    percent: Math.round((done / 7) * 100),
    canPublish,
    published,
    missingLabels,
  };
}
