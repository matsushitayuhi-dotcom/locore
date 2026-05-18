import Link from 'next/link';
import { and, desc, eq, ilike, or, count } from 'drizzle-orm';
import { Search, MessageSquare, ExternalLink } from 'lucide-react';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { AdminPageHeader } from '../_components/AdminPageHeader';
import {
  KIND_BASE_PATH,
  KIND_LABEL,
  COMMUNITY_KINDS,
  COMMUNITY_STATUSES,
  STATUS_LABEL,
  type CommunityKind,
  type CommunityStatus,
} from '@/lib/community/constants';

/**
 * /admin/community — 6 カテゴリ横断のコミュニティ投稿管理。
 *
 * フィルタ:
 *   - q: タイトル / 著者名で検索
 *   - kind: job/apartment/marketplace/group/lesson/mutual_aid
 *   - status: active/closed/expired
 */

export const metadata = { title: 'コミュニティ投稿管理 — Admin' };
export const dynamic = 'force-dynamic';

type Search = {
  q?: string;
  kind?: string;
  status?: string;
  page?: string;
  /** `1` を指定するとサンプル投稿 (is_sample=true) も表示する */
  samples?: string;
};

const PAGE_SIZE = 40;

const KIND_COLOR: Record<CommunityKind, string> = {
  job: 'bg-primary-500/15 text-primary-300',
  apartment: 'bg-amber-500/15 text-amber-700',
  marketplace: 'bg-success-500/15 text-success-500',
  group: 'bg-accent-300/30 text-foreground/75',
  lesson: 'bg-primary-300/15 text-primary-300',
  mutual_aid: 'bg-foreground/10 text-foreground/65',
};

const STATUS_COLOR: Record<CommunityStatus, string> = {
  active: 'bg-success-500/15 text-success-500',
  closed: 'bg-muted text-foreground/65',
  expired: 'bg-foreground/10 text-foreground/55',
};

export default async function AdminCommunityPage({
  searchParams,
}: {
  searchParams?: Search;
}) {
  const db = getDb();
  const q = (searchParams?.q ?? '').trim();
  const kind = (searchParams?.kind ?? '').trim() as CommunityKind | '';
  const status = (searchParams?.status ?? '').trim() as CommunityStatus | '';
  const page = Math.max(1, parseInt(searchParams?.page ?? '1', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  // デフォルトはサンプル投稿を除外。?samples=1 で含める
  const includeSamples = searchParams?.samples === '1';

  const filters: any[] = [];
  if (!includeSamples) {
    filters.push(eq(schema.communityPosts.isSample, false));
  }
  if (q) {
    filters.push(
      or(
        ilike(schema.communityPosts.title, `%${q}%`),
        ilike(schema.users.displayName, `%${q}%`),
      )!,
    );
  }
  if (kind && (COMMUNITY_KINDS as readonly string[]).includes(kind)) {
    filters.push(eq(schema.communityPosts.kind, kind as CommunityKind));
  }
  if (status && (COMMUNITY_STATUSES as readonly string[]).includes(status)) {
    filters.push(eq(schema.communityPosts.status, status as CommunityStatus));
  }
  const whereClause = filters.length > 0 ? and(...filters) : undefined;

  const safe = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      console.error('[admin/community] query failed:', err);
      return fallback;
    }
  };

  const [rows, totalRows, kindCountRows, statusCountRows] = await Promise.all([
    safe(() =>
    db
      .select({
        id: schema.communityPosts.id,
        kind: schema.communityPosts.kind,
        title: schema.communityPosts.title,
        status: schema.communityPosts.status,
        locationText: schema.communityPosts.locationText,
        priceAmount: schema.communityPosts.priceAmount,
        priceCurrency: schema.communityPosts.priceCurrency,
        viewCount: schema.communityPosts.viewCount,
        createdAt: schema.communityPosts.createdAt,
        authorId: schema.communityPosts.authorId,
        authorName: schema.users.displayName,
      })
      .from(schema.communityPosts)
      .leftJoin(schema.users, eq(schema.users.id, schema.communityPosts.authorId))
      .where(whereClause)
      .orderBy(desc(schema.communityPosts.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
      [] as Array<{
        id: string;
        kind: string;
        title: string;
        status: string;
        locationText: string | null;
        priceAmount: number | null;
        priceCurrency: string | null;
        viewCount: number;
        createdAt: Date;
        authorId: string;
        authorName: string | null;
      }>,
    ),
    safe(
      () =>
        db
          .select({ c: count() })
          .from(schema.communityPosts)
          .leftJoin(schema.users, eq(schema.users.id, schema.communityPosts.authorId))
          .where(whereClause),
      [{ c: 0 }],
    ),
    safe(
      () =>
        db
          .select({ kind: schema.communityPosts.kind, c: count() })
          .from(schema.communityPosts)
          .where(
            includeSamples
              ? eq(schema.communityPosts.status, 'active')
              : and(
                  eq(schema.communityPosts.status, 'active'),
                  eq(schema.communityPosts.isSample, false),
                ),
          )
          .groupBy(schema.communityPosts.kind),
      [] as Array<{ kind: string; c: number }>,
    ),
    safe(
      () =>
        includeSamples
          ? db
              .select({ status: schema.communityPosts.status, c: count() })
              .from(schema.communityPosts)
              .groupBy(schema.communityPosts.status)
          : db
              .select({ status: schema.communityPosts.status, c: count() })
              .from(schema.communityPosts)
              .where(eq(schema.communityPosts.isSample, false))
              .groupBy(schema.communityPosts.status),
      [] as Array<{ status: string; c: number }>,
    ),
  ]);

  const total = totalRows[0]?.c ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const kindCounts = Object.fromEntries(kindCountRows.map((r) => [r.kind, r.c]));
  const statusCounts = Object.fromEntries(
    statusCountRows.map((r) => [r.status, r.c]),
  );

  const buildHref = (overrides: Partial<Search>) => {
    const next = { ...searchParams, ...overrides };
    const params = new URLSearchParams();
    if (next.q) params.set('q', next.q);
    if (next.kind) params.set('kind', next.kind);
    if (next.status) params.set('status', next.status);
    if (next.samples === '1') params.set('samples', '1');
    return `/admin/community${params.toString() ? `?${params.toString()}` : ''}`;
  };

  return (
    <div>
      <AdminPageHeader
        title="コミュニティ投稿管理"
        description="6 カテゴリ（求人 / アパート / 売買 / グループ / レッスン / 助け合い）の横断管理。"
        kicker={
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
            <MessageSquare className="mr-1 inline h-3 w-3" />
            {total.toLocaleString('ja-JP')} 件
          </p>
        }
      />

      {/* カテゴリチップ */}
      <div className="mb-3 flex flex-wrap gap-2">
        <FilterChip
          label="すべて"
          active={!kind}
          count={Object.values(kindCounts).reduce((a, b) => a + b, 0)}
          href={buildHref({ kind: undefined })}
        />
        {COMMUNITY_KINDS.map((k) => (
          <FilterChip
            key={k}
            label={KIND_LABEL[k]}
            active={kind === k}
            count={kindCounts[k] ?? 0}
            href={buildHref({ kind: k })}
            color={KIND_COLOR[k]}
          />
        ))}
      </div>

      {/* ステータスチップ */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <SmallChip
          label={`全ステータス (${total})`}
          active={!status}
          href={buildHref({ status: undefined })}
        />
        {COMMUNITY_STATUSES.map((s) => (
          <SmallChip
            key={s}
            label={`${STATUS_LABEL[s]} (${statusCounts[s] ?? 0})`}
            active={status === s}
            href={buildHref({ status: s })}
          />
        ))}
      </div>

      {/* サンプル表示トグル */}
      <div className="mb-3 flex items-center gap-2 text-[11px]">
        <Link
          href={buildHref({ samples: includeSamples ? undefined : '1' })}
          className={
            'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 ring-1 transition ' +
            (includeSamples
              ? 'bg-amber-500/15 text-amber-700 ring-amber-500/30'
              : 'bg-card text-foreground/55 ring-border hover:bg-muted')
          }
        >
          <span className="text-[10px]">{includeSamples ? '☑' : '☐'}</span>
          サンプル投稿も表示
        </Link>
        {includeSamples ? (
          <span className="text-[10px] text-amber-700">
            シード由来のサンプル投稿を含めて表示中
          </span>
        ) : null}
      </div>

      {/* 検索 */}
      <form action="/admin/community" method="GET" className="mb-4">
        {kind ? <input type="hidden" name="kind" value={kind} /> : null}
        {status ? <input type="hidden" name="status" value={status} /> : null}
        {includeSamples ? <input type="hidden" name="samples" value="1" /> : null}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="タイトル / 投稿者名で検索"
            className="h-10 w-full rounded-md border border-border bg-card pl-8 pr-3 text-[13px] focus:border-2 focus:border-primary-500 focus:pl-[31px] focus:outline-none"
          />
        </div>
      </form>

      {/* 一覧 */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-5 py-12 text-center text-[13px] text-foreground/55">
          該当する投稿がありません。
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {rows.map((p) => {
            const kindLabel = KIND_LABEL[p.kind as CommunityKind] ?? p.kind;
            const kindColor =
              KIND_COLOR[p.kind as CommunityKind] ?? 'bg-muted text-foreground/65';
            const statusColor =
              STATUS_COLOR[p.status as CommunityStatus] ??
              'bg-muted text-foreground/65';
            const priceLabel =
              p.priceAmount != null
                ? `${p.priceCurrency === 'JPY' ? '¥' : '€'}${p.priceAmount.toLocaleString('fr-FR')}`
                : null;
            return (
              <li key={p.id} className="flex items-start gap-3 px-3 py-3 sm:px-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${kindColor}`}
                    >
                      {kindLabel}
                    </span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${statusColor}`}
                    >
                      {STATUS_LABEL[p.status as CommunityStatus] ?? p.status}
                    </span>
                    {priceLabel ? (
                      <span className="text-[10px] tabular text-foreground/55">
                        {priceLabel}
                      </span>
                    ) : null}
                    <span className="text-[10px] tabular text-foreground/45">
                      👁 {p.viewCount}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[13px] font-semibold">
                    {p.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-foreground/55">
                    by{' '}
                    {p.authorId ? (
                      <Link
                        href={`/residents/${p.authorId}`}
                        className="hover:text-primary-300 hover:underline"
                      >
                        {p.authorName ?? '匿名'}
                      </Link>
                    ) : (
                      <span>{p.authorName ?? '匿名'}</span>
                    )}
                    {p.locationText ? ` · 📍 ${p.locationText}` : ''}
                    {' · '}
                    {p.createdAt.toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <Link
                  href={`${KIND_BASE_PATH[p.kind as CommunityKind]}/${p.id}`}
                  target="_blank"
                  className="shrink-0 rounded-md p-1.5 text-foreground/55 hover:bg-muted hover:text-foreground"
                  aria-label="投稿を見る"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* ページング */}
      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-[11px] text-foreground/55">
          <span>
            {offset + 1} – {Math.min(offset + PAGE_SIZE, total)} / {total} 件
          </span>
          <div className="flex gap-1">
            {page > 1 ? (
              <Link
                href={`${buildHref({})}${buildHref({}).includes('?') ? '&' : '?'}page=${page - 1}`}
                className="rounded-md bg-card px-3 py-1 ring-1 ring-border hover:bg-muted"
              >
                ← 前
              </Link>
            ) : null}
            <span className="rounded-md bg-muted px-3 py-1 tabular">
              {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={`${buildHref({})}${buildHref({}).includes('?') ? '&' : '?'}page=${page + 1}`}
                className="rounded-md bg-card px-3 py-1 ring-1 ring-border hover:bg-muted"
              >
                次 →
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <p className="mt-6 text-[10px] text-foreground/45">
        ※ 投稿の削除・非表示は Supabase Studio から（community_posts.status = 'closed' / 'expired' に更新）
      </p>
    </div>
  );
}

function FilterChip({
  label,
  active,
  count,
  href,
  color,
}: {
  label: string;
  active: boolean;
  count: number;
  href: string;
  color?: string;
}) {
  return (
    <Link
      href={href}
      className={
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition ' +
        (active
          ? 'bg-foreground text-background'
          : color
            ? `${color} hover:opacity-80`
            : 'bg-card text-foreground/65 ring-1 ring-border hover:bg-muted')
      }
    >
      {label}
      <span className={'tabular ' + (active ? 'opacity-75' : 'opacity-65')}>
        {count.toLocaleString('ja-JP')}
      </span>
    </Link>
  );
}

function SmallChip({
  label,
  active,
  href,
}: {
  label: string;
  active: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={
        'rounded-md px-2.5 py-0.5 text-[11px] font-medium transition ' +
        (active
          ? 'bg-primary-500/15 text-primary-300'
          : 'bg-muted text-foreground/60 hover:bg-primary-500/10 hover:text-primary-300')
      }
    >
      {label}
    </Link>
  );
}
