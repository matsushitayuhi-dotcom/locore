import { notFound } from 'next/navigation';
import { eq, desc } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { getCommunityPost, incrementViewCount } from '@/lib/community/db';
import { getCurrentUser } from '@/lib/auth/current-user';
import { getEventRsvpSummary } from '@/lib/community/rsvp';
import { markdownToHtml } from '@/lib/markdown/toHtml';
import type { GroupMetadata } from '@/lib/community/constants';
import { GroupDetail, type GroupDetailData } from '@/components/groups/GroupDetail';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props) {
  const post = await getCommunityPost(params.id);
  if (!post || post.kind !== 'group') return { title: '集まり — Locore' };
  return {
    title: `${post.title} — Locore 集まり`,
    description: post.body.length > 140 ? post.body.slice(0, 137) + '…' : post.body,
  };
}

/** 投稿者の本人確認ステータスを安全に取得（失敗してもページは落とさない） */
async function getAuthorVerified(authorId: string): Promise<boolean> {
  try {
    const db = getDb();
    const rows = await db
      .select({ status: schema.residencyVerifications.status })
      .from(schema.residencyVerifications)
      .where(eq(schema.residencyVerifications.userId, authorId))
      .orderBy(desc(schema.residencyVerifications.submittedAt))
      .limit(1);
    return rows[0]?.status === 'approved';
  } catch {
    return false;
  }
}

export default async function GroupDetailPage({ params }: Props) {
  const post = await getCommunityPost(params.id);
  if (!post || post.kind !== 'group') notFound();

  const me = await getCurrentUser();
  const isOwner = !!me && me.id === post.authorId;

  if (!isOwner) {
    await incrementViewCount(post.id);
  }

  const [verified, rsvp] = await Promise.all([
    getAuthorVerified(post.authorId),
    getEventRsvpSummary(post.id, me?.id ?? null),
  ]);

  const data: GroupDetailData = {
    id: post.id,
    title: post.title,
    body: markdownToHtml(post.body),
    status: post.status,
    photos: post.photos ?? [],
    locationText: post.locationText,
    cityNameJa: post.cityNameJa,
    latitude: post.latitude,
    longitude: post.longitude,
    priceAmount: post.priceAmount,
    priceCurrency: post.priceCurrency,
    metadata: (post.metadata as GroupMetadata) ?? ({} as GroupMetadata),
    createdAt: post.createdAt,
    contactEmail: post.contactEmail,
    authorId: post.authorId,
    authorName: post.authorName,
    authorAvatarUrl: post.authorAvatarUrl,
    authorVerified: verified,
  };

  return (
    <GroupDetail post={data} viewerLoggedIn={Boolean(me)} isOwner={isOwner} rsvp={rsvp} />
  );
}
