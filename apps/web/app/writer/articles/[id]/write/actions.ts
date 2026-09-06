'use server';

import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { blocksSchema, blocksToPlainText, blocksHaveContent, newBlockId, type ArticleBlock } from '@/lib/articles/blocks';
import { classifyUrl } from '@/lib/articles/embeds';
import { fetchPreviewLite } from '@/lib/articles/editorial';
import { SPECIALTY_GROUPS } from '@/lib/experts/specialties';
import { getSiteUrl } from '@/lib/seo/siteUrl';

/**
 * ブロック形式の記事エディタ（/writer/articles/[id]/write）の Server Actions。0091。
 * - saveArticleBlocks: 本文・見出し情報の保存（自動保存と手動保存で共用）。body にはプレーンテキストも入れる
 * - publishBlocksArticle / unpublishBlocksArticle: 公開・非公開
 * - resolveUrlBlock: 段落に貼られた URL を link_card / embed ブロックに変換（プレビューはサーバーで取得）
 */

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

async function ownArticle(id: string) {
  const user = await requireUser();
  const db = getDb();
  const rows = await db
    .select({ id: schema.articles.id, writerId: schema.articles.writerId, status: schema.articles.status })
    .from(schema.articles)
    .where(eq(schema.articles.id, id))
    .limit(1);
  const a = rows[0];
  if (!a) return { ok: false as const, error: '記事が見つかりません' };
  if (a.writerId !== user.id && user.role !== 'editor') return { ok: false as const, error: '権限がありません' };
  return { ok: true as const, user, db, article: a };
}

const TOPIC_CODES = SPECIALTY_GROUPS.map((g) => g.code);

const saveSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().max(120),
  subtitle: z.string().trim().max(200).optional(),
  lead: z.string().trim().max(600).optional(),
  topic: z.string().trim().max(40).optional(),
  coverImageUrl: z.string().url().max(2048).optional().or(z.literal('')),
  blocks: blocksSchema,
});

export async function saveArticleBlocks(input: unknown): Promise<Result<{ savedAt: string }>> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '入力内容に誤りがあります（' + (parsed.error.issues[0]?.path.join('.') ?? '') + '）' };
  const d = parsed.data;
  const ctx = await ownArticle(d.id);
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const topic = d.topic && TOPIC_CODES.includes(d.topic) ? d.topic : null;
  const now = new Date();
  try {
    await ctx.db
      .update(schema.articles)
      .set({
        title: d.title || '新しい記事',
        subtitle: d.subtitle || null,
        lead: d.lead || null,
        topic,
        coverImageUrl: d.coverImageUrl || null,
        blocks: d.blocks,
        body: blocksToPlainText(d.blocks),
        bodyStyle: 'blocks',
        updatedAt: now,
      })
      .where(eq(schema.articles.id, d.id));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/does not exist/i.test(msg)) return { ok: false, error: 'DB が未更新です（0091）。運営に連絡してください' };
    throw err;
  }
  revalidatePath(`/articles/${d.id}`);
  return { ok: true, data: { savedAt: now.toISOString() } };
}

export async function publishBlocksArticle(input: unknown): Promise<Result> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正なリクエスト' };
  const ctx = await ownArticle(parsed.data.id);
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const rows = await ctx.db
    .select({ title: schema.articles.title, blocks: schema.articles.blocks, publishedAt: schema.articles.publishedAt })
    .from(schema.articles)
    .where(eq(schema.articles.id, parsed.data.id))
    .limit(1);
  const a = rows[0]!;
  const blocks = blocksSchema.safeParse(a.blocks ?? []);
  if (!a.title || a.title === '新しい記事') return { ok: false, error: 'タイトルを入れてください' };
  if (!blocks.success || !blocksHaveContent(blocks.data)) return { ok: false, error: '本文が短すぎます（100 文字以上）' };
  await ctx.db
    .update(schema.articles)
    .set({ status: 'published', publishedAt: a.publishedAt ?? new Date(), updatedAt: new Date() })
    .where(eq(schema.articles.id, parsed.data.id));
  revalidatePath(`/articles/${parsed.data.id}`);
  revalidatePath('/articles');
  revalidatePath('/writer/articles');
  return { ok: true };
}

export async function unpublishBlocksArticle(input: unknown): Promise<Result> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正なリクエスト' };
  const ctx = await ownArticle(parsed.data.id);
  if (!ctx.ok) return { ok: false, error: ctx.error };
  await ctx.db
    .update(schema.articles)
    .set({ status: 'draft', updatedAt: new Date() })
    .where(and(eq(schema.articles.id, parsed.data.id)));
  revalidatePath(`/articles/${parsed.data.id}`);
  revalidatePath('/articles');
  revalidatePath('/writer/articles');
  return { ok: true };
}

/** 段落に貼られた URL → link_card / embed ブロック。判定は classifyUrl、プレビューはサーバーで 1 回取得 */
export async function resolveUrlBlock(input: unknown): Promise<Result<ArticleBlock>> {
  const parsed = z.object({ url: z.string().url().max(2048) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'URL の形式が正しくありません' };
  await requireUser();
  let siteHost: string | null = null;
  try {
    siteHost = new URL(getSiteUrl()).hostname;
  } catch {
    siteHost = null;
  }
  const url = parsed.data.url;
  const k = classifyUrl(url, siteHost);
  if (!k) return { ok: false, error: 'URL の形式が正しくありません' };
  const id = newBlockId();
  if (k.kind === 'article') return { ok: true, data: { id, type: 'link_card', url, kind: 'article', targetId: k.id } };
  if (k.kind === 'expert') return { ok: true, data: { id, type: 'link_card', url, kind: 'expert', targetId: k.id } };
  if (k.kind === 'embed') {
    // YouTube / 地図はプレビュー無しでも描ける。SNS 系は oEmbed / OG を試す
    const preview = k.provider === 'gmap' ? null : await fetchPreviewLite(url);
    return { ok: true, data: { id, type: 'embed', url, provider: k.provider, videoId: k.videoId, preview: preview ?? undefined } };
  }
  const preview = await fetchPreviewLite(url);
  return { ok: true, data: { id, type: 'link_card', url, kind: 'external', preview: preview ?? undefined } };
}
