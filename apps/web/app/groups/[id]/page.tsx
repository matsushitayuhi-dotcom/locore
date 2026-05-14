import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  MapPin,
  Calendar,
  Repeat,
  UserCheck,
  User,
  AlertTriangle,
} from 'lucide-react';
import { getCommunityPost, incrementViewCount } from '@/lib/community/db';
import { getCurrentUser } from '@/lib/auth/current-user';
import { markdownToHtml } from '@/lib/markdown/toHtml';
import { CommunityDisclaimer } from '@/components/community/CommunityDisclaimer';
import { ApplyButton } from '@/components/community/ApplyButton';
import { OwnerActions } from './OwnerActions';

export const dynamic = 'force-dynamic';

type GroupCategory =
  | 'sport'
  | 'study'
  | 'hobby'
  | 'parenting'
  | 'language'
  | 'other';
const GROUP_CATEGORY_LABEL: Record<GroupCategory, string> = {
  sport: 'スポーツ',
  study: '勉強会',
  hobby: '趣味',
  parenting: '子育て',
  language: '言語交換',
  other: 'その他',
};

type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'one_off' | 'flexible';
const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: '毎週',
  biweekly: '隔週',
  monthly: '月 1 回',
  one_off: '単発',
  flexible: '随時',
};

type Level = 'beginner' | 'intermediate' | 'advanced' | 'any';
const LEVEL_LABEL: Record<Level, string> = {
  any: 'レベル問わず',
  beginner: '初心者',
  intermediate: '中級',
  advanced: '上級',
};

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props) {
  const post = await getCommunityPost(params.id);
  if (!post || post.kind !== 'group') return { title: 'メンバー募集 — Locore' };
  return {
    title: `${post.title} — Locore メンバー募集`,
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

export default async function GroupDetailPage({ params }: Props) {
  const post = await getCommunityPost(params.id);
  if (!post || post.kind !== 'group') notFound();

  const me = await getCurrentUser();
  const isOwn = me?.id === post.authorId;
  if (!isOwn) {
    await incrementViewCount(post.id);
  }

  const meta = post.metadata as {
    category?: GroupCategory;
    meeting_frequency?: Frequency;
    skill_level?: Level;
    group_size?: number;
    age_range?: string;
  };

  const bodyHtml = markdownToHtml(post.body);
  const closed = post.status === 'closed';
  const fee = post.priceAmount;

  return (
    <main className="mx-auto max-w-screen-lg px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/groups"
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
            この募集は締切られました
          </p>
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-1 gap-8 sm:grid-cols-[1fr_280px]">
        <article className="min-w-0">
          <header>
            <div className="flex flex-wrap items-center gap-1.5">
              {meta.category ? (
                <span className="rounded-sm bg-primary-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-300">
                  {GROUP_CATEGORY_LABEL[meta.category]}
                </span>
              ) : null}
              {meta.meeting_frequency ? (
                <span className="inline-flex items-center gap-0.5 rounded-sm bg-foreground/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground/65">
                  <Repeat className="h-2.5 w-2.5" />
                  {FREQUENCY_LABEL[meta.meeting_frequency]}
                </span>
              ) : null}
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
                    活動場所
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {post.locationText}
                  </dd>
                </div>
              </div>
            ) : null}
            {meta.meeting_frequency ? (
              <div className="flex items-start gap-2">
                <Repeat className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-300" />
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">
                    頻度
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {FREQUENCY_LABEL[meta.meeting_frequency]}
                  </dd>
                </div>
              </div>
            ) : null}
            {meta.group_size ? (
              <div className="flex items-start gap-2">
                <UserCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-300" />
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">
                    想定規模
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {meta.group_size} 名
                  </dd>
                </div>
              </div>
            ) : null}
            {meta.skill_level ? (
              <div className="flex items-start gap-2">
                <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-300" />
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">
                    レベル
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {LEVEL_LABEL[meta.skill_level]}
                  </dd>
                </div>
              </div>
            ) : null}
            {meta.age_range ? (
              <div className="flex items-start gap-2 sm:col-span-2">
                <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-300" />
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">
                    対象
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">{meta.age_range}</dd>
                </div>
              </div>
            ) : null}
          </dl>

          <section className="mt-6">
            <h2 className="sr-only">活動内容</h2>
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
                主催者
              </p>
              <p className="mt-0.5 text-[13px] font-bold text-foreground">
                {post.authorName ?? 'Locore メンバー'}
              </p>
            </div>
          </section>
        </article>

        <aside className="sm:sticky sm:top-6 sm:self-start">
          <div className="space-y-4 rounded-lg bg-card p-5 ring-1 ring-border">
            {fee && fee > 0 ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
                  会費
                </p>
                <p
                  className="mt-1 text-[20px] font-bold leading-tight text-primary-300"
                  style={{
                    fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
                  }}
                >
                  €{new Intl.NumberFormat('fr-FR').format(fee)} / 月
                </p>
              </div>
            ) : (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
                  参加
                </p>
                <p
                  className="mt-1 text-[20px] font-bold leading-tight text-primary-300"
                  style={{
                    fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
                  }}
                >
                  無料
                </p>
              </div>
            )}

            <div className="border-t border-border pt-4">
              <ApplyButton
                postId={post.id}
                applyLabel="参加を申し込む"
                viewerLoggedIn={Boolean(me)}
                isOwnPost={isOwn}
                closed={closed}
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
                参加前に
              </p>
              <p className="mt-0.5 pl-4">
                初回はカフェなど公共の場で。不安に感じたら参加を見送ってください。
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
        <CommunityDisclaimer kind="group" />
      </footer>
    </main>
  );
}
