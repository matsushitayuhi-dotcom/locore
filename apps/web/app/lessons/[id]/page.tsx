import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  GraduationCap,
  MapPin,
  Calendar,
  Wifi,
  Coffee,
  Tag,
  User,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { getCommunityPost, incrementViewCount } from '@/lib/community/db';
import { getCurrentUser } from '@/lib/auth/current-user';
import { markdownToHtml } from '@/lib/markdown/toHtml';
import { CommunityDisclaimer } from '@/components/community/CommunityDisclaimer';
import { ApplyButton } from '@/components/community/ApplyButton';
import { AudienceBadge } from '@/components/community/AudienceBadge';
import type { CommunityAudience } from '@/lib/community/constants';
import { OwnerActions } from './OwnerActions';

export const dynamic = 'force-dynamic';

type Side = 'teach' | 'learn';
const SIDE_LABEL: Record<Side, string> = {
  teach: '教えます',
  learn: '習いたい',
};
type Format = 'in_person' | 'online' | 'both';
const FORMAT_LABEL: Record<Format, string> = {
  in_person: '対面',
  online: 'オンライン',
  both: '対面 / オンライン',
};
type Level = 'beginner' | 'intermediate' | 'advanced' | 'any';
const LEVEL_LABEL: Record<Level, string> = {
  any: 'レベル問わず',
  beginner: '初心者',
  intermediate: '中級',
  advanced: '上級',
};
type LessonCategory =
  | 'language'
  | 'music'
  | 'cooking'
  | 'art'
  | 'sport'
  | 'study_aid'
  | 'other';
const LESSON_CATEGORY_LABEL: Record<LessonCategory, string> = {
  language: '語学',
  music: '音楽',
  cooking: '料理',
  art: 'アート',
  sport: 'スポーツ',
  study_aid: '勉強サポート',
  other: 'その他',
};

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props) {
  const post = await getCommunityPost(params.id);
  if (!post || post.kind !== 'lesson') return { title: 'レッスン — Locore' };
  return {
    title: `${post.title} — Locore 教えます・習います`,
    description: post.body.length > 140 ? post.body.slice(0, 137) + '…' : post.body,
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
  const suffix =
    post.priceUnit === 'monthly'
      ? ' / 月'
      : post.priceUnit === 'per_session'
        ? ' / 1 回'
        : post.priceUnit === 'hourly'
          ? ' / 時'
          : '';
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

export default async function LessonDetailPage({ params }: Props) {
  const post = await getCommunityPost(params.id);
  if (!post || post.kind !== 'lesson') notFound();

  const me = await getCurrentUser();
  const isOwn = me?.id === post.authorId;
  if (!isOwn) {
    await incrementViewCount(post.id);
  }

  const meta = post.metadata as {
    side?: Side;
    category?: LessonCategory;
    format?: Format;
    level?: Level;
    trial_available?: boolean;
    max_students?: number;
    audience?: CommunityAudience;
  };

  const bodyHtml = markdownToHtml(post.body);
  const price = formatPrice(post);
  const closed = post.status === 'closed';

  // side によってボタン文言とサイドバー見出しを変える
  const applyLabel =
    meta.side === 'teach' ? 'レッスンに申し込む' : 'お申し出する';

  return (
    <main className="mx-auto max-w-screen-lg px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/lessons"
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
            この投稿は締切られました
          </p>
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-1 gap-8 sm:grid-cols-[1fr_280px]">
        <article className="min-w-0">
          <header>
            <div className="flex flex-wrap items-center gap-1.5">
              {meta.side ? (
                <span
                  className={
                    'rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ' +
                    (meta.side === 'teach'
                      ? 'bg-primary-500 text-neutral-950'
                      : 'bg-accent-500 text-neutral-950')
                  }
                >
                  {SIDE_LABEL[meta.side]}
                </span>
              ) : null}
              {meta.category ? (
                <span className="rounded-sm bg-foreground/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground/65">
                  {LESSON_CATEGORY_LABEL[meta.category]}
                </span>
              ) : null}
              {meta.format ? (
                <span className="inline-flex items-center gap-0.5 rounded-sm bg-primary-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-300">
                  {meta.format === 'online' ? <Wifi className="h-2.5 w-2.5" /> : null}
                  {FORMAT_LABEL[meta.format]}
                </span>
              ) : null}
              {meta.trial_available ? (
                <span className="inline-flex items-center gap-0.5 rounded-sm bg-accent-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-500">
                  <Coffee className="h-2.5 w-2.5" />
                  体験あり
                </span>
              ) : null}
              <AudienceBadge audience={meta.audience} size="md" />
            </div>

            <h1
              className="mt-3 text-[28px] font-bold leading-tight tracking-tight text-foreground"
              style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
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
            {meta.format ? (
              <div className="flex items-start gap-2">
                <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-300" />
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">
                    形式
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {FORMAT_LABEL[meta.format]}
                  </dd>
                </div>
              </div>
            ) : null}
            {meta.level ? (
              <div className="flex items-start gap-2">
                <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-300" />
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">
                    対象レベル
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {LEVEL_LABEL[meta.level]}
                  </dd>
                </div>
              </div>
            ) : null}
            {meta.max_students ? (
              <div className="flex items-start gap-2">
                <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-300" />
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">
                    最大人数
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {meta.max_students} 名
                  </dd>
                </div>
              </div>
            ) : null}
          </dl>

          <section className="mt-6">
            <h2 className="sr-only">レッスン詳細</h2>
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
                {meta.side === 'teach' ? '講師' : '生徒希望者'}
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

        <aside className="sm:sticky sm:top-6 sm:self-start">
          <div className="space-y-4 rounded-lg bg-card p-5 ring-1 ring-border">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
                料金
              </p>
              <p
                className="mt-1 inline-flex items-baseline gap-1 text-[22px] font-bold leading-tight text-primary-300"
                style={{
                  fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
                }}
              >
                <Tag className="h-4 w-4 self-center" />
                {price ?? '応相談'}
              </p>
            </div>

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
                申込前に
              </p>
              <p className="mt-0.5 pl-4">
                初回は体験 / カフェなど公共の場で。前払いは慎重に。
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
        <CommunityDisclaimer kind="lesson" />
      </footer>
    </main>
  );
}
