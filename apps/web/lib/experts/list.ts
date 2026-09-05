import 'server-only';
import { inArray, sql } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { listServices } from '@/lib/services/list';
import { COMMON_LANGUAGES } from '@/lib/resident/constants';
import { getVerifiedUserIds } from '@/lib/residents/verification';
import { CONSULTATION_TAG } from './constants';
import { deriveEnrollment, type Enrollment } from './enrollment';

/**
 * /experts 一覧・トップの注目エキスパート用クエリヘルパ。
 *
 * 「エキスパート」= tags に 'consultation' を含む is_active な user_services
 * （相談メニュー）を 1 件以上持つユーザー。専用テーブルは作らず、
 * listServices の結果を ownerId でグルーピングして組み立てる。
 *
 * 居住認証は residency_verifications の最新申請が approved かどうか
 * （getResidentProfile と同じ判定）を userId IN (...) でまとめて引く。
 */

export type ExpertCard = {
  /** users.id — /experts/[id] の id はこれ */
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  /** 相談メニューの都市（cities.name_ja）。無ければ users.residency_city */
  cityNameJa: string | null;
  citySlug: string | null;
  /** ISO alpha-2 大文字（users.residency_country）。国旗絵文字用 */
  countryCode: string | null;
  /** 在住年数（users.arrival_year から算出）。不明なら null */
  yearsInCity: number | null;
  occupation: string | null;
  /** 表示用言語ラベル（例 ['日本語', 'フランス語']） */
  languages: string[];
  /** 相談テーマタグ（'consultation' を除いた集合） */
  topics: string[];
  /** 相談メニューの最低価格 */
  /** 単発メニューの最低価格（継続プランの月額は混ぜない） */
  minPriceJpy: number | null;
  /** 単発メニューの数（継続プランは含まない） */
  menuCount: number;
  isVerified: boolean;
  /** 在学生/アルムナイ（users.education から導出）。学歴未記入は null */
  enrollment?: Enrollment | null;
  /** 継続プラン（plan_kind='monthly'）を 1 本以上持つか（0083）。一覧バッジ用 */
  hasPlan: boolean;
};

export type ListExpertsOptions = {
  citySlug?: string;
  /** ISO alpha-2 lowercase（countries.code）。国ファーストフィルタ用 */
  countryCode?: string;
  /** TOPIC_TAGS の value。指定時はそのテーマのメニューを持つ人だけ */
  topic?: string;
  minPrice?: number;
  maxPrice?: number;
};

/** 国旗絵文字（ISO alpha-2 → regional indicator）。不正値は空文字。 */
export function countryFlagEmoji(code: string | null | undefined): string {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return '';
  const base = 0x1f1e6;
  const upper = code.toUpperCase();
  return String.fromCodePoint(
    base + (upper.charCodeAt(0) - 65),
    base + (upper.charCodeAt(1) - 65),
  );
}

export async function listExperts(
  opts: ListExpertsOptions = {},
): Promise<ExpertCard[]> {
  const { citySlug, countryCode, topic, minPrice, maxPrice } = opts;

  // 1. 相談メニューを全部引いて ownerId でグルーピング。
  //    価格フィルタは listServices に渡さない: メニュー単位で絞ると
  //    最低価格・メニュー数・テーマ集合が「フィルタ後の部分集合」に歪むため、
  //    集計は全メニューで行い、レンジ内メニューを 1 つでも持つ人だけを残す。
  //    limit=500 は既知のキャップ (メニュー 500 件超で後半のエキスパートが
  //    欠けうる)。MVP スケールでは十分で、超えたらページング化する。
  const { services } = await listServices({
    tags: [CONSULTATION_TAG],
    citySlug,
    countryCode,
    limit: 500,
    sort: 'price_asc',
  });

  // 継続プラン（plan_kind='monthly'）の service id 集合。0083 未適用環境では
  // 空集合フォールバック（全メニューを単発として扱う = 従来挙動）。
  const monthlyServiceIds = new Set<string>();
  try {
    const db = getDb();
    const rows = await db
      .select({ id: schema.userServices.id })
      .from(schema.userServices)
      .where(
        sql`${schema.userServices.planKind} = 'monthly' AND ${schema.userServices.isActive} = true AND ${schema.userServices.tags} && ARRAY[${CONSULTATION_TAG}]::text[]`,
      );
    for (const r of rows) monthlyServiceIds.add(r.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/does not exist/i.test(msg)) {
      console.warn('[listExperts] monthly services fetch failed:', err);
    }
  }

  type Group = {
    ownerId: string;
    displayName: string;
    avatarUrl: string | null;
    cityNameJa: string | null;
    citySlug: string | null;
    minPriceJpy: number | null;
    menuCount: number;
    topics: Set<string>;
    /** 価格レンジ指定時: レンジ内のメニューを 1 つでも持つか */
    hasPriceInRange: boolean;
    hasPlan: boolean;
  };
  const hasPriceFilter = minPrice != null || maxPrice != null;
  const inRange = (price: number | null): boolean => {
    if (price == null) return false;
    if (minPrice != null && price < minPrice) return false;
    if (maxPrice != null && price > maxPrice) return false;
    return true;
  };
  const groups = new Map<string, Group>();
  for (const s of services) {
    let g = groups.get(s.ownerId);
    if (!g) {
      g = {
        ownerId: s.ownerId,
        displayName: s.ownerDisplayName,
        avatarUrl: s.ownerAvatarUrl,
        cityNameJa: s.cityNameJa,
        citySlug: s.citySlug,
        minPriceJpy: null,
        menuCount: 0,
        topics: new Set(),
        hasPriceInRange: false,
        hasPlan: false,
      };
      groups.set(s.ownerId, g);
    }
    // 継続プラン（月額）は価格集計・メニュー数から除外し hasPlan だけ立てる
    // （単発の最低価格・価格フィルタに月額を混ぜない）。テーマ集合には加える。
    const isMonthly = monthlyServiceIds.has(s.id);
    if (isMonthly) {
      g.hasPlan = true;
    } else {
      g.menuCount += 1;
      if (
        s.priceJpy != null &&
        (g.minPriceJpy == null || s.priceJpy < g.minPriceJpy)
      ) {
        g.minPriceJpy = s.priceJpy;
      }
      if (inRange(s.priceJpy)) g.hasPriceInRange = true;
    }
    g.cityNameJa = g.cityNameJa ?? s.cityNameJa;
    g.citySlug = g.citySlug ?? s.citySlug;
    for (const t of s.tags) {
      if (t !== CONSULTATION_TAG) g.topics.add(t);
    }
  }

  // テーマ・価格フィルタ（tags overlap は OR なのでここで AND 条件をかける）
  let list = Array.from(groups.values());
  if (topic) {
    list = list.filter((g) => g.topics.has(topic));
  }
  if (hasPriceFilter) {
    list = list.filter((g) => g.hasPriceInRange);
  }
  if (list.length === 0) return [];

  const ownerIds = list.map((g) => g.ownerId);

  // 2+3. プロフィール（bio / 在住情報 / 言語）と居住認証は独立なので並列取得。
  //      居住認証は共通判定 getVerifiedUserIds（最新申請が approved）。
  type ProfileRow = {
    id: string;
    bio: string | null;
    residencyCountry: string | null;
    residencyCity: string | null;
    arrivalYear: number | null;
    occupation: string | null;
    languages: unknown;
  };
  const fetchProfiles = async (): Promise<Map<string, ProfileRow>> => {
    const map = new Map<string, ProfileRow>();
    try {
      // getDb() も try 内で呼ぶ（DATABASE_URL 未設定でも sitemap / build を壊さない）
      const db = getDb();
      const rows = await db
        .select({
          id: schema.users.id,
          bio: schema.users.bio,
          residencyCountry: schema.users.residencyCountry,
          residencyCity: schema.users.residencyCity,
          arrivalYear: schema.users.arrivalYear,
          occupation: schema.users.occupation,
          languages: schema.users.languages,
        })
        .from(schema.users)
        .where(inArray(schema.users.id, ownerIds));
      for (const r of rows) map.set(r.id, r as ProfileRow);
    } catch (err) {
      console.warn('[listExperts] users profile fetch failed:', err);
    }
    return map;
  };
  // 学歴（0062）は byId.ts と同じく分離クエリ:
  // 未適用環境で bio 等の本体 SELECT まで巻き込んで落とさないため。
  const fetchEnrollments = async (): Promise<Map<string, Enrollment | null>> => {
    const map = new Map<string, Enrollment | null>();
    try {
      const db = getDb();
      const rows = await db
        .select({
          id: schema.users.id,
          education: schema.users.education,
        })
        .from(schema.users)
        .where(inArray(schema.users.id, ownerIds));
      for (const r of rows) {
        map.set(
          r.id,
          deriveEnrollment(Array.isArray(r.education) ? r.education : null),
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/does not exist/i.test(msg)) {
        console.warn('[listExperts] education fetch failed:', err);
      }
    }
    return map;
  };
  const [profileById, verifiedIds, enrollmentById] = await Promise.all([
    fetchProfiles(),
    getVerifiedUserIds(ownerIds),
    fetchEnrollments(),
  ]);

  const cards: ExpertCard[] = list.map((g) => {
    const p = profileById.get(g.ownerId);
    const langCodes = Array.isArray(p?.languages)
      ? (p!.languages as Array<{ code: string }>)
      : [];
    const languages = langCodes
      .map(
        (l) => COMMON_LANGUAGES.find((x) => x.code === l.code)?.label ?? l.code,
      )
      .filter(Boolean);
    const yearsInCity =
      p?.arrivalYear != null
        ? Math.max(0, new Date().getFullYear() - p.arrivalYear)
        : null;
    return {
      userId: g.ownerId,
      displayName: g.displayName,
      avatarUrl: g.avatarUrl,
      bio: p?.bio ?? null,
      cityNameJa: g.cityNameJa ?? p?.residencyCity ?? null,
      citySlug: g.citySlug,
      countryCode: p?.residencyCountry ?? null,
      yearsInCity,
      occupation: p?.occupation ?? null,
      languages,
      topics: Array.from(g.topics),
      minPriceJpy: g.minPriceJpy,
      menuCount: g.menuCount,
      isVerified: verifiedIds.has(g.ownerId),
      enrollment: enrollmentById.get(g.ownerId) ?? null,
      hasPlan: g.hasPlan,
    };
  });

  // 認証済みを先に。同区分内は元の並び（価格昇順ベース）を維持
  cards.sort((a, b) => Number(b.isVerified) - Number(a.isVerified));
  return cards;
}

/**
 * ユーザーが「エキスパート」（tags に 'consultation' を含む is_active な
 * 相談メニューを 1 件以上出品）かどうかの軽量判定。limit 1 の存在チェックのみで、
 * メニュー一覧を全件引かない。0055 (tags 列) 未適用環境は false フォールバック。
 */
export async function isExpertUser(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const db = getDb();
    const rows = await db
      .select({ id: schema.userServices.id })
      .from(schema.userServices)
      .where(
        sql`${schema.userServices.userId} = ${userId} AND ${schema.userServices.isActive} = true AND ${schema.userServices.tags} && ARRAY[${CONSULTATION_TAG}]::text[]`,
      )
      .limit(1);
    return rows.length > 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/does not exist/i.test(msg)) {
      console.warn('[isExpertUser] failed:', err);
    }
    return false;
  }
}

/** トップページの「注目エキスパート」。認証済み優先で limit 件。 */
export async function listFeaturedExperts(limit = 6): Promise<ExpertCard[]> {
  const cards = await listExperts({});
  return cards.slice(0, limit);
}

/** /experts の都市フィルタ選択肢（相談メニューが存在する都市だけ）。 */
export type ExpertCity = { slug: string; nameJa: string };

export async function listExpertCities(
  countryCode?: string,
): Promise<ExpertCity[]> {
  try {
    const db = getDb();
    const rows = await db
      .selectDistinct({
        slug: schema.cities.slug,
        nameJa: schema.cities.nameJa,
      })
      .from(schema.userServices)
      .innerJoin(
        schema.cities,
        sql`${schema.cities.id} = ${schema.userServices.cityId}`,
      )
      .leftJoin(
        schema.countries,
        sql`${schema.countries.id} = ${schema.cities.countryId}`,
      )
      .where(
        sql`${schema.userServices.isActive} = true AND ${schema.userServices.tags} && ARRAY[${CONSULTATION_TAG}]::text[]${
          countryCode ? sql` AND ${schema.countries.code} = ${countryCode}` : sql``
        }`,
      );
    return rows.sort((a, b) => a.nameJa.localeCompare(b.nameJa, 'ja'));
  } catch (err) {
    console.warn('[listExpertCities] failed:', err);
    return [];
  }
}

/** /experts の国フィルタ選択肢（相談メニューが存在する国だけ・人数つき）。 */
export type ExpertCountry = {
  /** countries.code（lowercase alpha-2） */
  code: string;
  nameJa: string;
  /** 国旗絵文字 */
  emoji: string;
  /** その国に相談メニューを持つエキスパートの人数 */
  expertCount: number;
};

export async function listExpertCountries(): Promise<ExpertCountry[]> {
  try {
    const db = getDb();
    const result = await db.execute(sql`
      SELECT co.code AS code, co.name_ja AS name_ja,
             COUNT(DISTINCT us.user_id)::int AS cnt
        FROM user_services us
        INNER JOIN users u ON u.id = us.user_id AND u.deleted_at IS NULL
        INNER JOIN cities c ON c.id = us.city_id
        INNER JOIN countries co ON co.id = c.country_id
       WHERE us.is_active = true
         AND us.tags && ARRAY[${CONSULTATION_TAG}]::text[]
       GROUP BY co.code, co.name_ja
       ORDER BY cnt DESC, co.code ASC
    `);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = result;
    const rows: Array<{ code?: unknown; name_ja?: unknown; cnt?: unknown }> =
      Array.isArray(raw) ? raw : raw?.rows ?? [];
    const out: ExpertCountry[] = [];
    for (const r of rows) {
      if (typeof r.code !== 'string' || typeof r.name_ja !== 'string') continue;
      const count = typeof r.cnt === 'number' ? r.cnt : Number(r.cnt);
      out.push({
        code: r.code,
        nameJa: r.name_ja,
        emoji: countryFlagEmoji(r.code),
        expertCount: Number.isFinite(count) ? count : 0,
      });
    }
    return out;
  } catch (err) {
    console.warn('[listExpertCountries] failed:', err);
    return [];
  }
}
