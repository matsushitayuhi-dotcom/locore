import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  GraduationCap,
  MapPin,
  Clock,
  Wifi,
  Coffee,
  Tag,
} from 'lucide-react';
import { CommunityNav } from '@/components/community/CommunityNav';
import { CommunityDisclaimer } from '@/components/community/CommunityDisclaimer';
import { CommunityRegionPicker } from '@/components/community/CommunityRegionPicker';
import { listCommunityPosts, type CommunityPostListItem } from '@/lib/community/db';
import { resolveCommunityRegion } from '@/lib/community/region-filter';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '教えます・習います — Locore',
  description:
    'フランス在住の駐在員コミュニティのレッスン掲示板。日本語、フランス語、料理、楽器、勉強の家庭教師など。',
};

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

type LessonCategory =
  | 'language'
  | 'music'
  | 'cooking'
  | 'art'
  | 'sport'
  | 'study_aid'
  | 'other';
const LESSON_CATEGORIES: LessonCategory[] = [
  'language',
  'music',
  'cooking',
  'art',
  'sport',
  'study_aid',
  'other',
];
const LESSON_CATEGORY_LABEL: Record<LessonCategory, string> = {
  language: '語学',
  music: '音楽',
  cooking: '料理',
  art: 'アート',
  sport: 'スポーツ',
  study_aid: '勉強サポート',
  other: 'その他',
};

type Props = {
  searchParams?: {
    side?: string;
    cat?: string;
    fmt?: string;
    trial?: string;
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

function formatLessonPrice(post: CommunityPostListItem): string | null {
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
        ? ' / 1回'
        : post.priceUnit === 'hourly'
          ? ' / 時'
          : '';
  return `${currencySym}${num}${suffix}`;
}

export default async function LessonsIndexPage({ searchParams }: Props) {
  const activeSide = ((): Side | undefined => {
    if (searchParams?.side === 'teach' || searchParams?.side === 'learn') {
      return searchParams.side;
    }
    return undefined;
  })();
  const activeCat =
    searchParams?.cat &&
    (LESSON_CATEGORIES as string[]).includes(searchParams.cat)
      ? (searchParams.cat as LessonCategory)
      : undefined;
  const activeFormat = ((): Format | undefined => {
    if (
      searchParams?.fmt === 'in_person' ||
      searchParams?.fmt === 'online' ||
      searchParams?.fmt === 'both'
    )
      return searchParams.fmt;
    return undefined;
  })();
  const trialOnly = searchParams?.trial === '1';
  const regionFilter = await resolveCommunityRegion(searchParams?.region);

  const rawPosts = await listCommunityPosts({
    kind: 'lesson',
    limit: 80,
    cityId: regionFilter.cityId,
  });

  const filtered = rawPosts.filter((p) => {
    const meta = p.metadata as {
      side?: Side;
      category?: LessonCategory;
      format?: Format;
      trial_available?: boolean;
    };
    if (activeSide && meta.side !== activeSide) return false;
    if (activeCat && meta.category !== activeCat) return false;
    if (activeFormat && meta.format !== activeFormat) return false;
    if (trialOnly && !meta.trial_available) return false;
    return true;
  });

  const buildHref = (overrides: Record<string, string | undefined | null>) => {
    const params = new URLSearchParams();
    if (activeSide) params.set('side', activeSide);
    if (activeCat) params.set('cat', activeCat);
    if (activeFormat) params.set('fmt', activeFormat);
    if (trialOnly) params.set('trial', '1');
    if (regionFilter.active) params.set('region', regionFilter.slug);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null || v === undefined || v === '') params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/lessons?${qs}` : '/lessons';
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
        <CommunityNav active="lesson" />
      </div>

      <div className="mt-3">
        <CommunityRegionPicker
          basePath="/lessons"
          activeSlug={regionFilter.slug}
          preserveQuery={{
            side: activeSide,
            cat: activeCat,
            fmt: activeFormat,
            trial: trialOnly ? '1' : undefined,
          }}
        />
      </div>

      <header className="mt-6 mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 sm:flex-1">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
            <GraduationCap className="h-3 w-3" />
            教えます・習います
          </p>
          <h1
            className="mt-2 text-[30px] font-bold leading-tight tracking-tight"
            style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
          >
            {regionFilter.active ? regionFilter.nameJa : 'フランス'}でまなぶ
          </h1>
          <p className="mt-2 text-[14px] leading-[1.9] text-foreground/70">
            子供向け日本語、フランス語家庭教師、料理、楽器。
            短時間から、相手に合わせて柔軟に。
          </p>
        </div>
        <Link
          href="/lessons/new"
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-primary-500 px-4 py-2 text-[12px] font-bold text-neutral-950 transition hover:bg-primary-300"
        >
          <Plus className="h-3.5 w-3.5" />
          投稿する
        </Link>
      </header>

      <div className="mb-4">
        <CommunityDisclaimer kind="lesson" />
      </div>

      {/* side */}
      <div
        role="tablist"
        aria-label="教える / 習う で絞り込み"
        className="mb-2 flex flex-wrap items-center gap-1.5"
      >
        <Link
          href={buildHref({ side: null })}
          role="tab"
          aria-selected={!activeSide}
          className={
            'rounded-full px-3 py-1 text-[11px] font-semibold transition ' +
            (!activeSide
              ? 'bg-primary-500 text-neutral-950'
              : 'bg-primary-500/10 text-primary-300 hover:bg-primary-500/15')
          }
        >
          すべて
        </Link>
        {(['teach', 'learn'] as Side[]).map((s) => {
          const on = activeSide === s;
          return (
            <Link
              key={s}
              href={buildHref({ side: on ? null : s })}
              role="tab"
              aria-selected={on}
              className={
                'rounded-full px-3 py-1 text-[11px] font-semibold transition ' +
                (on
                  ? 'bg-primary-500 text-neutral-950'
                  : 'bg-primary-500/10 text-primary-300 hover:bg-primary-500/15')
              }
            >
              {SIDE_LABEL[s]}
            </Link>
          );
        })}
      </div>

      {/* category */}
      <div className="mb-2">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
          ジャンル
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
          {LESSON_CATEGORIES.map((c) => (
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
              {LESSON_CATEGORY_LABEL[c]}
            </Link>
          ))}
        </div>
      </div>

      {/* format + trial */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
            形式
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={buildHref({ fmt: null })}
              className={
                'rounded-full px-2.5 py-1 text-[11px] font-semibold transition ' +
                (!activeFormat
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-foreground/65 hover:bg-foreground/15')
              }
            >
              すべて
            </Link>
            {(['in_person', 'online', 'both'] as Format[]).map((f) => (
              <Link
                key={f}
                href={buildHref({ fmt: activeFormat === f ? null : f })}
                className={
                  'rounded-full px-2.5 py-1 text-[11px] font-semibold transition ' +
                  (activeFormat === f
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-foreground/65 hover:bg-foreground/15')
                }
              >
                {FORMAT_LABEL[f]}
              </Link>
            ))}
          </div>
        </div>

        <Link
          href={buildHref({ trial: trialOnly ? null : '1' })}
          className={
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ' +
            (trialOnly
              ? 'bg-foreground text-background'
              : 'bg-muted text-foreground/65 hover:bg-foreground/15')
          }
        >
          <Coffee className="h-3 w-3" />
          体験あり
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-[13px] text-foreground/55">
          条件に合うレッスンはまだありません。
          <br />
          フィルタを緩めて再度お試しください。
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((p) => (
            <LessonCard key={p.id} post={p} />
          ))}
        </ul>
      )}
    </main>
  );
}

function LessonCard({ post }: { post: CommunityPostListItem }) {
  const meta = post.metadata as {
    side?: Side;
    category?: LessonCategory;
    format?: Format;
    trial_available?: boolean;
  };
  const price = formatLessonPrice(post);

  return (
    <li>
      <Link
        href={`/lessons/${post.id}`}
        className="block rounded-lg bg-card p-4 ring-1 ring-border transition hover:bg-primary-500/10 hover:ring-primary-300"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {meta.side ? (
            <span
              className={
                'rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ' +
                (meta.side === 'teach'
                  ? 'bg-primary-500 text-neutral-950'
                  : 'bg-accent-500 text-neutral-950')
              }
            >
              {SIDE_LABEL[meta.side]}
            </span>
          ) : null}
          {meta.category ? (
            <span className="rounded-sm bg-foreground/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/65">
              {LESSON_CATEGORY_LABEL[meta.category]}
            </span>
          ) : null}
          {meta.format ? (
            <span className="inline-flex items-center gap-0.5 rounded-sm bg-primary-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-300">
              {meta.format === 'online' ? (
                <Wifi className="h-2.5 w-2.5" />
              ) : null}
              {FORMAT_LABEL[meta.format]}
            </span>
          ) : null}
          {meta.trial_available ? (
            <span className="inline-flex items-center gap-0.5 rounded-sm bg-accent-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent-500">
              <Coffee className="h-2.5 w-2.5" />
              体験あり
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
          {price ? (
            <div className="inline-flex items-center gap-0.5 font-semibold text-primary-300">
              <Tag className="h-3 w-3" />
              {price}
            </div>
          ) : (
            <div className="text-foreground/45">料金応相談</div>
          )}
          {post.locationText ? (
            <div className="inline-flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />
              {post.locationText}
            </div>
          ) : null}
        </dl>

        <p className="mt-2 flex items-center gap-0.5 text-[10px] text-foreground/45">
          <Clock className="h-2.5 w-2.5" />
          {formatPostedAt(post.createdAt)} 投稿
        </p>
      </Link>
    </li>
  );
}
