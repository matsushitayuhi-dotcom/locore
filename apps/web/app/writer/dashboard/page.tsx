import Link from 'next/link';
import { eq, gte, sql, desc, and, count } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireWriter } from '@/lib/auth/require-user';

export const metadata = { title: 'クリエイターダッシュボード' };
export const dynamic = 'force-dynamic';

export default async function WriterDashboardPage() {
  const me = await requireWriter('/writer/dashboard');
  const db = getDb();

  const now = new Date();
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const prev30 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // 自分の記事 ID リスト（このユーザーが書いたもの）
  const myArticles = await db
    .select({
      id: schema.articles.id,
      title: schema.articles.title,
      status: schema.articles.status,
      priceJpy: schema.articles.priceJpy,
      publishedAt: schema.articles.publishedAt,
      coverImageUrl: schema.articles.coverImageUrl,
    })
    .from(schema.articles)
    .where(eq(schema.articles.writerId, me.id))
    .orderBy(desc(schema.articles.publishedAt));

  const myArticleIds = myArticles.map((a) => a.id);
  const publishedCount = myArticles.filter(
    (a) => a.status === 'published',
  ).length;
  const draftCount = myArticles.filter(
    (a) => a.status === 'draft' || a.status === 'pending_review',
  ).length;

  // 自分の記事の購入レコード集計
  let totalRev = 0;
  let totalPayout = 0;
  let totalPurchases = 0;
  let rev30 = 0;
  let payout30 = 0;
  let count30 = 0;
  let revPrev30 = 0;
  let payoutThisMonth = 0;
  let perArticle: Array<{
    articleId: string;
    title: string;
    purchases: number;
    payoutJpy: number;
  }> = [];
  let recentPurchases: Array<{
    id: string;
    purchasedAt: Date;
    amountJpy: number;
    payoutJpy: number;
    articleId: string;
    articleTitle: string;
  }> = [];

  if (myArticleIds.length > 0) {
    const articleIdList = sql.join(
      myArticleIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    );

    const [
      allTimeRows,
      last30Rows,
      prev30Rows,
      thisMonthRows,
      perArticleRows,
      recentRows,
    ] = await Promise.all([
      db
        .select({
          amount: sql<number>`coalesce(sum(${schema.purchases.amountJpy}), 0)::int`,
          payout: sql<number>`coalesce(sum(${schema.purchases.payoutJpy}), 0)::int`,
          purchases: count(),
        })
        .from(schema.purchases)
        .where(
          and(
            eq(schema.purchases.status, 'completed'),
            sql`${schema.purchases.articleId} IN (${articleIdList})`,
          ),
        ),
      db
        .select({
          amount: sql<number>`coalesce(sum(${schema.purchases.amountJpy}), 0)::int`,
          payout: sql<number>`coalesce(sum(${schema.purchases.payoutJpy}), 0)::int`,
          purchases: count(),
        })
        .from(schema.purchases)
        .where(
          and(
            eq(schema.purchases.status, 'completed'),
            gte(schema.purchases.purchasedAt, last30),
            sql`${schema.purchases.articleId} IN (${articleIdList})`,
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
            sql`${schema.purchases.articleId} IN (${articleIdList})`,
          ),
        ),
      db
        .select({
          payout: sql<number>`coalesce(sum(${schema.purchases.payoutJpy}), 0)::int`,
        })
        .from(schema.purchases)
        .where(
          and(
            eq(schema.purchases.status, 'completed'),
            gte(schema.purchases.purchasedAt, monthStart),
            sql`${schema.purchases.articleId} IN (${articleIdList})`,
          ),
        ),
      db
        .select({
          articleId: schema.purchases.articleId,
          title: schema.articles.title,
          purchases: count(),
          payoutJpy: sql<number>`coalesce(sum(${schema.purchases.payoutJpy}), 0)::int`,
        })
        .from(schema.purchases)
        .innerJoin(
          schema.articles,
          eq(schema.articles.id, schema.purchases.articleId),
        )
        .where(
          and(
            eq(schema.purchases.status, 'completed'),
            sql`${schema.purchases.articleId} IN (${articleIdList})`,
          ),
        )
        .groupBy(schema.purchases.articleId, schema.articles.title)
        .orderBy(desc(sql`sum(${schema.purchases.payoutJpy})`))
        .limit(8),
      db
        .select({
          id: schema.purchases.id,
          purchasedAt: schema.purchases.purchasedAt,
          amountJpy: schema.purchases.amountJpy,
          payoutJpy: schema.purchases.payoutJpy,
          articleId: schema.purchases.articleId,
          articleTitle: schema.articles.title,
        })
        .from(schema.purchases)
        .innerJoin(
          schema.articles,
          eq(schema.articles.id, schema.purchases.articleId),
        )
        .where(
          and(
            eq(schema.purchases.status, 'completed'),
            sql`${schema.purchases.articleId} IN (${articleIdList})`,
          ),
        )
        .orderBy(desc(schema.purchases.purchasedAt))
        .limit(15),
    ]);

    totalRev = allTimeRows[0]?.amount ?? 0;
    totalPayout = allTimeRows[0]?.payout ?? 0;
    totalPurchases = allTimeRows[0]?.purchases ?? 0;
    rev30 = last30Rows[0]?.amount ?? 0;
    payout30 = last30Rows[0]?.payout ?? 0;
    count30 = last30Rows[0]?.purchases ?? 0;
    revPrev30 = prev30Rows[0]?.amount ?? 0;
    payoutThisMonth = thisMonthRows[0]?.payout ?? 0;
    perArticle = perArticleRows;
    recentPurchases = recentRows;
  }

  const revDeltaPct =
    revPrev30 > 0 ? Math.round(((rev30 - revPrev30) / revPrev30) * 100) : null;

  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
              Creator Studio
            </p>
            <h1
              className="text-[32px] font-semibold tracking-tight"
              style={{
                fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
              }}
            >
              ダッシュボード
            </h1>
            <p className="mt-2 text-[13px] text-foreground/60">
              {me.displayName ?? '匿名'} さんの執筆活動サマリ。月末締めの今月分支払い予定額もここで確認できます。
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/writer/articles"
              className="inline-flex items-center gap-1 rounded-full bg-card px-4 py-2 text-[12px] font-medium text-foreground ring-1 ring-border transition hover:bg-muted"
            >
              記事を管理
            </Link>
            <Link
              href="/writer/articles/new"
              className="inline-flex items-center gap-1 rounded-full bg-primary-500 px-4 py-2 text-[12px] font-bold text-neutral-950 transition hover:bg-primary-300"
            >
              + 新規記事
            </Link>
          </div>
        </header>

        {/* KPI cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="公開中の記事"
            value={publishedCount.toLocaleString('ja-JP')}
            footer={draftCount > 0 ? `下書き ${draftCount} 件` : undefined}
          />
          <KpiCard
            label="累計購入数"
            value={totalPurchases.toLocaleString('ja-JP')}
            footer={`総売上 ¥${totalRev.toLocaleString('ja-JP')}`}
          />
          <KpiCard
            label="今月の支払い予定"
            value={`¥${payoutThisMonth.toLocaleString('ja-JP')}`}
            footer={`月末締め、翌月 15 日振込`}
          />
          <KpiCard
            label="過去 30 日の収益"
            value={`¥${payout30.toLocaleString('ja-JP')}`}
            delta={revDeltaPct}
            footer={`購入 ${count30} 件 / 売上 ¥${rev30.toLocaleString('ja-JP')}`}
          />
        </div>

        {/* Per-article + recent */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <header className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/50">
                Per article
              </p>
              <h2 className="mt-1 text-[18px] font-semibold tracking-tight">
                記事別の累計収益 Top 8
              </h2>
            </header>
            {perArticle.length === 0 ? (
              <p className="text-[13px] text-foreground/55">
                まだ購入がありません。最初の公開記事を出してみましょう。
              </p>
            ) : (
              <ul className="space-y-1">
                {perArticle.map((row, i) => (
                  <li
                    key={row.articleId}
                    className="flex items-center gap-3 py-2"
                  >
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold tabular text-foreground/70">
                      {i + 1}
                    </span>
                    <Link
                      href={`/articles/${row.articleId}`}
                      className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground hover:text-primary-300"
                    >
                      {row.title}
                    </Link>
                    <span className="shrink-0 text-[12px] tabular text-foreground/60">
                      {row.purchases} 件
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold tabular text-foreground">
                      ¥{row.payoutJpy.toLocaleString('ja-JP')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <header className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/50">
                Recent
              </p>
              <h2 className="mt-1 text-[18px] font-semibold tracking-tight">
                直近の購入
              </h2>
            </header>
            {recentPurchases.length === 0 ? (
              <p className="text-[13px] text-foreground/55">
                まだ購入がありません。
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recentPurchases.map((row) => (
                  <li key={row.id} className="flex items-start gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/articles/${row.articleId}`}
                        className="block truncate text-[13px] font-medium text-foreground hover:text-primary-300"
                      >
                        {row.articleTitle}
                      </Link>
                      <p className="mt-0.5 text-[11px] text-foreground/55">
                        {row.purchasedAt.toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[13px] font-semibold tabular text-foreground">
                        ¥{row.payoutJpy.toLocaleString('ja-JP')}
                      </p>
                      <p className="text-[10px] tabular text-foreground/50">
                        / ¥{row.amountJpy.toLocaleString('ja-JP')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* My articles list */}
        <section className="mt-8 rounded-xl border border-border bg-card p-5 sm:p-6">
          <header className="mb-4 flex items-baseline justify-between">
            <h2 className="text-[18px] font-semibold tracking-tight">
              すべての記事
              <span className="ml-2 text-[12px] font-normal tabular text-foreground/55">
                {myArticles.length} 件
              </span>
            </h2>
            <Link
              href="/writer/articles"
              className="text-[12px] text-primary-300 underline-offset-4 hover:underline"
            >
              管理画面へ →
            </Link>
          </header>
          {myArticles.length === 0 ? (
            <p className="text-[13px] text-foreground/55">
              まだ記事がありません。
              <Link
                href="/writer/articles/new"
                className="ml-1 text-primary-300 underline-offset-4 hover:underline"
              >
                最初の記事を書く
              </Link>
              。
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {myArticles.slice(0, 8).map((a) => (
                <li
                  key={a.id}
                  className="rounded-md bg-background/40 p-3 ring-1 ring-border"
                >
                  <div className="flex items-start gap-3">
                    {a.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.coverImageUrl}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-sm object-cover ring-1 ring-border"
                      />
                    ) : (
                      <div className="h-14 w-14 shrink-0 rounded-sm bg-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/writer/articles/${a.id}/edit`}
                        className="line-clamp-2 text-[13px] font-medium text-foreground hover:text-primary-300"
                      >
                        {a.title}
                      </Link>
                      <p className="mt-1 text-[11px] tabular text-foreground/55">
                        {STATUS_LABEL[a.status] ?? a.status} ・ ¥
                        {a.priceJpy.toLocaleString('ja-JP')}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-8 text-[11px] text-foreground/40">
          支払いは月末締め・翌月 15 日に登録口座へ振込されます。振込先口座は{' '}
          <Link
            href="/settings/payout"
            className="underline-offset-4 hover:underline"
          >
            設定 → 支払い情報
          </Link>
          {' '}で登録してください。
        </p>
      </div>
    </main>
  );
}

const STATUS_LABEL: Record<string, string> = {
  draft: '下書き',
  pending_review: '審査中',
  published: '公開中',
  archived: 'アーカイブ',
};

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
