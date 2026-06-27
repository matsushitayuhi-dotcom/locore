import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Hand,
  MapPin,
  Calendar,
  Clock,
  Gift,
  Zap,
  User,
  AlertTriangle,
} from 'lucide-react';
import { getCommunityPost, incrementViewCount } from '@/lib/community/db';
import { getCurrentUser } from '@/lib/auth/current-user';
import { markdownToHtml } from '@/lib/markdown/toHtml';
import { CommunityDisclaimer } from '@/components/community/CommunityDisclaimer';
import { ApplyButton } from '@/components/community/ApplyButton';
import type { CommunityAudience } from '@/lib/community/constants';
import { OwnerActions } from './OwnerActions';

export const dynamic = 'force-dynamic';

type RequestType = 'offer' | 'need';
const REQUEST_TYPE_LABEL: Record<RequestType, string> = {
  offer: '申し出ます',
  need: 'お願いしたい',
};
type Urgency = 'now' | 'this_week' | 'flexible';
const URGENCY_LABEL: Record<Urgency, string> = {
  now: '今すぐ',
  this_week: '今週中',
  flexible: '日程相談',
};
type Compensation = 'none' | 'small_thanks' | 'negotiable';
const COMPENSATION_LABEL: Record<Compensation, string> = {
  none: 'お礼不要',
  small_thanks: 'ちょっとしたお礼',
  negotiable: '相談',
};
type Category =
  | 'transport'
  | 'translation'
  | 'childcare'
  | 'pet_care'
  | 'admin_help'
  | 'moving_help'
  | 'other';
const CATEGORY_LABEL: Record<Category, string> = {
  transport: '送迎',
  translation: '翻訳',
  childcare: '子育て',
  pet_care: 'ペット',
  admin_help: '行政書類',
  moving_help: '引越し',
  other: 'その他',
};

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props) {
  const post = await getCommunityPost(params.id);
  if (!post || post.kind !== 'mutual_aid') return { title: '助け合い — Locore' };
  return {
    title: `${post.title} — Locore 助け合い`,
    description: post.body.length > 140 ? post.body.slice(0, 137) + '…' : post.body,
  };
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

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default async function HelpDetailPage({ params }: Props) {
  const post = await getCommunityPost(params.id);
  if (!post || post.kind !== 'mutual_aid') notFound();

  const me = await getCurrentUser();
  const isOwn = me?.id === post.authorId;
  if (!isOwn) {
    await incrementViewCount(post.id);
  }

  const meta = post.metadata as {
    request_type?: RequestType;
    urgency?: Urgency;
    compensation?: Compensation;
    category?: Category;
    audience?: CommunityAudience;
  };

  const bodyHtml = markdownToHtml(post.body);
  const closed = post.status === 'closed';
  const expDays = daysUntil(post.expiresAt);
  const isUrgent = meta.urgency === 'now';

  const applyLabel =
    meta.request_type === 'offer' ? 'お願いする' : 'お手伝いを申し出る';

  return (
    <main className="mx-auto max-w-screen-lg px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/help"
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
            この投稿は取り下げられました
          </p>
        </div>
      ) : null}

      {/* 緊急投稿には警告バー */}
      {isUrgent && !closed ? (
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-danger-500 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white">
          <Zap className="h-3 w-3" />
          緊急: 今すぐ対応希望
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-1 gap-8 sm:grid-cols-[1fr_280px]">
        <article className="min-w-0">
          <header>
            <div className="flex flex-wrap items-center gap-1.5">
              {meta.request_type ? (
                <span
                  className={
                    'rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ' +
                    (meta.request_type === 'offer'
                      ? 'bg-primary-500 text-neutral-950'
                      : 'bg-accent-500 text-neutral-950')
                  }
                >
                  {REQUEST_TYPE_LABEL[meta.request_type]}
                </span>
              ) : null}
              {meta.category ? (
                <span className="rounded-sm bg-foreground/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground/65">
                  {CATEGORY_LABEL[meta.category]}
                </span>
              ) : null}
              {meta.urgency ? (
                <span
                  className={
                    'inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ' +
                    (meta.urgency === 'now'
                      ? 'bg-danger-500 text-white'
                      : meta.urgency === 'this_week'
                        ? 'bg-warning-500/20 text-warning-500'
                        : 'bg-foreground/10 text-foreground/65')
                  }
                >
                  {meta.urgency === 'now' ? <Zap className="h-2.5 w-2.5" /> : null}
                  {URGENCY_LABEL[meta.urgency]}
                </span>
              ) : null}
            </div>

            <h1
              className="mt-3 text-[28px] font-bold leading-tight tracking-tight text-foreground"
            >
              {post.title}
            </h1>
          </header>

          <dl className="mt-5 grid grid-cols-1 gap-3 rounded-lg bg-card p-4 text-[12px] ring-1 ring-border sm:grid-cols-2">
            {post.locationText ? (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-300" />
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">
                    場所
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {post.locationText}
                  </dd>
                </div>
              </div>
            ) : null}
            {meta.compensation ? (
              <div className="flex items-start gap-2">
                <Gift className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-300" />
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">
                    お礼
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {COMPENSATION_LABEL[meta.compensation]}
                  </dd>
                </div>
              </div>
            ) : null}
            {meta.urgency ? (
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-300" />
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">
                    緊急度
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {URGENCY_LABEL[meta.urgency]}
                  </dd>
                </div>
              </div>
            ) : null}
            {meta.category ? (
              <div className="flex items-start gap-2">
                <Hand className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-300" />
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">
                    カテゴリ
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {CATEGORY_LABEL[meta.category]}
                  </dd>
                </div>
              </div>
            ) : null}
          </dl>

          <section className="mt-6">
            <h2 className="sr-only">詳細</h2>
            <div
              className="prose-locore"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          </section>

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
                  href={`/users/${post.authorId}`}
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

        <aside className="sm:sticky sm:top-6 sm:self-start">
          <div className="space-y-4 rounded-lg bg-card p-5 ring-1 ring-border">
            {/* 期限を目立たせる */}
            {expDays !== null ? (
              <div
                className={
                  'rounded-md p-3 ' +
                  (expDays <= 3
                    ? 'bg-danger-500/10 ring-1 ring-danger-500/30'
                    : 'bg-primary-500/5')
                }
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
                  掲載期限
                </p>
                <p
                  className={
                    'mt-1 text-[20px] font-bold leading-tight tabular ' +
                    (expDays <= 3 ? 'text-danger-500' : 'text-primary-300')
                  }
                >
                  {expDays >= 0 ? `あと ${expDays} 日` : '期限切れ'}
                </p>
                {expDays >= 0 && expDays <= 3 ? (
                  <p className="mt-1 text-[10px] text-danger-500">まもなく終了します</p>
                ) : null}
              </div>
            ) : null}

            <div className="border-t border-border pt-4">
              <ApplyButton
                postId={post.id}
                postTitle={post.title}
                applyLabel={applyLabel}
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
            </dl>

            <div className="rounded-md border border-amber-500/30 bg-amber-50/60 p-2.5 text-[10px] leading-relaxed text-amber-900">
              <p className="flex items-start gap-1 font-bold">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                やり取り前に
              </p>
              <p className="mt-0.5 pl-4">
                金銭・物品の事前要求があれば慎重に。個人宅訪問の依頼は信頼関係を築いてから。
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
        <CommunityDisclaimer kind="mutual_aid" />
      </footer>
    </main>
  );
}
