import { notFound } from 'next/navigation';
import { eq, desc } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { getCommunityPost, incrementViewCount } from '@/lib/community/db';
import type { ApartmentMetadata } from '@/lib/community/constants';
import { getCurrentUser } from '@/lib/auth/current-user';
import { markdownToHtml } from '@/lib/markdown/toHtml';
import {
  ApartmentDetail,
  type ApartmentDetailData,
} from '@/components/apartments/ApartmentDetail';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props) {
  const post = await getCommunityPost(params.id);
  if (!post || post.kind !== 'apartment') return { title: 'アパート — Locore' };
  return {
    title: `${post.title} — アパート`,
    description: post.body.length > 140 ? post.body.slice(0, 137) + '…' : post.body,
  };
}

/**
 * 貸主の補足情報（bio / 在住年数 / 本人確認）を安全に取得。
 * 取得に失敗しても詳細ページは落とさない。
 */
async function getAuthorExtras(authorId: string): Promise<{
  bio: string | null;
  residencyYears: number | null;
  verified: boolean;
}> {
  const db = getDb();
  let bio: string | null = null;
  let residencyYears: number | null = null;
  let verified = false;
  try {
    const rows = await db
      .select({
        bio: schema.users.bio,
        residencyYears: schema.writerProfiles.residencyYears,
      })
      .from(schema.users)
      .leftJoin(
        schema.writerProfiles,
        eq(schema.writerProfiles.userId, schema.users.id),
      )
      .where(eq(schema.users.id, authorId))
      .limit(1);
    if (rows[0]) {
      bio = rows[0].bio ?? null;
      residencyYears = rows[0].residencyYears ?? null;
    }
  } catch {
    /* noop */
  }
  try {
    const rows = await db
      .select({ status: schema.residencyVerifications.status })
      .from(schema.residencyVerifications)
      .where(eq(schema.residencyVerifications.userId, authorId))
      .orderBy(desc(schema.residencyVerifications.submittedAt))
      .limit(1);
    verified = rows[0]?.status === 'approved';
  } catch {
    /* noop */
  }
  return { bio, residencyYears, verified };
}

export default async function ApartmentDetailPage({ params }: Props) {
  const post = await getCommunityPost(params.id);
  if (!post) notFound();
  if (post.kind !== 'apartment') notFound();

  // 閲覧カウンタ +1（失敗無視）
  await incrementViewCount(post.id);

  const me = await getCurrentUser();
  const isOwner = !!me && me.id === post.authorId;

  const extras = await getAuthorExtras(post.authorId);

  const data: ApartmentDetailData = {
    id: post.id,
    title: post.title,
    body: markdownToHtml(post.body),
    status: post.status,
    photos: post.photos ?? [],
    locationText: post.locationText,
    cityNameJa: post.cityNameJa,
    priceAmount: post.priceAmount,
    priceCurrency: post.priceCurrency,
    metadata: (post.metadata as ApartmentMetadata) ?? {},
    amenities: post.amenities ?? [],
    latitude: post.latitude,
    longitude: post.longitude,
    contactEmail: post.contactEmail,
    authorId: post.authorId,
    authorName: post.authorName,
    authorAvatarUrl: post.authorAvatarUrl,
    authorBio: extras.bio,
    authorResidencyYears: extras.residencyYears,
    authorVerified: extras.verified,
  };

  return (
    <ApartmentDetail post={data} viewerUserId={me?.id ?? null} isOwner={isOwner} />
  );
}
