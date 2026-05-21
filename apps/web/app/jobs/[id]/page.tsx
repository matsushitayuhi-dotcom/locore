import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Clock,
  Wifi,
  Globe,
  Calendar,
  AlertTriangle,
  User,
} from 'lucide-react';
import { getCommunityPost, incrementViewCount } from '@/lib/community/db';
import { getCurrentUser } from '@/lib/auth/current-user';
import { markdownToHtml } from '@/lib/markdown/toHtml';
import { CommunityDisclaimer } from '@/components/community/CommunityDisclaimer';
import { ApplyButton } from '@/components/community/ApplyButton';
import { AudienceBadge } from '@/components/community/AudienceBadge';
import {
  JOB_EMPLOYMENT_TYPE_LABEL,
  JOB_CATEGORY_LABEL,
  type JobEmploymentType,
  type JobCategory,
  type CommunityAudience,
} from '@/lib/community/constants';
import { OwnerActions } from './OwnerActions';

export const dynamic = 'force-dynamic';

type Lang = 'ja' | 'fr' | 'en';
const LANG_LABEL: Record<Lang, string> = {
  ja: '日本語',
  fr: 'フランス語',
  en: '英語',
};

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

function formatSalary(post: {
  priceAmount: number | null;
  priceCurrency: string;
  priceUnit: string | null;
  metadata: Record<string, unknown>;
}): string | null {
  const meta = post.metadata as { salary_period?: string };
  if (!post.priceAmount) {
    if (meta.salary_period === 'negotiable') return '応相談';
    return null;
  }
  const period = meta.salary_period ?? post.priceUnit ?? 'monthly';
  const unitLabel =
    period === 'annual'
      ? '年収'
      : period === 'monthly'
        ? '月給'
        : period === 'hourly'
          ? '時給'
          : '';
  const currencySym = post.priceCurrency === 'JPY' ? '¥' : '€';
  const num = new Intl.NumberFormat('fr-FR').format(post.priceAmount);
  return `${unitLabel} ${currencySym}${num}`;
}

function formatPostedAt(d: string): string {
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

export default async function JobDetailPage({ params }: Props) {
  const post = await getCommunityPost(params.id);
  if (!post || post.kind !== 'job') notFound();

  const me = await getCurrentUser();
  const isOwn = me?.id === post.authorId;

  // 投稿者以外の閲覧でカウント
  if (!isOwn) {
    await incrementViewCount(post.id);
  }

  const meta = post.metadata as {
    employment_type?: JobEmploymentType;
    category?: JobCategory;
    salary_period?: string;
    language_requirements?: Lang[];
    remote_ok?: boolean;
    hours_per_week?: number;
    experience_required?: boolean;
    notes?: string;
    audience?: CommunityAudience;
  };

  const bodyHtml = markdownToHtml(post.body);
  const salary = formatSalary(post);
  const expDays = daysUntil(post.expiresAt);
  const expiringSoon = expDays !== null && expDays >= 0 && expDays <= 3;
  const closed = post.status === 'closed';

  return (
    <main className="mx-auto max-w-screen-lg px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        求人一覧に戻る
      </Link>

      {closed ? (
        <div
          role="status"
          className="mt-4 rounded-lg border border-foreground/20 bg-foreground/5 p-3 text-center"
        >
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-foreground/65">
            この求人は締切られました
          </p>
          <p className="mt-0.5 text-[11px] text-foreground/55">
            応募は受け付けていません
          </p>
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-1 gap-8 sm:grid-cols-[1fr_280px]">
        {/* 左カラム — 本文 */}
        <article className="min-w-0">
          <header>
            <div className="flex flex-wrap items-center gap-1.5">
              {meta.employment_type ? (
                <span className="rounded-sm bg-primary-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-300">
                  {JOB_EMPLOYMENT_TYPE_LABEL[meta.employment_type]}
                </span>
              ) : null}
              {meta.category ? (
                <span className="rounded-sm bg-foreground/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground/65">
                  {JOB_CATEGORY_LABEL[meta.category]}
                </span>
              ) : null}
              {meta.remote_ok ? (
                <span className="inline-flex items-center gap-0.5 rounded-sm bg-accent-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-500">
                  <Wifi className="h-2.5 w-2.5" />
                  Remote OK
                </span>
              ) : null}
              {meta.experience_required ? (
                <span className="rounded-sm bg-warning-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning-500">
                  経験者優遇
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

          {/* メタ情報グリッド */}
          <dl className="mt-5 grid grid-cols-1 gap-3 rounded-lg bg-card p-4 text-[12px] ring-1 ring-border sm:grid-cols-2">
            {post.locationText ? (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-300" />
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">
                    勤務地
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {post.locationText}
                  </dd>
                </div>
              </div>
            ) : null}

            {meta.hours_per_week ? (
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-300" />
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">
                    勤務時間
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    週 {meta.hours_per_week} 時間
                  </dd>
                </div>
              </div>
            ) : null}

            {meta.language_requirements && meta.language_requirements.length > 0 ? (
              <div className="flex items-start gap-2">
                <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-300" />
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">
                    必要言語
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {meta.language_requirements.map((l) => LANG_LABEL[l]).join(' / ')}
                  </dd>
                </div>
              </div>
            ) : null}

            {meta.employment_type ? (
              <div className="flex items-start gap-2">
                <Briefcase className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-300" />
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">
                    雇用形態
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {JOB_EMPLOYMENT_TYPE_LABEL[meta.employment_type]}
                  </dd>
                </div>
              </div>
            ) : null}
          </dl>

          {/* 本文 */}
          <section className="mt-6">
            <h2 className="sr-only">仕事の詳細</h2>
            <div
              className="prose-locore"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          </section>

          {/* 追加メモ */}
          {meta.notes ? (
            <section className="mt-6 rounded-lg border border-border bg-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
                投稿者からのメモ
              </p>
              <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-foreground/80">
                {meta.notes}
              </p>
            </section>
          ) : null}

          {/* 投稿者情報 */}
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

        {/* 右カラム — sticky サイドバー */}
        <aside className="sm:sticky sm:top-6 sm:self-start">
          <div className="space-y-4 rounded-lg bg-card p-5 ring-1 ring-border">
            {/* 給与 */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
                給与
              </p>
              <p
                className="mt-1 text-[22px] font-bold leading-tight text-primary-300"
              >
                {salary ?? '応相談'}
              </p>
            </div>

            {/* 応募ボタン */}
            <div className="border-t border-border pt-4">
              <ApplyButton
                postId={post.id}
                postTitle={post.title}
                viewerLoggedIn={Boolean(me)}
                isOwnPost={isOwn}
                closed={closed}
                contactEmail={post.contactEmail}
              />
            </div>

            {/* 日付メタ */}
            <dl className="space-y-2 border-t border-border pt-4 text-[11px]">
              <div className="flex items-start gap-2">
                <Calendar className="mt-0.5 h-3 w-3 shrink-0 text-foreground/45" />
                <div className="min-w-0 flex-1">
                  <dt className="text-foreground/55">投稿日</dt>
                  <dd className="font-medium text-foreground/80">
                    {formatPostedAt(post.createdAt)}
                  </dd>
                </div>
              </div>
              {expDays !== null ? (
                <div className="flex items-start gap-2">
                  <Clock
                    className={
                      'mt-0.5 h-3 w-3 shrink-0 ' +
                      (expiringSoon ? 'text-danger-500' : 'text-foreground/45')
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <dt className="text-foreground/55">掲載期限</dt>
                    <dd
                      className={
                        'tabular font-medium ' +
                        (expiringSoon
                          ? 'font-bold text-danger-500'
                          : 'text-foreground/80')
                      }
                    >
                      {expDays >= 0
                        ? `あと ${expDays}日${expiringSoon ? '（まもなく終了）' : ''}`
                        : '期限切れ'}
                    </dd>
                  </div>
                </div>
              ) : null}
            </dl>

            {/* 注意事項 */}
            <div className="rounded-md border border-amber-500/30 bg-amber-50/60 p-2.5 text-[10px] leading-relaxed text-amber-900">
              <p className="flex items-start gap-1 font-bold">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                応募前に
              </p>
              <p className="mt-0.5 pl-4">
                雇用条件は応募者と雇用主の間で直接確認してください。Locore は
                マッチングのみを行います。
              </p>
            </div>
          </div>

          {/* 投稿者メニュー */}
          {isOwn ? (
            <div className="mt-3 rounded-lg bg-card p-4 ring-1 ring-border">
              <OwnerActions postId={post.id} closed={closed} />
            </div>
          ) : null}
        </aside>
      </div>

      <footer className="mt-12">
        <CommunityDisclaimer kind="job" />
      </footer>
    </main>
  );
}
