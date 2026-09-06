'use server';

import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { normalizeSpecialties } from '@/lib/experts/specialties';
import { fetchLinkPreview } from '@/lib/media/linkPreview';
import { LINK_DISPLAYS, detectKind } from '@/lib/media/display';

/**
 * プロフィール / SNS リンク 編集 Server Actions。
 *
 * 設計:
 *   - SNS リンクは「同じプラットフォームを複数登録可能」に変更（id 単位の CRUD）
 *   - writer 用 bio 編集は廃止（駐在員 / 読者でフォームを分けない方針）
 */

const SNS_PLATFORMS = [
  'tiktok',
  'instagram',
  'youtube',
  'x',
  'threads',
  'blog',
  'facebook',
  'note',
  'website',
  'email',
] as const;
type SnsPlatform = (typeof SNS_PLATFORMS)[number];

const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .url()
  .optional()
  .or(z.literal('').transform(() => undefined));

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1, '表示名を入力してください').max(50),
  bio: z.string().trim().max(500).optional().or(z.literal('').transform(() => undefined)),
  avatarUrl: optionalUrl,
});

export type UpdateProfileResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function updateProfile(input: unknown): Promise<UpdateProfileResult> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: '入力内容に誤りがあります',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const data = parsed.data;
  const user = await requireUser();
  const db = getDb();

  await db
    .update(schema.users)
    .set({
      displayName: data.displayName,
      bio: data.bio ?? null,
      avatarUrl: data.avatarUrl ?? null,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, user.id));

  // writer_profiles.bio は users.bio と一本化したので個別更新は廃止。
  // 既存の writer_profiles.bio は users.bio で上書き反映する。
  if (user.role === 'resident_writer' || user.role === 'editor') {
    await db
      .update(schema.writerProfiles)
      .set({ bio: data.bio ?? null, updatedAt: new Date() })
      .where(eq(schema.writerProfiles.userId, user.id));
  }

  revalidatePath('/settings/profile');
  // 公開プロフィールも再生成（自分のアバター / 表示名変更が反映される）
  revalidatePath(`/users/${user.id}`);
  return { ok: true };
}

// =============================================================================
// 駐在員プロフィール（出身地・在住・興味・探していること etc.）
// manual/0038_resident_profile_fields.sql で追加されたカラムを更新する。
// =============================================================================

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal('').transform(() => undefined));

const RESIDENT_FAMILY_STAGES = [
  'single',
  'couple',
  'family_kids',
  'empty_nest',
] as const;
const RESIDENT_LANGUAGE_LEVELS = [
  'native',
  'business',
  'conversation',
  'basic',
] as const;

const languageSchema = z.object({
  code: z.string().trim().min(2).max(8),
  level: z.enum(RESIDENT_LANGUAGE_LEVELS),
});

// ===== 経歴（学歴・職歴 / manual/0062_user_career_history.sql）=====
// 保存は offerings と同じ全置換方式。年はすべて任意（1950〜現在+1）。
const careerText = z
  .string()
  .trim()
  .max(80)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));
const careerYear = z
  .number()
  .int()
  .min(1950)
  .max(new Date().getFullYear() + 1)
  .optional()
  .nullable()
  .transform((v) => v ?? null);

const educationEntrySchema = z
  .object({
    school: z.string().trim().min(1, '学校名を入力してください').max(80),
    degree: careerText,
    field: careerText,
    startYear: careerYear,
    endYear: careerYear,
    /** 在学中（留学特化の在学生/アルムナイ判定）。true 時は endYear を無視 */
    current: z.boolean().optional().default(false),
    /** 大学マスタ（0081）の QID。オートコンプリート選択時のみ・自由入力は null */
    universityWikidataId: z
      .string()
      .trim()
      .regex(/^Q\d+$/)
      .nullable()
      .optional()
      .catch(null),
    /** 大学の英語名（オートコンプリート選択時のみ。表示は formatSchoolName） */
    schoolNameEn: z.string().trim().max(160).nullable().optional().catch(null),
    /** 出願年（留学特化・0087）。「合格実績」で年ごとにまとめる。任意 */
    applicationYear: careerYear,
  })
  .refine(
    (e) =>
      e.current ||
      e.startYear == null ||
      e.endYear == null ||
      e.startYear <= e.endYear,
    { message: '開始年は終了年以前にしてください', path: ['startYear'] },
  )
  .transform((e) => (e.current ? { ...e, endYear: null } : e));

/** 合格校（進学しなかった学校・0087）。進学校は education 側に applicationYear 付きで持つ */
const admissionEntrySchema = z.object({
  school: z.string().trim().min(1, '学校名を入力してください').max(80),
  degree: careerText,
  applicationYear: careerYear,
  universityWikidataId: z
    .string()
    .trim()
    .regex(/^Q\d+$/)
    .nullable()
    .optional()
    .catch(null),
  schoolNameEn: z.string().trim().max(160).nullable().optional().catch(null),
});

const workEntrySchema = z
  .object({
    company: z.string().trim().min(1, '会社・組織名を入力してください').max(80),
    title: careerText,
    startYear: careerYear,
    endYear: careerYear,
    current: z.boolean().optional().default(false),
  })
  .refine(
    (e) =>
      e.current ||
      e.startYear == null ||
      e.endYear == null ||
      e.startYear <= e.endYear,
    { message: '開始年は終了年以前にしてください', path: ['startYear'] },
  )
  // 「現在」チェック時は endYear を無視して null に正規化
  .transform((e) => (e.current ? { ...e, endYear: null } : e));

const updateResidentProfileSchema = z.object({
  homeCountry: optionalText(2),
  homeRegion: optionalText(80),
  residencyCountry: optionalText(2),
  residencyCity: optionalText(80),
  arrivalYear: z
    .number()
    .int()
    .min(1950)
    .max(new Date().getFullYear() + 1)
    .optional()
    .or(z.literal(0).transform(() => undefined))
    .or(z.null().transform(() => undefined)),
  familyStage: z
    .enum(RESIDENT_FAMILY_STAGES)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  occupation: optionalText(80),
  coverImageUrl: z
    .string()
    .trim()
    .max(2048)
    .url()
    .optional()
    .or(z.literal('').transform(() => undefined))
    .or(z.null().transform(() => undefined)),
  offerings: z.array(z.string().trim().min(1).max(120)).max(8).default([]),
  // 得意分野（0080）: 統制リスト外の code と上限超えは normalizeSpecialties で落とす
  specialties: z
    .array(z.string().trim().min(1).max(40))
    .max(30)
    .default([])
    .transform((v) => normalizeSpecialties(v)),
  education: z.array(educationEntrySchema).max(10).default([]),
  /** 合格校（進学しなかった学校・0087）。進学校は education 側（applicationYear） */
  admissions: z.array(admissionEntrySchema).max(10).default([]),
  workHistory: z.array(workEntrySchema).max(10).default([]),
  languages: z.array(languageSchema).max(8).default([]),
  interests: z.array(z.string().trim().min(1).max(30)).max(20).default([]),
  lookingFor: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  openToMeetups: z.boolean().default(false),
});

export async function updateResidentProfile(
  input: unknown,
): Promise<UpdateProfileResult> {
  const parsed = updateResidentProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: '入力内容に誤りがあります',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const data = parsed.data;
  const user = await requireUser();
  const db = getDb();

  await db
    .update(schema.users)
    .set({
      homeCountry: data.homeCountry ?? null,
      homeRegion: data.homeRegion ?? null,
      residencyCountry: data.residencyCountry ?? null,
      residencyCity: data.residencyCity ?? null,
      arrivalYear: data.arrivalYear ?? null,
      familyStage: data.familyStage ?? null,
      occupation: data.occupation ?? null,
      coverImageUrl: data.coverImageUrl ?? null,
      offerings: data.offerings,
      specialties: data.specialties,
      education: data.education,
      workHistory: data.workHistory,
      admissions: data.admissions,
      languages: data.languages,
      interests: data.interests,
      lookingFor: data.lookingFor,
      openToMeetups: data.openToMeetups,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, user.id));

  revalidatePath('/settings/profile');
  revalidatePath(`/users/${user.id}`);
  revalidatePath(`/users/${user.id}`);
  revalidatePath('/users');
  // 得意分野は /experts の列・カードにも出る
  revalidatePath('/experts');
  revalidatePath(`/experts/${user.id}`);
  return { ok: true };
}

// =============================================================================
// SNS リンク（同プラットフォーム複数 OK / id 単位 CRUD）
// =============================================================================

const addSnsSchema = z.object({
  platform: z.enum(SNS_PLATFORMS),
  url: z.string().trim().min(1).max(2048).url(),
});

/** 設定画面の行データ（0088 のプレビュー列を含む） */
export type SnsLinkRow = {
  id: string;
  platform: string;
  url: string;
  kind: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
  display: string;
  sortOrder: number;
  previewStatus: string | null;
};

export type SnsActionResult =
  | { ok: true; data?: SnsLinkRow }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function revalidateSns(userId: string) {
  revalidatePath('/settings/profile');
  revalidatePath(`/users/${userId}`);
  revalidatePath(`/experts/${userId}`);
}

/**
 * 新規追加（複数登録 OK）。追加時にプレビュー（OG / oEmbed）をサーバー側で 1 回取得して保存する。
 * 取得に失敗しても行は作る（title 手入力・表示は button に落ちる）。
 */
export async function addSnsLink(input: unknown): Promise<SnsActionResult> {
  const parsed = addSnsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: '入力内容に誤りがあります',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const { platform, url } = parsed.data;
  const user = await requireUser();
  const db = getDb();

  const preview = await fetchLinkPreview(platform, url).catch(() => null);
  const kind = preview?.kind ?? detectKind(platform, url);
  const row = {
    userId: user.id,
    platform: platform as SnsPlatform,
    url,
    kind,
    title: preview?.title ?? null,
    description: preview?.description ?? null,
    imageUrl: preview?.imageUrl ?? null,
    siteName: preview?.siteName ?? null,
    display: 'auto',
    sortOrder: 0,
    previewFetchedAt: new Date(),
    previewStatus: preview?.status ?? 'failed',
  };
  let inserted: { id: string }[];
  try {
    inserted = await db.insert(schema.snsLinks).values(row).returning({ id: schema.snsLinks.id });
  } catch (err) {
    // 0088 未適用環境: 従来の 3 列だけで保存
    const msg = err instanceof Error ? err.message : String(err);
    if (!/does not exist/i.test(msg)) throw err;
    inserted = await db
      .insert(schema.snsLinks)
      .values({ userId: user.id, platform: platform as SnsPlatform, url })
      .returning({ id: schema.snsLinks.id });
  }

  revalidateSns(user.id);
  return {
    ok: true,
    data: {
      id: inserted[0]!.id,
      platform,
      url,
      kind,
      title: row.title,
      description: row.description,
      imageUrl: row.imageUrl,
      siteName: row.siteName,
      display: 'auto',
      sortOrder: 0,
      previewStatus: row.previewStatus,
    },
  };
}

const updateSnsSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().max(160).nullable().optional(),
  display: z.enum(LINK_DISPLAYS).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

/** タイトル（本人の上書き）・表示形式・並び順の更新 */
export async function updateSnsLink(input: unknown): Promise<SnsActionResult> {
  const parsed = updateSnsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '入力内容に誤りがあります' };
  const user = await requireUser();
  const db = getDb();
  const { id, ...patch } = parsed.data;
  const set: Partial<typeof schema.snsLinks.$inferInsert> = { updatedAt: new Date() };
  if (patch.title !== undefined) set.title = patch.title ? patch.title : null;
  if (patch.display !== undefined) set.display = patch.display;
  if (patch.sortOrder !== undefined) set.sortOrder = patch.sortOrder;
  await db
    .update(schema.snsLinks)
    .set(set)
    .where(and(eq(schema.snsLinks.id, id), eq(schema.snsLinks.userId, user.id)));
  revalidateSns(user.id);
  return { ok: true };
}

/** プレビューの再取得（URL 先の OG 画像やタイトルが変わったとき用） */
export async function refreshSnsPreview(input: unknown): Promise<SnsActionResult> {
  const parsed = deleteByIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正なリクエスト' };
  const user = await requireUser();
  const db = getDb();
  const rows = await db
    .select({ id: schema.snsLinks.id, platform: schema.snsLinks.platform, url: schema.snsLinks.url, display: schema.snsLinks.display, sortOrder: schema.snsLinks.sortOrder })
    .from(schema.snsLinks)
    .where(and(eq(schema.snsLinks.id, parsed.data.id), eq(schema.snsLinks.userId, user.id)))
    .limit(1);
  const r = rows[0];
  if (!r) return { ok: false, error: 'リンクが見つかりません' };
  const preview = await fetchLinkPreview(r.platform, r.url).catch(() => null);
  if (!preview || preview.status !== 'ok') {
    await db
      .update(schema.snsLinks)
      .set({ previewFetchedAt: new Date(), previewStatus: 'failed', updatedAt: new Date() })
      .where(eq(schema.snsLinks.id, r.id));
    return { ok: false, error: 'プレビューを取得できませんでした（タイトルは手入力できます）' };
  }
  await db
    .update(schema.snsLinks)
    .set({
      kind: preview.kind,
      title: preview.title,
      description: preview.description,
      imageUrl: preview.imageUrl,
      siteName: preview.siteName,
      previewFetchedAt: new Date(),
      previewStatus: 'ok',
      updatedAt: new Date(),
    })
    .where(eq(schema.snsLinks.id, r.id));
  revalidateSns(user.id);
  return {
    ok: true,
    data: {
      id: r.id,
      platform: r.platform,
      url: r.url,
      kind: preview.kind,
      title: preview.title,
      description: preview.description,
      imageUrl: preview.imageUrl,
      siteName: preview.siteName,
      display: r.display,
      sortOrder: r.sortOrder,
      previewStatus: 'ok',
    },
  };
}

const deleteByIdSchema = z.object({
  id: z.string().uuid(),
});

/** id 指定で削除 */
export async function deleteSnsLink(input: unknown): Promise<SnsActionResult> {
  const parsed = deleteByIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: '不正なリクエスト' };
  }
  const user = await requireUser();
  const db = getDb();

  await db
    .delete(schema.snsLinks)
    .where(
      and(
        eq(schema.snsLinks.id, parsed.data.id),
        eq(schema.snsLinks.userId, user.id),
      ),
    );

  revalidateSns(user.id);
  return { ok: true };
}
