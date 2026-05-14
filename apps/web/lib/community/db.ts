import 'server-only';
import { eq, and, desc, sql } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import type { CommunityKind, CommunityStatus } from './constants';

export type CommunityPostListItem = {
  id: string;
  kind: CommunityKind;
  title: string;
  body: string;
  authorId: string;
  authorName: string | null;
  authorAvatarUrl: string | null;
  locationText: string | null;
  priceAmount: number | null;
  priceCurrency: string;
  priceUnit: string | null;
  photos: string[];
  metadata: Record<string, unknown>;
  status: CommunityStatus;
  expiresAt: string | null;
  closedAt: string | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  /** 投稿者が公開しているメールアドレス。応募側は mailto: でも連絡可能 */
  contactEmail: string | null;
};

export type ListOpts = {
  kind: CommunityKind;
  limit?: number;
  /** active 以外も含めたい場合に true（投稿者本人用） */
  includeAllStatuses?: boolean;
  /** 投稿者で絞り込み */
  authorId?: string;
  /** city slug などで絞り込みたい場合は city_id で */
  cityId?: string;
};

export async function listCommunityPosts(
  opts: ListOpts,
): Promise<CommunityPostListItem[]> {
  try {
    const db = getDb();
    const filters = [eq(schema.communityPosts.kind, opts.kind)];
    if (!opts.includeAllStatuses) {
      filters.push(eq(schema.communityPosts.status, 'active'));
    }
    if (opts.authorId) {
      filters.push(eq(schema.communityPosts.authorId, opts.authorId));
    }
    if (opts.cityId) {
      filters.push(eq(schema.communityPosts.cityId, opts.cityId));
    }

    const rows = await db
      .select({
        id: schema.communityPosts.id,
        kind: schema.communityPosts.kind,
        title: schema.communityPosts.title,
        body: schema.communityPosts.body,
        authorId: schema.communityPosts.authorId,
        authorName: schema.users.displayName,
        authorAvatarUrl: schema.users.avatarUrl,
        locationText: schema.communityPosts.locationText,
        priceAmount: schema.communityPosts.priceAmount,
        priceCurrency: schema.communityPosts.priceCurrency,
        priceUnit: schema.communityPosts.priceUnit,
        photos: schema.communityPosts.photos,
        metadata: schema.communityPosts.metadata,
        status: schema.communityPosts.status,
        expiresAt: schema.communityPosts.expiresAt,
        closedAt: schema.communityPosts.closedAt,
        viewCount: schema.communityPosts.viewCount,
        contactEmail: schema.communityPosts.contactEmail,
        createdAt: schema.communityPosts.createdAt,
        updatedAt: schema.communityPosts.updatedAt,
      })
      .from(schema.communityPosts)
      .leftJoin(schema.users, eq(schema.users.id, schema.communityPosts.authorId))
      .where(and(...filters))
      .orderBy(desc(schema.communityPosts.createdAt))
      .limit(opts.limit ?? 50);

    return rows.map(
      (r): CommunityPostListItem => ({
        id: r.id,
        kind: r.kind as CommunityKind,
        title: r.title,
        body: r.body,
        authorId: r.authorId,
        authorName: r.authorName,
        authorAvatarUrl: r.authorAvatarUrl,
        locationText: r.locationText,
        priceAmount: r.priceAmount,
        priceCurrency: r.priceCurrency ?? 'EUR',
        priceUnit: r.priceUnit,
        photos: (r.photos as string[]) ?? [],
        metadata: (r.metadata as Record<string, unknown>) ?? {},
        status: r.status as CommunityStatus,
        expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
        closedAt: r.closedAt ? r.closedAt.toISOString() : null,
        viewCount: r.viewCount,
        contactEmail: r.contactEmail ?? null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }),
    );
  } catch (err) {
    console.warn('[listCommunityPosts] failed:', err);
    return [];
  }
}

export async function getCommunityPost(
  id: string,
): Promise<CommunityPostListItem | null> {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: schema.communityPosts.id,
        kind: schema.communityPosts.kind,
        title: schema.communityPosts.title,
        body: schema.communityPosts.body,
        authorId: schema.communityPosts.authorId,
        authorName: schema.users.displayName,
        authorAvatarUrl: schema.users.avatarUrl,
        locationText: schema.communityPosts.locationText,
        priceAmount: schema.communityPosts.priceAmount,
        priceCurrency: schema.communityPosts.priceCurrency,
        priceUnit: schema.communityPosts.priceUnit,
        photos: schema.communityPosts.photos,
        metadata: schema.communityPosts.metadata,
        status: schema.communityPosts.status,
        expiresAt: schema.communityPosts.expiresAt,
        closedAt: schema.communityPosts.closedAt,
        viewCount: schema.communityPosts.viewCount,
        contactEmail: schema.communityPosts.contactEmail,
        createdAt: schema.communityPosts.createdAt,
        updatedAt: schema.communityPosts.updatedAt,
      })
      .from(schema.communityPosts)
      .leftJoin(schema.users, eq(schema.users.id, schema.communityPosts.authorId))
      .where(eq(schema.communityPosts.id, id))
      .limit(1);

    const r = rows[0];
    if (!r) return null;

    return {
      id: r.id,
      kind: r.kind as CommunityKind,
      title: r.title,
      body: r.body,
      authorId: r.authorId,
      authorName: r.authorName,
      authorAvatarUrl: r.authorAvatarUrl,
      locationText: r.locationText,
      priceAmount: r.priceAmount,
      priceCurrency: r.priceCurrency ?? 'EUR',
      priceUnit: r.priceUnit,
      photos: (r.photos as string[]) ?? [],
      metadata: (r.metadata as Record<string, unknown>) ?? {},
      status: r.status as CommunityStatus,
      expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
      closedAt: r.closedAt ? r.closedAt.toISOString() : null,
      viewCount: r.viewCount,
      contactEmail: r.contactEmail ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  } catch (err) {
    console.warn('[getCommunityPost] failed:', err);
    return null;
  }
}

/** 閲覧カウンタを +1。失敗しても閲覧は止めない */
export async function incrementViewCount(id: string): Promise<void> {
  try {
    const db = getDb();
    await db
      .update(schema.communityPosts)
      .set({ viewCount: sql`${schema.communityPosts.viewCount} + 1` })
      .where(eq(schema.communityPosts.id, id));
  } catch {
    // noop
  }
}
