import { notFound } from 'next/navigation';
import { eq, desc } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { getCommunityPost, incrementViewCount } from '@/lib/community/db';
import { getCurrentUser } from '@/lib/auth/current-user';
import { markdownToHtml } from '@/lib/markdown/toHtml';
import type { JobMetadata } from '@/lib/community/constants';
import { JobDetail, type JobDetailData } from '@/components/jobs/JobDetail';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props) {
  const post = await getCommunityPost(params.id);
  if (!post || post.kind !== 'job') return { title: '求人 — Locore' };
  return {
    title: `${post.title} — Locore 求人`,
    description:
      post.body.length > 140 ? post.body.slice(0, 137) + '…' : post.body,
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

export default async function JobDetailPage({ params }: Props) {
  const post = await getCommunityPost(params.id);
  if (!post || post.kind !== 'job') notFound();

  const me = await getCurrentUser();
  const isOwner = !!me && me.id === post.authorId;

  // 投稿者以外の閲覧でカウント
  if (!isOwner) {
    await incrementViewCount(post.id);
  }

  const verified = await getAuthorVerified(post.authorId);

  const data: JobDetailData = {
    id: post.id,
    title: post.title,
    body: markdownToHtml(post.body),
    status: post.status,
    locationText: post.locationText,
    cityNameJa: post.cityNameJa,
    priceAmount: post.priceAmount,
    priceCurrency: post.priceCurrency,
    priceUnit: post.priceUnit,
    metadata: (post.metadata as JobMetadata) ?? ({} as JobMetadata),
    createdAt: post.createdAt,
    expiresAt: post.expiresAt,
    contactEmail: post.contactEmail,
    authorId: post.authorId,
    authorName: post.authorName,
    authorAvatarUrl: post.authorAvatarUrl,
    authorVerified: verified,
  };

  return (
    <JobDetail post={data} viewerLoggedIn={Boolean(me)} isOwner={isOwner} />
  );
}
