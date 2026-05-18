import Link from 'next/link';
import { and, desc, eq, ilike, isNull, or, sql, count } from 'drizzle-orm';
import { Search, Newspaper, ExternalLink, Edit } from 'lucide-react';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { AdminPageHeader } from '../_components/AdminPageHeader';

/**
 * /admin/articles — 全ライターの記事を横断管理する画面。
 *
 * フィルタ:
 *   - q: タイトル / 著者名で検索
 *   - status: draft / pending_review / published / archived
 *   - type: spot_guide / itinerary / expat_info / photo_journal
 */

export const metadata = { title: '記事管理 — Admin' };
export const dynamic = 'force-dynamic';

type Search = {
  q?: string;
  status?: string;
  type?: string;
  page?: string;
  /** `1` を指定するとサンプル記事 (is_sample=true) も表示する */
  samples?: string;
};

const STATUSES = [
  'draft',
  'pending_review',
  'published',
  'archived',
] as const;
type StatusValue = (typeof STATUSES)[number];

const STATUS_LABEL: Record<StatusValue, string> = {
  draft: '下書き',
  pending_review: '審査中',
  published: '公開中',
  archived: 'アーカイブ',
};

const STATUS_COLOR: Record<StatusValue, string> = {
  draft: 'bg-muted text-foreground/65',
  pending_review: 'bg-amber-500/15 text-amber-700',
  published: 'bg-success-500/15 text-success-500',
  archived: 'bg-foreground/10 text-foreground/55',
};

const TYPES = [
  'spot_guide',
  'itinerary',
  'expat_info',
  'photo_journal',
] as const;
type TypeValue = (typeof TYPES)[number];

const TYPE_LABEL: Record<TypeValue, string> = {
  spot_guide: 'スポット',
  itinerary: '旅程',
  expat_info: '駐在者',
  photo_journal: 'フォト',
};

const PAGE_SIZE = 40;

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams?: Search;
}) {
  const db = getDb();
  const q = (searchParams?.q ?? '').trim();
  const status = (searchParams?.status ?? '').trim() as StatusValue | '';
  const type = (searchParams?.type ?? '').trim() as TypeValue | '';
  const page = Math.max(1, parseInt(searchParams?.page ?? '1', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  // デフォルトはサンプル記事を除外。?samples=1 で含める
  const includeSamples = searchParams?.samples === '1';

  const filters = [isNull(schema.articles.deletedAt)];
  if (!includeSamples) {
    filters.push(eq(schema.articles.isSample, false));
  }
  if (q) {
    filters.push(
      or(
        ilike(schema.articles.title, `%${q}%`),
        ilike(schema.users.displayName, `%${q}%`),
      )!,
    );
  }
  if (status && (STATUSES as readonly string[]).includes(status)) {
    filters.push(eq(schema.articles.status, status as StatusValue));
  }
  if (type && (TYPES as readonly string[]).includes(type)) {
    filters.push(eq(schema.articles.articleType, type as TypeValue));
  }

  const [rows, totalRows, statusCountRows] = await Promise.all([
    db
      .select({
        id: schema.articles.id,
        title: schema.articles.title,
        status: schema.articles.status,
        articleType: schema.articles.articleType,
        priceJpy: schema.articles.priceJpy,
        publishedAt: schema.articles.publishedAt,
        createdAt: schema.articles.createdAt,
        coverImageUrl: schema.articles.coverImageUrl,
        writerId: schema.articles.writerId,
        writerName: schema.users.displayName,
      })
      .from(schema.articles)
      .leftJoin(schema.users, eq(schema.users.id, schema.articles.writerId))
      .where(and(...filters))
      .orderBy(desc(schema.articles.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ c: count() })
      .from(schema.articles)
      .leftJoin(schema.users, eq(schema.users.id, schema.articles.writerId))
      .where(and(...filters)),
    db
      .select({ status: schema.articles.status, c: count() })
      .from(schema.articles)
      .where(
        includeSamples
          ? isNull(schema.articles.deletedAt)
          : and(
              isNull(schema.articles.deletedAt),
              eq(schema.articles.isSample, false),
            ),
      )
      .groupBy(schema.articles.status),
  ]);

  const total = totalRows[0]?.c ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const statusCounts = Object.fromEntries(
    statusCountRows.map((r) => [r.status, r.c]),
  );

  const buildHref = (overrides: Partial<Search>) => {
    const params = new URLSearchParams();
    const next = { ...searchParams, ...overrides, page: undefined };
    if (next.q) params.set('q', next.q);
    if (next.status) params.set('status', next.status);
    if (next.type) params.set('type', next.type);
    if (next.samples === '1') params.set('samples', '1');
    return `/admin/articles${params.toString() ? `?${params.toString()}` : ''}`;
  };

  return (
    <div>
      <AdminPageHeader
        title="記事管理"
        description="全ライターの記事を横断して確認・編集。"
        kicker={
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
            <Newspaper className="mr-1 inline h-3 w-3" />
            {total.toLocaleString('ja-JP')} 件
          </p>
        }
      />

      {/* ステータスチップ */}
      <div className="mb-3 flex flex-wrap gap-2">
        <FilterChip
          label="すべて"
          active={!status}
          count={Object.values(statusCounts).reduce((a, b) => a + b, 0)}
          href={buildHref({ status: undefined })}
        />
        {STATUSES.map((s) => (
          <FilterChip
            key={s}
            label={STATUS_LABEL[s]}
            active={status === s}
            count={statusCounts[s] ?? 0}
            href={buildHref({ status: s })}
          />
        ))}
      </div>

      {/* タイプチップ */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <SmallChip label="全タイプ" active={!type} href={buildHref({ type: undefined })} />
        {TYPES.map((t) => (
          <SmallChip
            key={t}
            label={TYPE_LABEL[t]}
            active={type === t}
            href={buildHref({ type: t })}
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
          サンプル記事も表示
        </Link>
        {includeSamples ? (
          <span className="text-[10px] text-amber-700">
            シード由来のサンプル記事を含めて表示中
          </span>
        ) : null}
      </div>

      {/* 検索 */}
      <form action="/admin/articles" method="GET" className="mb-4">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        {type ? <input type="hidden" name="type" value={type} /> : null}
        {includeSamples ? <input type="hidden" name="samples" value="1" /> : null}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="タイトル / 著者名で検索"
            className="h-10 w-full rounded-md border border-border bg-card pl-8 pr-3 text-[13px] focus:border-2 focus:border-primary-500 focus:pl-[31px] focus:outline-none"
          />
        </div>
      </form>

      {/* 一覧 */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-5 py-12 text-center text-[13px] text-foreground/55">
          該当する記事がありません。
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {rows.map((a) => {
            const stColor = STATUS_COLOR[a.status as StatusValue] ?? STATUS_COLOR.draft;
            return (
              <li key={a.id} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                {a.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.coverImageUrl}
                    alt=""
                    className="h-12 w-16 shrink-0 rounded-md object-cover ring-1 ring-border"
                  />
                ) : (
                  <div className="h-12 w-16 shrink-0 rounded-md bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${stColor}`}>
                      {STATUS_LABEL[a.status as StatusValue] ?? a.status}
                    </span>
                    <span className="text-[10px] text-foreground/55">
                      {TYPE_LABEL[a.articleType as TypeValue] ?? a.articleType}
                    </span>
                    <span className="text-[10px] tabular text-foreground/55">
                      ¥{a.priceJpy.toLocaleString('ja-JP')}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[13px] font-semibold">
                    {a.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-foreground/55">
                    by{' '}
                    {a.writerId ? (
                      <Link
                        href={`/residents/${a.writerId}`}
                        className="hover:text-primary-300 hover:underline"
                      >
                        {a.writerName ?? '（無名）'}
                      </Link>
                    ) : (
                      <span>{a.writerName ?? '（無名）'}</span>
                    )}
                    {' · '}
                    {(a.publishedAt ?? a.createdAt).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    href={`/articles/${a.id}`}
                    target="_blank"
                    className="rounded-md p-1.5 text-foreground/55 hover:bg-muted hover:text-foreground"
                    aria-label="記事を見る"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href={`/writer/articles/${a.id}/edit`}
                    className="rounded-md p-1.5 text-foreground/55 hover:bg-muted hover:text-foreground"
                    aria-label="編集"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Link>
                </div>
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
    </div>
  );
}

function FilterChip({
  label,
  active,
  count,
  href,
}: {
  label: string;
  active: boolean;
  count: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition ' +
        (active
          ? 'bg-foreground text-background'
          : 'bg-card text-foreground/65 ring-1 ring-border hover:bg-muted')
      }
    >
      {label}
      <span className={'tabular ' + (active ? 'opacity-75' : 'opacity-55')}>
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
