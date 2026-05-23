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
  /** 国コード (countries.code) で絞り込み。
   *  cities -> countries の JOIN を経由する。/country/[code] タブ用。 */
  countryCode?: string;
};

export async function listCommunityPosts(
  opts: ListOpts,
): Promise<CommunityPostListItem[]> {
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
  if (opts.countryCode) {
    // cities.country_id 経由で countries.code をマッチする SQL サブクエリで絞り込み
    filters.push(
      sql`${schema.communityPosts.cityId} IN (
        SELECT c.id FROM cities c
        JOIN countries co ON co.id = c.country_id
        WHERE co.code = ${opts.countryCode.toLowerCase()}
      )`,
    );
  }

  // 基本 SELECT は contactEmail を含めて投げる。manual/0040 が未適用な
  // 環境では PostgreSQL 側で「column does not exist」になるので、
  // その場合だけ contactEmail を外して再試行する（安全フォールバック）。
  type FullRow = {
    id: string;
    kind: string;
    title: string;
    body: string;
    authorId: string;
    authorName: string | null;
    authorAvatarUrl: string | null;
    locationText: string | null;
    priceAmount: number | null;
    priceCurrency: string | null;
    priceUnit: string | null;
    photos: unknown;
    metadata: unknown;
    status: string;
    expiresAt: Date | null;
    closedAt: Date | null;
    viewCount: number;
    contactEmail: string | null;
    createdAt: Date;
    updatedAt: Date;
  };

  let rows: FullRow[];
  try {
    rows = (await db
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
      .limit(opts.limit ?? 50)) as FullRow[];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // contact_email 列が未作成 (manual/0040 未適用) のときの安全フォールバック
    if (/contact_email/i.test(msg) && /does not exist/i.test(msg)) {
      console.warn(
        '[listCommunityPosts] contact_email column missing — falling back. ' +
          'Please apply manual/0040_community_contact_email.sql.',
      );
      try {
        const partial = await db
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
            createdAt: schema.communityPosts.createdAt,
            updatedAt: schema.communityPosts.updatedAt,
          })
          .from(schema.communityPosts)
          .leftJoin(
            schema.users,
            eq(schema.users.id, schema.communityPosts.authorId),
          )
          .where(and(...filters))
          .orderBy(desc(schema.communityPosts.createdAt))
          .limit(opts.limit ?? 50);
        rows = partial.map((r) => ({ ...r, contactEmail: null })) as FullRow[];
      } catch (err2) {
        console.error('[listCommunityPosts] fallback also failed:', err2);
        return [];
      }
    } else {
      console.error('[listCommunityPosts] failed:', msg);
      return [];
    }
  }

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
}

export async function getCommunityPost(
  id: string,
): Promise<CommunityPostListItem | null> {
  const db = getDb();

  // contactEmail を含めた SELECT。manual/0040 未適用環境では fallback。
  type Row = {
    id: string;
    kind: string;
    title: string;
    body: string;
    authorId: string;
    authorName: string | null;
    authorAvatarUrl: string | null;
    locationText: string | null;
    priceAmount: number | null;
    priceCurrency: string | null;
    priceUnit: string | null;
    photos: unknown;
    metadata: unknown;
    status: string;
    expiresAt: Date | null;
    closedAt: Date | null;
    viewCount: number;
    contactEmail: string | null;
    createdAt: Date;
    updatedAt: Date;
  };

  let r: Row | undefined;
  try {
    const rows = (await db
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
      .limit(1)) as Row[];
    r = rows[0];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/contact_email/i.test(msg) && /does not exist/i.test(msg)) {
      try {
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
            createdAt: schema.communityPosts.createdAt,
            updatedAt: schema.communityPosts.updatedAt,
          })
          .from(schema.communityPosts)
          .leftJoin(
            schema.users,
            eq(schema.users.id, schema.communityPosts.authorId),
          )
          .where(eq(schema.communityPosts.id, id))
          .limit(1);
        r = rows[0] ? ({ ...rows[0], contactEmail: null } as Row) : undefined;
      } catch (err2) {
        console.error('[getCommunityPost] fallback failed:', err2);
        return null;
      }
    } else {
      console.error('[getCommunityPost] failed:', msg);
      return null;
    }
  }

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
