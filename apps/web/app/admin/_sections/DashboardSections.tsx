/**
 * /admin ダッシュボードの各セクション。
 *
 * Suspense で独立にロードできるように分離。
 * これにより、特定セクションがハングしても他は表示される。
 * + pool が枯渇しないよう、各セクションは少数 (3-5) のクエリで構成。
 */

import Link from 'next/link';
import { and, count, desc, eq, gte, isNull, sql } from 'drizzle-orm';
import {
  AlertCircle,
  Flag,
  Newspaper,
  MessageSquare,
  ShieldCheck,
  Users2,
  ArrowRight,
} from 'lucide-react';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';

/**
 * db.execute(sql`...`) の戻り値から最初の行を取り出す共通ヘルパー。
 * Drizzle のドライバ (postgres-js / pg) で型が違うため、
 * `rows` プロパティでも配列インデックスでもアクセスできるよう吸収。
 */
function pickRow<T>(raw: unknown): T | null {
  if (!raw) return null;
  // any キャストで両方のドライバ形式を許容
  // (型の精度より実行時の柔軟さを優先)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r: any = raw;
  if (Array.isArray(r) && r.length > 0) return r[0] as T;
  if (r.rows && Array.isArray(r.rows) && r.rows.length > 0) return r.rows[0] as T;
  if (typeof r[0] !== 'undefined') return r[0] as T;
  return null;
}

// 共通: タイムアウト付きの安全クエリ実行。長くて 8 秒で諦める。
async function safeQuery<T>(fn: () => Promise<T>, fallback: T, label: string): Promise<T> {
  const timeoutMs = 8000;
  try {
    return await Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('query timeout')), timeoutMs),
      ),
    ]);
  } catch (err) {
    console.error(`[admin overview] ${label} failed:`, err);
    return fallback;
  }
}

const now = () => new Date();
const daysAgo = (n: number) =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000);

// ============================================================================
// セクション 1: 警告バー (通報・本人確認の未処理)
// ============================================================================

export async function PendingTasksWarnings() {
  const db = getDb();
  const [reports, verifs] = await Promise.all([
    safeQuery(
      () =>
        db
          .select({ c: count() })
          .from(schema.reports)
          .where(eq(schema.reports.status, 'open')),
      [{ c: 0 }],
      'pendingReports',
    ),
    safeQuery(
      () =>
        db
          .select({ c: count() })
          .from(schema.residencyVerifications)
          .where(eq(schema.residencyVerifications.status, 'pending')),
      [{ c: 0 }],
      'pendingVerifications',
    ),
  ]);

  const openReports = reports[0]?.c ?? 0;
  const openVerifs = verifs[0]?.c ?? 0;
  if (openReports === 0 && openVerifs === 0) return null;

  return (
    <section className="mb-6 grid gap-3 sm:grid-cols-2">
      {openReports > 0 ? (
        <Link
          href="/admin/reports?status=open"
          className="flex items-center gap-3 rounded-xl bg-danger-500/10 p-4 ring-1 ring-danger-500/30 transition hover:bg-danger-500/15"
        >
          <AlertCircle className="h-5 w-5 text-danger-500" />
          <div className="flex-1">
            <p className="text-[13px] font-bold text-danger-500">
              未対応の通報 {openReports} 件
            </p>
            <p className="text-[11px] text-foreground/65">クリックして対応する</p>
          </div>
          <ArrowRight className="h-4 w-4 text-danger-500" />
        </Link>
      ) : null}
      {openVerifs > 0 ? (
        <Link
          href="/admin/verifications"
          className="flex items-center gap-3 rounded-xl bg-amber-500/10 p-4 ring-1 ring-amber-500/30 transition hover:bg-amber-500/15"
        >
          <ShieldCheck className="h-5 w-5 text-amber-600" />
          <div className="flex-1">
            <p className="text-[13px] font-bold text-amber-700">
              本人確認の申請 {openVerifs} 件
            </p>
            <p className="text-[11px] text-foreground/65">クリックしてレビュー</p>
          </div>
          <ArrowRight className="h-4 w-4 text-amber-600" />
        </Link>
      ) : null}
    </section>
  );
}

// ============================================================================
// セクション 2: ビジネス KPI (4 カード) — 1 クエリで一気に集計
// ============================================================================

export async function BusinessKpis() {
  const db = getDb();
  const last30 = daysAgo(30);
  const prev30 = daysAgo(60);

  // ユーザー集計を 1 クエリに統合 (filter aggregation)
  // サンプルユーザー (is_sample=true) は本番運用の数字に混ぜたくないので除外
  // db.execute は drizzle-orm-postgres-js では配列風だが型が緩いので any 経由
  const userAggRaw = await safeQuery(
    () =>
      db.execute(sql`
        SELECT
          count(*) FILTER (WHERE deleted_at IS NULL AND is_sample = false) AS total,
          count(*) FILTER (
            WHERE deleted_at IS NULL
              AND is_sample = false
              AND created_at >= ${last30}
          ) AS last30,
          count(*) FILTER (
            WHERE deleted_at IS NULL
              AND is_sample = false
              AND created_at >= ${prev30}
              AND created_at < ${last30}
          ) AS prev30
        FROM users
      `),
    null,
    'userAgg',
  );
  const ua = pickRow<{ total: number | string; last30: number | string; prev30: number | string }>(userAggRaw) ?? { total: 0, last30: 0, prev30: 0 };

  // 記事集計を 1 クエリに (サンプル記事除外)
  const articleAggRaw = await safeQuery(
    () =>
      db.execute(sql`
        SELECT
          count(*) FILTER (
            WHERE status = 'published'
              AND deleted_at IS NULL
              AND is_sample = false
          ) AS published_total,
          count(*) FILTER (
            WHERE status = 'published'
              AND deleted_at IS NULL
              AND is_sample = false
              AND published_at >= ${last30}
          ) AS published_last30
        FROM articles
      `),
    null,
    'articleAgg',
  );
  const aa = pickRow<{ published_total: number | string; published_last30: number | string }>(articleAggRaw) ?? { published_total: 0, published_last30: 0 };

  // 売上集計を 1 クエリに (サンプル購入除外)
  const revAggRaw = await safeQuery(
    () =>
      db.execute(sql`
        SELECT
          coalesce(sum(amount_jpy) FILTER (
            WHERE status = 'completed' AND is_sample = false
          ), 0)::int AS total_amount,
          count(*) FILTER (
            WHERE status = 'completed' AND is_sample = false
          ) AS total_count,
          coalesce(sum(amount_jpy) FILTER (
            WHERE status = 'completed'
              AND is_sample = false
              AND purchased_at >= ${last30}
          ), 0)::int AS last30_amount,
          count(*) FILTER (
            WHERE status = 'completed'
              AND is_sample = false
              AND purchased_at >= ${last30}
          ) AS last30_count,
          coalesce(sum(amount_jpy) FILTER (
            WHERE status = 'completed'
              AND is_sample = false
              AND purchased_at >= ${prev30}
              AND purchased_at < ${last30}
          ), 0)::int AS prev30_amount
        FROM purchases
      `),
    null,
    'revenueAgg',
  );
  const ra = pickRow<{
    total_amount: number;
    total_count: number | string;
    last30_amount: number;
    last30_count: number | string;
    prev30_amount: number;
  }>(revAggRaw) ?? {
    total_amount: 0,
    total_count: 0,
    last30_amount: 0,
    last30_count: 0,
    prev30_amount: 0,
  };

  // Postgres の count(*) は文字列 (bigint) で返るので、必ず Number() で正規化する
  const num = (v: number | string | null | undefined): number =>
    typeof v === 'string' ? parseInt(v, 10) || 0 : (v ?? 0);

  const uaTotal = num(ua.total);
  const uaLast30 = num(ua.last30);
  const uaPrev30 = num(ua.prev30);
  const aaPublishedTotal = num(aa.published_total);
  const aaPublishedLast30 = num(aa.published_last30);
  const raTotalAmount = num(ra.total_amount);
  const raTotalCount = num(ra.total_count);
  const raLast30Amount = num(ra.last30_amount);
  const raLast30Count = num(ra.last30_count);
  const raPrev30Amount = num(ra.prev30_amount);

  const revDeltaPct =
    raPrev30Amount > 0
      ? Math.round(((raLast30Amount - raPrev30Amount) / raPrev30Amount) * 100)
      : null;
  const userDeltaPct =
    uaPrev30 > 0 ? Math.round(((uaLast30 - uaPrev30) / uaPrev30) * 100) : null;

  return (
    <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="総ユーザー"
        value={uaTotal.toLocaleString('ja-JP')}
        delta={userDeltaPct}
        footer={`過去 30 日 +${uaLast30.toLocaleString('ja-JP')}`}
      />
      <KpiCard
        label="公開記事"
        value={aaPublishedTotal.toLocaleString('ja-JP')}
        footer={`過去 30 日 +${aaPublishedLast30.toLocaleString('ja-JP')}`}
      />
      <KpiCard
        label="累計売上"
        value={`¥${raTotalAmount.toLocaleString('ja-JP')}`}
        footer={`購入数 ${raTotalCount.toLocaleString('ja-JP')}`}
      />
      <KpiCard
        label="過去 30 日売上"
        value={`¥${raLast30Amount.toLocaleString('ja-JP')}`}
        delta={revDeltaPct}
        footer={`購入数 ${raLast30Count.toLocaleString('ja-JP')}`}
      />
    </section>
  );
}

// ============================================================================
// セクション 3: コンテンツサマリ (3 カード) — group by を 1 つずつ
// ============================================================================

export async function ContentSummaries() {
  const db = getDb();

  const [usersByRole, articlesByStatus, communityByKind] = await Promise.all([
    safeQuery(
      () =>
        db
          .select({ role: schema.users.role, c: count() })
          .from(schema.users)
          .where(isNull(schema.users.deletedAt))
          .groupBy(schema.users.role),
      [] as Array<{ role: string; c: number }>,
      'usersByRole',
    ),
    safeQuery(
      () =>
        db
          .select({ status: schema.articles.status, c: count() })
          .from(schema.articles)
          .where(isNull(schema.articles.deletedAt))
          .groupBy(schema.articles.status),
      [] as Array<{ status: string; c: number }>,
      'articlesByStatus',
    ),
    safeQuery(
      () =>
        db
          .select({ kind: schema.communityPosts.kind, c: count() })
          .from(schema.communityPosts)
          .where(eq(schema.communityPosts.status, 'active'))
          .groupBy(schema.communityPosts.kind),
      [] as Array<{ kind: string; c: number }>,
      'communityByKind',
    ),
  ]);

  const roleMap = Object.fromEntries(usersByRole.map((r) => [r.role, r.c]));
  const statusMap = Object.fromEntries(
    articlesByStatus.map((r) => [r.status, r.c]),
  );
  const kindMap = Object.fromEntries(communityByKind.map((r) => [r.kind, r.c]));
  const totalCommunity = communityByKind.reduce((sum, r) => sum + r.c, 0);

  return (
    <section className="mb-8 grid gap-4 lg:grid-cols-3">
      <SummaryCard
        icon={Users2}
        title="ユーザーロール別"
        href="/admin/users"
        rows={[
          { label: '読者', value: roleMap['reader'] ?? 0 },
          { label: 'ライター', value: roleMap['resident_writer'] ?? 0 },
          { label: '編集者', value: roleMap['editor'] ?? 0 },
          { label: '日記投稿', value: roleMap['light_diarist'] ?? 0 },
        ]}
      />
      <SummaryCard
        icon={Newspaper}
        title="記事ステータス"
        href="/admin/articles"
        rows={[
          { label: '公開中', value: statusMap['published'] ?? 0, highlight: true },
          { label: '下書き', value: statusMap['draft'] ?? 0 },
          { label: '審査中', value: statusMap['pending_review'] ?? 0 },
          { label: 'アーカイブ', value: statusMap['archived'] ?? 0 },
        ]}
      />
      <SummaryCard
        icon={MessageSquare}
        title="コミュニティ (active)"
        href="/admin/community"
        rows={[
          { label: '求人', value: kindMap['job'] ?? 0 },
          { label: 'アパート', value: kindMap['apartment'] ?? 0 },
          { label: '売買', value: kindMap['marketplace'] ?? 0 },
          { label: 'グループ', value: kindMap['group'] ?? 0 },
          { label: 'レッスン', value: kindMap['lesson'] ?? 0 },
          { label: '助け合い', value: kindMap['mutual_aid'] ?? 0 },
        ]}
        footer={`合計: ${totalCommunity}`}
      />
    </section>
  );
}

// ============================================================================
// セクション 4: Top クリエイター + 直近購入
// ============================================================================

export async function TopAndRecent() {
  const db = getDb();
  const last30 = daysAgo(30);

  const [topCreators, recentPurchases] = await Promise.all([
    safeQuery(
      () =>
        db
          .select({
            writerId: schema.articles.writerId,
            writerName: schema.users.displayName,
            payoutJpy: sql<number>`coalesce(sum(${schema.purchases.payoutJpy}), 0)::int`,
            purchases: count(),
          })
          .from(schema.purchases)
          .innerJoin(
            schema.articles,
            eq(schema.articles.id, schema.purchases.articleId),
          )
          .leftJoin(schema.users, eq(schema.users.id, schema.articles.writerId))
          .where(
            and(
              eq(schema.purchases.status, 'completed'),
              gte(schema.purchases.purchasedAt, last30),
            ),
          )
          .groupBy(schema.articles.writerId, schema.users.displayName)
          .orderBy(desc(sql`sum(${schema.purchases.payoutJpy})`))
          .limit(8),
      [] as Array<{
        writerId: string;
        writerName: string | null;
        payoutJpy: number;
        purchases: number;
      }>,
      'topCreators',
    ),
    safeQuery(
      () =>
        db
          .select({
            id: schema.purchases.id,
            amountJpy: schema.purchases.amountJpy,
            purchasedAt: schema.purchases.purchasedAt,
            articleTitle: schema.articles.title,
            articleId: schema.purchases.articleId,
            buyerName: schema.users.displayName,
          })
          .from(schema.purchases)
          .innerJoin(
            schema.articles,
            eq(schema.articles.id, schema.purchases.articleId),
          )
          .leftJoin(schema.users, eq(schema.users.id, schema.purchases.buyerId))
          .where(eq(schema.purchases.status, 'completed'))
          .orderBy(desc(schema.purchases.purchasedAt))
          .limit(12),
      [] as Array<{
        id: string;
        amountJpy: number;
        purchasedAt: Date;
        articleTitle: string;
        articleId: string;
        buyerName: string | null;
      }>,
      'recentPurchases',
    ),
  ]);

  return (
    <section className="mb-8 grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-border bg-card p-5">
        <header className="mb-4 flex items-baseline justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/55">
              Top creators
            </p>
            <h2 className="mt-1 text-[16px] font-semibold tracking-tight">
              過去 30 日の売上 Top 8
            </h2>
          </div>
          <Link
            href="/admin/users?role=resident_writer"
            className="text-[11px] text-primary-300 hover:underline"
          >
            全ライター →
          </Link>
        </header>
        {topCreators.length === 0 ? (
          <p className="text-[12px] text-foreground/55">
            過去 30 日に売上のあるクリエイターはいません。
          </p>
        ) : (
          <ul className="space-y-1">
            {topCreators.map((row, i) => (
              <li
                key={`${row.writerId}-${i}`}
                className="flex items-center gap-3 py-1.5"
              >
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold tabular text-foreground/65">
                  {i + 1}
                </span>
                <Link
                  href={`/users/${row.writerId}`}
                  className="min-w-0 flex-1 truncate text-[12px] font-medium hover:text-primary-300"
                >
                  {row.writerName ?? '（無名）'}
                </Link>
                <span className="shrink-0 text-[11px] tabular text-foreground/55">
                  {row.purchases} 件
                </span>
                <span className="shrink-0 text-[12px] font-semibold tabular">
                  ¥{(row.payoutJpy ?? 0).toLocaleString('ja-JP')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <header className="mb-4 flex items-baseline justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/55">
              Recent activity
            </p>
            <h2 className="mt-1 text-[16px] font-semibold tracking-tight">
              直近の購入 12 件
            </h2>
          </div>
          <Link
            href="/admin/revenue"
            className="text-[11px] text-primary-300 hover:underline"
          >
            売上詳細 →
          </Link>
        </header>
        {recentPurchases.length === 0 ? (
          <p className="text-[12px] text-foreground/55">まだ購入がありません。</p>
        ) : (
          <ul className="divide-y divide-border">
            {recentPurchases.map((row) => (
              <li key={row.id} className="flex items-start gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/articles/${row.articleId}`}
                    className="block truncate text-[12px] font-medium hover:text-primary-300"
                  >
                    {row.articleTitle}
                  </Link>
                  <p className="mt-0.5 text-[10px] text-foreground/55">
                    {row.buyerName ?? '匿名'} ・{' '}
                    {row.purchasedAt.toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <span className="shrink-0 text-[12px] font-semibold tabular">
                  ¥{row.amountJpy.toLocaleString('ja-JP')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// ============================================================================
// 共通パーツ
// ============================================================================

function KpiCard({
  label,
  value,
  delta,
  footer,
}: {
  label: string;
  value: string;
  delta?: number | null;
  footer?: string;
}) {
  const deltaColor =
    delta == null
      ? 'text-foreground/40'
      : delta >= 0
        ? 'text-success-500'
        : 'text-danger-500';
  const deltaSign = delta == null ? '' : delta >= 0 ? '+' : '';
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">
        {label}
      </p>
      <p
        className="mt-1.5 text-[24px] font-semibold tabular tracking-tight text-foreground"
        style={{ fontFamily: 'var(--font-sans), system-ui, sans-serif' }}
      >
        {value}
      </p>
      {delta != null ? (
        <p className={`mt-0.5 text-[11px] font-medium ${deltaColor}`}>
          {deltaSign}
          {delta}% 前期比
        </p>
      ) : null}
      {footer ? (
        <p className="mt-0.5 text-[10px] text-foreground/50 tabular">{footer}</p>
      ) : null}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  title,
  href,
  rows,
  footer,
}: {
  icon: typeof Flag;
  title: string;
  href: string;
  rows: Array<{ label: string; value: number; highlight?: boolean }>;
  footer?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <header className="mb-3 flex items-baseline justify-between">
        <h3 className="inline-flex items-center gap-1.5 text-[13px] font-semibold">
          <Icon className="h-3.5 w-3.5 text-primary-300" />
          {title}
        </h3>
        <Link href={href} className="text-[11px] text-primary-300 hover:underline">
          管理 →
        </Link>
      </header>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex items-center justify-between gap-2 text-[12px]"
          >
            <span
              className={
                r.highlight ? 'font-medium text-foreground' : 'text-foreground/70'
              }
            >
              {r.label}
            </span>
            <span
              className={
                'tabular ' +
                (r.highlight
                  ? 'text-[14px] font-bold text-foreground'
                  : 'text-foreground/60')
              }
            >
              {r.value.toLocaleString('ja-JP')}
            </span>
          </li>
        ))}
      </ul>
      {footer ? (
        <p className="mt-3 border-t border-border pt-2 text-[10px] text-foreground/50 tabular">
          {footer}
        </p>
      ) : null}
    </div>
  );
}
