import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Calendar,
  AlertTriangle,
  User,
  Tag,
  Camera,
  Truck,
  PackageCheck,
} from 'lucide-react';
import { getCommunityPost, incrementViewCount } from '@/lib/community/db';
import { getCurrentUser } from '@/lib/auth/current-user';
import { markdownToHtml } from '@/lib/markdown/toHtml';
import { CommunityDisclaimer } from '@/components/community/CommunityDisclaimer';
import { ApplyButton } from '@/components/community/ApplyButton';
import { AudienceBadge } from '@/components/community/AudienceBadge';
import {
  MARKETPLACE_CONDITION_LABEL,
  MARKETPLACE_CATEGORY_LABEL,
  type MarketplaceCondition,
  type MarketplaceCategory,
  type CommunityAudience,
} from '@/lib/community/constants';
import { OwnerActions } from './OwnerActions';

export const dynamic = 'force-dynamic';

type Side = 'sell' | 'buy';
const SIDE_LABEL: Record<Side, string> = {
  sell: '売ります',
  buy: '買います',
};

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props) {
  const post = await getCommunityPost(params.id);
  if (!post || post.kind !== 'marketplace') return { title: '出品 — Locore' };
  return {
    title: `${post.title} — Locore 売ります・買います`,
    description:
      post.body.length > 140 ? post.body.slice(0, 137) + '…' : post.body,
  };
}

function formatPrice(post: {
  priceAmount: number | null;
  priceCurrency: string;
  priceUnit: string | null;
}): string | null {
  if (!post.priceAmount) {
    if (post.priceUnit === 'negotiable') return '応相談';
    return null;
  }
  const currencySym = post.priceCurrency === 'JPY' ? '¥' : '€';
  const num = new Intl.NumberFormat('fr-FR').format(post.priceAmount);
  const suffix = post.priceUnit === 'negotiable' ? '（応相談）' : '';
  return `${currencySym}${num}${suffix}`;
}

function formatDate(d: string): string {
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function MarketplaceDetailPage({ params }: Props) {
  const post = await getCommunityPost(params.id);
  if (!post || post.kind !== 'marketplace') notFound();

  const me = await getCurrentUser();
  const isOwn = me?.id === post.authorId;
  if (!isOwn) {
    await incrementViewCount(post.id);
  }

  const meta = post.metadata as {
    side?: Side;
    category?: MarketplaceCategory;
    condition?: MarketplaceCondition;
    pickup_required?: boolean;
    delivery_available?: boolean;
    audience?: CommunityAudience;
  };

  const bodyHtml = markdownToHtml(post.body);
  const price = formatPrice(post);
  const closed = post.status === 'closed';
  const hero = post.photos[0];
  const rest = post.photos.slice(1);

  return (
    <main className="mx-auto max-w-screen-lg px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        一覧に戻る
      </Link>

      {closed ? (
        <div
          role="status"
          className="mt-4 rounded-lg border border-foreground/20 bg-foreground/5 p-3 text-center"
        >
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-foreground/65">
            この出品は取り下げられました
          </p>
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-1 gap-8 sm:grid-cols-[1fr_280px]">
        <article className="min-w-0">
          {/* 写真ヒーロー */}
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
            {hero ? (
              <Image
                src={hero}
                alt={post.title}
                fill
                sizes="(min-width: 640px) 60vw, 100vw"
                className="object-cover"
                priority
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-foreground/30">
                <Camera className="h-10 w-10" />
              </div>
            )}
          </div>
          {rest.length > 0 ? (
            <div className="mt-2 grid grid-cols-4 gap-2">
              {rest.slice(0, 7).map((src, i) => (
                <div
                  key={i}
                  className="relative aspect-square overflow-hidden rounded-md bg-muted"
                >
                  <Image
                    src={src}
                    alt={`${post.title} - 写真 ${i + 2}`}
                    fill
                    sizes="20vw"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          ) : null}

          <header className="mt-5">
            <div className="flex flex-wrap items-center gap-1.5">
              {meta.side ? (
                <span
                  className={
                    'rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ' +
                    (meta.side === 'sell'
                      ? 'bg-primary-500 text-neutral-950'
                      : 'bg-accent-500 text-neutral-950')
                  }
                >
                  {SIDE_LABEL[meta.side]}
                </span>
              ) : null}
              {meta.category ? (
                <span className="rounded-sm bg-foreground/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground/65">
                  {MARKETPLACE_CATEGORY_LABEL[meta.category]}
                </span>
              ) : null}
              {meta.condition ? (
                <span className="rounded-sm bg-primary-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-300">
                  {MARKETPLACE_CONDITION_LABEL[meta.condition]}
                </span>
              ) : null}
              <AudienceBadge audience={meta.audience} size="md" />
            </div>

            <h1
              className="mt-3 text-[28px] font-bold leading-tight tracking-tight text-foreground"
            >
              {post.title}
            </h1>
          </header>

          {/* スペック */}
          <dl className="mt-5 grid grid-cols-1 gap-3 rounded-lg bg-card p-4 text-[12px] ring-1 ring-border sm:grid-cols-2">
            {post.locationText ? (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-300" />
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">
                    受け渡し場所
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {post.locationText}
                  </dd>
                </div>
              </div>
            ) : null}
            {meta.pickup_required ? (
              <div className="flex items-start gap-2">
                <PackageCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-300" />
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">
                    引き取り
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">引き取りのみ</dd>
                </div>
              </div>
            ) : null}
            {meta.delivery_available ? (
              <div className="flex items-start gap-2">
                <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-300" />
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">
                    配達
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">配達対応可（要相談）</dd>
                </div>
              </div>
            ) : null}
          </dl>

          {/* 本文 */}
          <section className="mt-6">
            <h2 className="sr-only">商品の詳細</h2>
            <div
              className="prose-locore"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          </section>

          {/* 投稿者 */}
          <section className="mt-6 flex items-center gap-3 rounded-lg border border-border bg-card p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-500/10 text-primary-300">
              {post.authorAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.authorAvatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
                投稿者
              </p>
              {post.authorId ? (
                <Link
                  href={`/residents/${post.authorId}`}
                  className="mt-0.5 inline-block text-[13px] font-bold text-foreground underline-offset-2 hover:text-primary-300 hover:underline"
                >
                  {post.authorName ?? 'Locore メンバー'}
                </Link>
              ) : (
                <p className="mt-0.5 text-[13px] font-bold text-foreground">
                  {post.authorName ?? 'Locore メンバー'}
                </p>
              )}
            </div>
          </section>
        </article>

        {/* サイドバー */}
        <aside className="sm:sticky sm:top-6 sm:self-start">
          <div className="space-y-4 rounded-lg bg-card p-5 ring-1 ring-border">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
                価格
              </p>
              <p
                className="mt-1 inline-flex items-baseline gap-1 text-[22px] font-bold leading-tight text-primary-300"
              >
                <Tag className="h-4 w-4 self-center" />
                {price ?? '応相談'}
              </p>
            </div>

            <div className="border-t border-border pt-4">
              <ApplyButton
                postId={post.id}
                postTitle={post.title}
                applyLabel="メッセージを送る"
                viewerLoggedIn={Boolean(me)}
                isOwnPost={isOwn}
                closed={closed}
                contactEmail={post.contactEmail}
              />
            </div>

            <dl className="space-y-2 border-t border-border pt-4 text-[11px]">
              <div className="flex items-start gap-2">
                <Calendar className="mt-0.5 h-3 w-3 shrink-0 text-foreground/45" />
                <div className="min-w-0 flex-1">
                  <dt className="text-foreground/55">投稿日</dt>
                  <dd className="font-medium text-foreground/80">
                    {formatDate(post.createdAt)}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 h-3 w-3 shrink-0 text-foreground/45" />
                <div className="min-w-0 flex-1">
                  <dt className="text-foreground/55">閲覧</dt>
                  <dd className="font-medium tabular text-foreground/80">
                    {post.viewCount}回
                  </dd>
                </div>
              </div>
            </dl>

            <div className="rounded-md border border-amber-500/30 bg-amber-50/60 p-2.5 text-[10px] leading-relaxed text-amber-900">
              <p className="flex items-start gap-1 font-bold">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                取引前に
              </p>
              <p className="mt-0.5 pl-4">
                高額品は対面 + 現金 / 銀行振込で。事前送金は詐欺リスクが高いです。
              </p>
            </div>
          </div>

          {isOwn ? (
            <div className="mt-3 rounded-lg bg-card p-4 ring-1 ring-border">
              <OwnerActions postId={post.id} closed={closed} />
            </div>
          ) : null}
        </aside>
      </div>

      <footer className="mt-12">
        <CommunityDisclaimer kind="marketplace" />
      </footer>
    </main>
  );
}
