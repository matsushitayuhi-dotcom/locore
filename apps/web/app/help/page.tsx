import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Hand,
  MapPin,
  Clock,
  Zap,
  Gift,
} from 'lucide-react';
import { CommunityNav } from '@/components/community/CommunityNav';
import { CommunityDisclaimer } from '@/components/community/CommunityDisclaimer';
import { CommunityRegionPicker } from '@/components/community/CommunityRegionPicker';
import { listCommunityPosts, type CommunityPostListItem } from '@/lib/community/db';
import { resolveCommunityRegion } from '@/lib/community/region-filter';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '助け合い — Locore',
  description:
    'フランス在住の駐在員コミュニティの相互扶助掲示板。空港送迎、書類翻訳、子供の一時預かりなど。',
};

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
const CATEGORIES: Category[] = [
  'transport',
  'translation',
  'childcare',
  'pet_care',
  'admin_help',
  'moving_help',
  'other',
];
const CATEGORY_LABEL: Record<Category, string> = {
  transport: '送迎',
  translation: '翻訳',
  childcare: '子育て',
  pet_care: 'ペット',
  admin_help: '行政書類',
  moving_help: '引越し',
  other: 'その他',
};

type Props = {
  searchParams?: {
    type?: string;
    urg?: string;
    cat?: string;
    region?: string;
  };
};

function formatPostedAt(d: string): string {
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const h = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
  if (h < 1) return 'たった今';
  if (h < 24) return `${h}時間前`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day}日前`;
  return `${Math.floor(day / 30)}ヶ月前`;
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default async function HelpIndexPage({ searchParams }: Props) {
  const activeType = ((): RequestType | undefined => {
    if (searchParams?.type === 'offer' || searchParams?.type === 'need')
      return searchParams.type;
    return undefined;
  })();
  const activeUrg = ((): Urgency | undefined => {
    if (
      searchParams?.urg === 'now' ||
      searchParams?.urg === 'this_week' ||
      searchParams?.urg === 'flexible'
    )
      return searchParams.urg;
    return undefined;
  })();
  const activeCat =
    searchParams?.cat && (CATEGORIES as string[]).includes(searchParams.cat)
      ? (searchParams.cat as Category)
      : undefined;

  const regionFilter = await resolveCommunityRegion(searchParams?.region);

  const rawPosts = await listCommunityPosts({
    kind: 'mutual_aid',
    limit: 80,
    cityId: regionFilter.cityId,
  });

  const filtered = rawPosts.filter((p) => {
    const meta = p.metadata as {
      request_type?: RequestType;
      urgency?: Urgency;
      category?: Category;
    };
    if (activeType && meta.request_type !== activeType) return false;
    if (activeUrg && meta.urgency !== activeUrg) return false;
    if (activeCat && meta.category !== activeCat) return false;
    return true;
  });

  const buildHref = (overrides: Record<string, string | undefined | null>) => {
    const params = new URLSearchParams();
    if (activeType) params.set('type', activeType);
    if (activeUrg) params.set('urg', activeUrg);
    if (activeCat) params.set('cat', activeCat);
    if (regionFilter.active) params.set('region', regionFilter.slug);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null || v === undefined || v === '') params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/help?${qs}` : '/help';
  };

  return (
    <main className="mx-auto max-w-screen-md px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        ホームに戻る
      </Link>

      <div className="mt-4">
        <CommunityNav active="mutual_aid" />
      </div>

      <div className="mt-3">
        <CommunityRegionPicker
          basePath="/help"
          activeSlug={regionFilter.slug}
          preserveQuery={{
            type: activeType,
            urg: activeUrg,
            cat: activeCat,
          }}
        />
      </div>

      <header className="mt-6 mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 sm:flex-1">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
            <Hand className="h-3 w-3" />
            助け合い
          </p>
          <h1
            className="mt-2 text-[30px] font-bold leading-tight tracking-tight"
            style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
          >
            {regionFilter.active ? regionFilter.nameJa : 'フランス'}で助けあう
          </h1>
          <p className="mt-2 text-[14px] leading-[1.9] text-foreground/70">
            空港送迎、書類のフランス語翻訳、こどもの一時預かり。
            遠く離れた土地での、ささやかな相互扶助。
          </p>
        </div>
        <Link
          href="/help/new"
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-primary-500 px-4 py-2 text-[12px] font-bold text-neutral-950 transition hover:bg-primary-300"
        >
          <Plus className="h-3.5 w-3.5" />
          投稿する
        </Link>
      </header>

      <div className="mb-4">
        <CommunityDisclaimer kind="mutual_aid" />
      </div>

      {/* request_type */}
      <div
        role="tablist"
        aria-label="申し出 / 依頼 で絞り込み"
        className="mb-2 flex flex-wrap items-center gap-1.5"
      >
        <Link
          href={buildHref({ type: null })}
          role="tab"
          aria-selected={!activeType}
          className={
            'rounded-full px-3 py-1 text-[11px] font-semibold transition ' +
            (!activeType
              ? 'bg-primary-500 text-neutral-950'
              : 'bg-primary-500/10 text-primary-300 hover:bg-primary-500/15')
          }
        >
          すべて
        </Link>
        {(['offer', 'need'] as RequestType[]).map((t) => {
          const on = activeType === t;
          return (
            <Link
              key={t}
              href={buildHref({ type: on ? null : t })}
              role="tab"
              aria-selected={on}
              className={
                'rounded-full px-3 py-1 text-[11px] font-semibold transition ' +
                (on
                  ? 'bg-primary-500 text-neutral-950'
                  : 'bg-primary-500/10 text-primary-300 hover:bg-primary-500/15')
              }
            >
              {REQUEST_TYPE_LABEL[t]}
            </Link>
          );
        })}
      </div>

      {/* urgency */}
      <div className="mb-2">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
          緊急度
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={buildHref({ urg: null })}
            className={
              'rounded-full px-2.5 py-1 text-[11px] font-semibold transition ' +
              (!activeUrg
                ? 'bg-foreground text-background'
                : 'bg-muted text-foreground/65 hover:bg-foreground/15')
            }
          >
            すべて
          </Link>
          {(['now', 'this_week', 'flexible'] as Urgency[]).map((u) => (
            <Link
              key={u}
              href={buildHref({ urg: activeUrg === u ? null : u })}
              className={
                'inline-flex items-center gap-0.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ' +
                (activeUrg === u
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-foreground/65 hover:bg-foreground/15')
              }
            >
              {u === 'now' ? <Zap className="h-3 w-3" /> : null}
              {URGENCY_LABEL[u]}
            </Link>
          ))}
        </div>
      </div>

      {/* category */}
      <div className="mb-5">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
          カテゴリ
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={buildHref({ cat: null })}
            className={
              'rounded-full px-2.5 py-1 text-[11px] font-semibold transition ' +
              (!activeCat
                ? 'bg-foreground text-background'
                : 'bg-muted text-foreground/65 hover:bg-foreground/15')
            }
          >
            すべて
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={buildHref({ cat: activeCat === c ? null : c })}
              className={
                'rounded-full px-2.5 py-1 text-[11px] font-semibold transition ' +
                (activeCat === c
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-foreground/65 hover:bg-foreground/15')
              }
            >
              {CATEGORY_LABEL[c]}
            </Link>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-[13px] text-foreground/55">
          条件に合う投稿はまだありません。
          <br />
          フィルタを緩めて再度お試しください。
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((p) => (
            <HelpCard key={p.id} post={p} />
          ))}
        </ul>
      )}
    </main>
  );
}

function HelpCard({ post }: { post: CommunityPostListItem }) {
  const meta = post.metadata as {
    request_type?: RequestType;
    urgency?: Urgency;
    category?: Category;
    compensation?: Compensation;
  };
  const expDays = daysUntil(post.expiresAt);
  const isUrgent = meta.urgency === 'now';

  return (
    <li>
      <Link
        href={`/help/${post.id}`}
        className={
          'block rounded-lg p-4 ring-1 transition ' +
          (isUrgent
            ? 'bg-danger-500/5 ring-danger-500/30 hover:bg-danger-500/10 hover:ring-danger-500/50'
            : 'bg-card ring-border hover:bg-primary-500/10 hover:ring-primary-300')
        }
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {meta.request_type ? (
            <span
              className={
                'rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ' +
                (meta.request_type === 'offer'
                  ? 'bg-primary-500 text-neutral-950'
                  : 'bg-accent-500 text-neutral-950')
              }
            >
              {REQUEST_TYPE_LABEL[meta.request_type]}
            </span>
          ) : null}
          {meta.urgency ? (
            <span
              className={
                'inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ' +
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
          {meta.category ? (
            <span className="rounded-sm bg-foreground/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/65">
              {CATEGORY_LABEL[meta.category]}
            </span>
          ) : null}
        </div>

        <h2
          className="mt-1.5 text-[16px] font-bold leading-snug text-foreground"
          style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
        >
          {post.title}
        </h2>

        <dl className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-foreground/70">
          {meta.compensation ? (
            <div className="inline-flex items-center gap-0.5">
              <Gift className="h-3 w-3" />
              {COMPENSATION_LABEL[meta.compensation]}
            </div>
          ) : null}
          {post.locationText ? (
            <div className="inline-flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />
              {post.locationText}
            </div>
          ) : null}
        </dl>

        <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-foreground/65">
          {post.body}
        </p>

        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-foreground/50">
          <span className="inline-flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            {formatPostedAt(post.createdAt)} 投稿
          </span>
          {expDays !== null && expDays >= 0 ? (
            <span
              className={
                'tabular ' +
                (expDays <= 3 ? 'font-bold text-danger-500' : 'text-foreground/45')
              }
            >
              あと {expDays} 日
            </span>
          ) : null}
        </p>
      </Link>
    </li>
  );
}
