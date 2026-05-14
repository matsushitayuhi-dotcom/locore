import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Users,
  Clock,
  Repeat,
  UserCheck,
} from 'lucide-react';
import { CommunityNav } from '@/components/community/CommunityNav';
import { CommunityDisclaimer } from '@/components/community/CommunityDisclaimer';
import { listCommunityPosts, type CommunityPostListItem } from '@/lib/community/db';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'メンバー募集 — Locore',
  description:
    'パリの駐在員コミュニティのメンバー募集。ママ友会、テニス・ランニング仲間、勉強会、言語交換など。',
};

type GroupCategory =
  | 'sport'
  | 'study'
  | 'hobby'
  | 'parenting'
  | 'language'
  | 'other';
const GROUP_CATEGORIES: GroupCategory[] = [
  'sport',
  'study',
  'hobby',
  'parenting',
  'language',
  'other',
];
const GROUP_CATEGORY_LABEL: Record<GroupCategory, string> = {
  sport: 'スポーツ',
  study: '勉強会',
  hobby: '趣味',
  parenting: '子育て',
  language: '言語交換',
  other: 'その他',
};

type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'one_off' | 'flexible';
const FREQUENCIES: Frequency[] = [
  'weekly',
  'biweekly',
  'monthly',
  'one_off',
  'flexible',
];
const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: '毎週',
  biweekly: '隔週',
  monthly: '月 1 回',
  one_off: '単発',
  flexible: '随時',
};

type Props = {
  searchParams?: {
    cat?: string;
    freq?: string;
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

export default async function GroupsIndexPage({ searchParams }: Props) {
  const activeCat =
    searchParams?.cat && (GROUP_CATEGORIES as string[]).includes(searchParams.cat)
      ? (searchParams.cat as GroupCategory)
      : undefined;
  const activeFreq =
    searchParams?.freq && (FREQUENCIES as string[]).includes(searchParams.freq)
      ? (searchParams.freq as Frequency)
      : undefined;

  const rawPosts = await listCommunityPosts({ kind: 'group', limit: 80 });

  const filtered = rawPosts.filter((p) => {
    const meta = p.metadata as {
      category?: GroupCategory;
      meeting_frequency?: Frequency;
    };
    if (activeCat && meta.category !== activeCat) return false;
    if (activeFreq && meta.meeting_frequency !== activeFreq) return false;
    return true;
  });

  const buildHref = (overrides: Record<string, string | undefined | null>) => {
    const params = new URLSearchParams();
    if (activeCat) params.set('cat', activeCat);
    if (activeFreq) params.set('freq', activeFreq);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null || v === undefined || v === '') params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/groups?${qs}` : '/groups';
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
        <CommunityNav active="group" />
      </div>

      <header className="mt-6 mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
            <Users className="h-3 w-3" />
            メンバー募集
          </p>
          <h1
            className="mt-2 text-[30px] font-bold leading-tight tracking-tight"
            style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
          >
            ちいさな集まりを、はじめる。
          </h1>
          <p className="mt-2 text-[14px] leading-[1.9] text-foreground/70">
            ママ友会、テニス・ランニング仲間、勉強会、言語交換。
            気の合う住人と、ゆるく続けられる集まりを。
          </p>
        </div>
        <Link
          href="/groups/new"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-500 px-4 py-2 text-[12px] font-bold text-neutral-950 transition hover:bg-primary-300"
        >
          <Plus className="h-3.5 w-3.5" />
          募集する
        </Link>
      </header>

      <div className="mb-4">
        <CommunityDisclaimer kind="group" />
      </div>

      {/* category */}
      <div
        role="tablist"
        aria-label="カテゴリで絞り込み"
        className="mb-2 flex flex-wrap items-center gap-1.5"
      >
        <Link
          href={buildHref({ cat: null })}
          role="tab"
          aria-selected={!activeCat}
          className={
            'rounded-full px-3 py-1 text-[11px] font-semibold transition ' +
            (!activeCat
              ? 'bg-primary-500 text-neutral-950'
              : 'bg-primary-500/10 text-primary-300 hover:bg-primary-500/15')
          }
        >
          すべて
        </Link>
        {GROUP_CATEGORIES.map((c) => {
          const on = activeCat === c;
          return (
            <Link
              key={c}
              href={buildHref({ cat: on ? null : c })}
              role="tab"
              aria-selected={on}
              className={
                'rounded-full px-3 py-1 text-[11px] font-semibold transition ' +
                (on
                  ? 'bg-primary-500 text-neutral-950'
                  : 'bg-primary-500/10 text-primary-300 hover:bg-primary-500/15')
              }
            >
              {GROUP_CATEGORY_LABEL[c]}
            </Link>
          );
        })}
      </div>

      {/* frequency */}
      <div className="mb-5">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
          頻度
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={buildHref({ freq: null })}
            className={
              'rounded-full px-2.5 py-1 text-[11px] font-semibold transition ' +
              (!activeFreq
                ? 'bg-foreground text-background'
                : 'bg-muted text-foreground/65 hover:bg-foreground/15')
            }
          >
            すべて
          </Link>
          {FREQUENCIES.map((f) => (
            <Link
              key={f}
              href={buildHref({ freq: activeFreq === f ? null : f })}
              className={
                'rounded-full px-2.5 py-1 text-[11px] font-semibold transition ' +
                (activeFreq === f
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-foreground/65 hover:bg-foreground/15')
              }
            >
              {FREQUENCY_LABEL[f]}
            </Link>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-[13px] text-foreground/55">
          条件に合う募集はまだありません。
          <br />
          フィルタを緩めて再度お試しください。
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((p) => (
            <GroupCard key={p.id} post={p} />
          ))}
        </ul>
      )}
    </main>
  );
}

function GroupCard({ post }: { post: CommunityPostListItem }) {
  const meta = post.metadata as {
    category?: GroupCategory;
    meeting_frequency?: Frequency;
    group_size?: number;
    age_range?: string;
    skill_level?: string;
  };

  return (
    <li>
      <Link
        href={`/groups/${post.id}`}
        className="block rounded-lg bg-card p-4 ring-1 ring-border transition hover:bg-primary-500/10 hover:ring-primary-300"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {meta.category ? (
            <span className="rounded-sm bg-primary-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-300">
              {GROUP_CATEGORY_LABEL[meta.category]}
            </span>
          ) : null}
          {meta.meeting_frequency ? (
            <span className="inline-flex items-center gap-0.5 rounded-sm bg-foreground/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/65">
              <Repeat className="h-2.5 w-2.5" />
              {FREQUENCY_LABEL[meta.meeting_frequency]}
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
          {meta.group_size ? (
            <div className="inline-flex items-center gap-0.5">
              <UserCheck className="h-3 w-3" />
              {meta.group_size} 名規模
            </div>
          ) : null}
          {meta.age_range ? (
            <div className="text-foreground/55">対象: {meta.age_range}</div>
          ) : null}
          {post.locationText ? (
            <div className="text-foreground/55">{post.locationText}</div>
          ) : null}
        </dl>

        <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-foreground/65">
          {post.body}
        </p>

        <p className="mt-2 flex items-center gap-0.5 text-[10px] text-foreground/45">
          <Clock className="h-2.5 w-2.5" />
          {formatPostedAt(post.createdAt)} 投稿
        </p>
      </Link>
    </li>
  );
}
