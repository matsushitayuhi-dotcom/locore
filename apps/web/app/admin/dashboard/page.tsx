import Link from 'next/link';
import { eq, gte, sql, desc, and, isNull, count } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireEditor } from '@/lib/auth/require-user';

export const metadata = { title: '運営ダッシュボード' };
export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const editor = await requireEditor();
  if (!editor) {
    return (
      <main className="mx-auto max-w-screen-md px-4 py-12">
        <p className="text-[14px] text-foreground/70">
          このページは編集チームメンバー限定です。
        </p>
      </main>
    );
  }
  const db = getDb();

  const now = new Date();
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const prev30 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // 集計クエリを並列発火
  const [
    userTotal,
    userLast30,
    userPrev30,
    articleTotal,
    articleLast30,
    revenueTotalRows,
    revenueLast30Rows,
    revenuePrev30Rows,
    pendingReportsRows,
    topCreatorsRows,
    recentPurchasesRows,
  ] = await Promise.all([
    db.select({ c: count() }).from(schema.users),
    db
      .select({ c: count() })
      .from(schema.users)
      .where(gte(schema.users.createdAt, last30)),
    db
      .select({ c: count() })
      .from(schema.users)
      .where(
        and(
          gte(schema.users.createdAt, prev30),
          sql`${schema.users.createdAt} < ${last30}`,
        ),
      ),
    db
      .select({ c: count() })
      .from(schema.articles)
      .where(eq(schema.articles.status, 'published')),
    db
      .select({ c: count() })
      .from(schema.articles)
      .where(
        and(
          eq(schema.articles.status, 'published'),
          gte(schema.articles.publishedAt, last30),
        ),
      ),
    db
      .select({
        amount: sql<number>`coalesce(sum(${schema.purchases.amountJpy}), 0)::int`,
        purchases: count(),
      })
      .from(schema.purchases)
      .where(eq(schema.purchases.status, 'completed')),
    db
      .select({
        amount: sql<number>`coalesce(sum(${schema.purchases.amountJpy}), 0)::int`,
        purchases: count(),
      })
      .from(schema.purchases)
      .where(
        and(
          eq(schema.purchases.status, 'completed'),
          gte(schema.purchases.purchasedAt, last30),
        ),
      ),
    db
      .select({
        amount: sql<number>`coalesce(sum(${schema.purchases.amountJpy}), 0)::int`,
      })
      .from(schema.purchases)
      .where(
        and(
          eq(schema.purchases.status, 'completed'),
          gte(schema.purchases.purchasedAt, prev30),
          sql`${schema.purchases.purchasedAt} < ${last30}`,
        ),
      ),
    db
      .select({ c: count() })
      .from(schema.reports)
      .where(eq(schema.reports.status, 'open')),
    // Top creators by 30-day payout
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
      .limit(10),
    // Recent purchases (last 20)
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
      .limit(20),
  ]);

  const userTotalC = userTotal[0]?.c ?? 0;
  const userLast30C = userLast30[0]?.c ?? 0;
  const userPrev30C = userPrev30[0]?.c ?? 0;
  const articleTotalC = articleTotal[0]?.c ?? 0;
  const articleLast30C = articleLast30[0]?.c ?? 0;
  const revTotal = revenueTotalRows[0] ?? { amount: 0, purchases: 0 };
  const rev30 = revenueLast30Rows[0] ?? { amount: 0, purchases: 0 };
  const revPrev30 = revenuePrev30Rows[0] ?? { amount: 0 };
  const pendingReports = pendingReportsRows[0]?.c ?? 0;

  const revDeltaPct =
    revPrev30.amount > 0
      ? Math.round(((rev30.amount - revPrev30.amount) / revPrev30.amount) * 100)
      : null;
  const userDeltaPct =
    userPrev30C > 0
      ? Math.round(((userLast30C - userPrev30C) / userPrev30C) * 100)
      : null;

  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
              Operations
            </p>
            <h1
              className="text-[32px] font-semibold tracking-tight"
              style={{
                fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
              }}
            >
              運営ダッシュボード
            </h1>
            <p className="mt-2 text-[13px] text-foreground/60">
              {now.toLocaleString('ja-JP', { dateStyle: 'long', timeStyle: 'short' })}{' '}
              現在のスナップショット。
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/reports"
              className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-[12px] font-medium text-foreground ring-1 ring-border transition hover:bg-muted"
            >
              通報・お問い合わせ
              {pendingReports > 0 ? (
                <span className="rounded-full bg-danger-500 px-2 py-0.5 text-[10px] font-bold tabular text-white">
                  {pendingReports}
                </span>
              ) : null}
            </Link>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-card px-4 py-2 text-[12px] font-medium text-foreground ring-1 ring-border transition hover:bg-muted"
            >
              Supabase Studio →
            </a>
          </div>
        </header>

        {/* KPI cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="総ユーザー"
            value={userTotalC.toLocaleString('ja-JP')}
            delta={userDeltaPct}
            footer={`過去 30 日 +${userLast30C}`}
          />
          <KpiCard
            label="公開記事"
            value={articleTotalC.toLocaleString('ja-JP')}
            footer={`過去 30 日 +${articleLast30C}`}
          />
          <KpiCard
            label="累計売上"
            value={`¥${revTotal.amount.toLocaleString('ja-JP')}`}
            footer={`購入数 ${revTotal.purchases.toLocaleString('ja-JP')}`}
          />
          <KpiCard
            label="過去 30 日売上"
            value={`¥${rev30.amount.toLocaleString('ja-JP')}`}
            delta={revDeltaPct}
            footer={`購入数 ${rev30.purchases.toLocaleString('ja-JP')}`}
          />
        </div>

        {/* Two-column grid: top creators / recent purchases */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <header className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/50">
                Top creators
              </p>
              <h2 className="mt-1 text-[18px] font-semibold tracking-tight">
                過去 30 日のクリエイター別売上 Top 10
              </h2>
            </header>
            {topCreatorsRows.length === 0 ? (
              <p className="text-[13px] text-foreground/55">
                過去 30 日に売上のあるクリエイターはいません。
              </p>
            ) : (
              <ul className="space-y-1">
                {topCreatorsRows.map((row, i) => (
                  <li
                    key={`${row.writerId}-${i}`}
                    className="flex items-center gap-3 py-2"
                  >
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold tabular text-foreground/70">
                      {i + 1}
                    </span>
                    <Link
                      href={`/writers/${row.writerId}`}
                      className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground hover:text-primary-300"
                    >
                      {row.writerName ?? '（無名）'}
                    </Link>
                    <span className="shrink-0 text-[12px] tabular text-foreground/60">
                      {row.purchases} 件
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold tabular text-foreground">
                      ¥{(row.payoutJpy ?? 0).toLocaleString('ja-JP')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <header className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/50">
                Recent activity
              </p>
              <h2 className="mt-1 text-[18px] font-semibold tracking-tight">
                直近の購入 20 件
              </h2>
            </header>
            {recentPurchasesRows.length === 0 ? (
              <p className="text-[13px] text-foreground/55">
                まだ購入がありません。
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recentPurchasesRows.map((row) => (
                  <li key={row.id} className="flex items-start gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/articles/${row.articleId}`}
                        className="block truncate text-[13px] font-medium text-foreground hover:text-primary-300"
                      >
                        {row.articleTitle}
                      </Link>
                      <p className="mt-0.5 text-[11px] text-foreground/55">
                        {row.buyerName ?? '匿名'} ・{' '}
                        {row.purchasedAt.toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <span className="shrink-0 text-[13px] font-semibold tabular text-foreground">
                      ¥{row.amountJpy.toLocaleString('ja-JP')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <p className="mt-8 text-[11px] text-foreground/40">
          ad-hoc SQL クエリ・カスタムレポートは Supabase Studio へどうぞ。
          売上明細は Stripe ダッシュボードで確認できます。
        </p>
      </div>
    </main>
  );
}

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
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/55">
        {label}
      </p>
      <p
        className="mt-2 text-[26px] font-semibold tabular tracking-tight text-foreground"
        style={{ fontFamily: 'var(--font-sans), system-ui, sans-serif' }}
      >
        {value}
      </p>
      {delta != null ? (
        <p className={`mt-1 text-[12px] font-medium ${deltaColor}`}>
          {deltaSign}
          {delta}% 前期比
        </p>
      ) : null}
      {footer ? (
        <p className="mt-1 text-[11px] text-foreground/50 tabular">{footer}</p>
      ) : null}
    </div>
  );
}

// suppress unused import warning (kept for future "未公開記事" filter)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _unusedIsNull = isNull;
