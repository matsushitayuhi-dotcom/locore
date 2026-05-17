import Link from 'next/link';
import { eq, gte, sql, desc, and, count, isNull } from 'drizzle-orm';
import {
  AlertCircle,
  Flag,
  ShieldCheck,
  Newspaper,
  MessageSquare,
  Users2,
  ArrowRight,
} from 'lucide-react';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { AdminPageHeader } from './_components/AdminPageHeader';

/**
 * /admin — オーバービュー（ダッシュボード）。
 *
 * 構成:
 *   1. 警告バー: 未処理タスク (通報 / 本人確認)
 *   2. ビジネス KPI: ユーザー / 記事 / 売上 / 過去 30 日
 *   3. コンテンツ サマリ: コミュニティ投稿 / 掲示板 / 本人確認
 *   4. Top クリエイター + 直近購入
 *   5. クイックリンク
 */

export const metadata = { title: '運営ダッシュボード' };
export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const db = getDb();

  const now = new Date();
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const prev30 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // クエリは defensive に: 1 つ落ちても他は表示する
  const safe = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      console.error('[admin overview] query failed:', err);
      return fallback;
    }
  };

  const [
    userTotal,
    userLast30,
    userPrev30,
    usersByRoleRows,
    articleTotal,
    articleByStatusRows,
    articleLast30,
    revenueTotalRows,
    revenueLast30Rows,
    revenuePrev30Rows,
    pendingReports,
    pendingVerifications,
    communityActive,
    communityByKind,
    boardPostsTotal,
    topCreatorsRows,
    recentPurchasesRows,
  ] = await Promise.all([
    safe(() => db.select({ c: count() }).from(schema.users), [{ c: 0 }]),
    safe(
      () =>
        db
          .select({ c: count() })
          .from(schema.users)
          .where(gte(schema.users.createdAt, last30)),
      [{ c: 0 }],
    ),
    safe(
      () =>
        db
          .select({ c: count() })
          .from(schema.users)
          .where(
            and(
              gte(schema.users.createdAt, prev30),
              sql`${schema.users.createdAt} < ${last30}`,
            ),
          ),
      [{ c: 0 }],
    ),
    safe(
      () =>
        db
          .select({ role: schema.users.role, c: count() })
          .from(schema.users)
          .groupBy(schema.users.role),
      [] as Array<{ role: string; c: number }>,
    ),
    safe(
      () =>
        db
          .select({ c: count() })
          .from(schema.articles)
          .where(eq(schema.articles.status, 'published')),
      [{ c: 0 }],
    ),
    safe(
      () =>
        db
          .select({ status: schema.articles.status, c: count() })
          .from(schema.articles)
          .where(isNull(schema.articles.deletedAt))
          .groupBy(schema.articles.status),
      [] as Array<{ status: string; c: number }>,
    ),
    safe(
      () =>
        db
          .select({ c: count() })
          .from(schema.articles)
          .where(
            and(
              eq(schema.articles.status, 'published'),
              gte(schema.articles.publishedAt, last30),
            ),
          ),
      [{ c: 0 }],
    ),
    safe(
      () =>
        db
          .select({
            amount: sql<number>`coalesce(sum(${schema.purchases.amountJpy}), 0)::int`,
            purchases: count(),
          })
          .from(schema.purchases)
          .where(eq(schema.purchases.status, 'completed')),
      [{ amount: 0, purchases: 0 }],
    ),
    safe(
      () =>
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
      [{ amount: 0, purchases: 0 }],
    ),
    safe(
      () =>
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
      [{ amount: 0 }],
    ),
    safe(
      () =>
        db
          .select({ c: count() })
          .from(schema.reports)
          .where(eq(schema.reports.status, 'open')),
      [{ c: 0 }],
    ),
    safe(
      () =>
        db
          .select({ c: count() })
          .from(schema.residencyVerifications)
          .where(eq(schema.residencyVerifications.status, 'pending')),
      [{ c: 0 }],
    ),
    safe(
      () =>
        db
          .select({ c: count() })
          .from(schema.communityPosts)
          .where(eq(schema.communityPosts.status, 'active')),
      [{ c: 0 }],
    ),
    safe(
      () =>
        db
          .select({ kind: schema.communityPosts.kind, c: count() })
          .from(schema.communityPosts)
          .where(eq(schema.communityPosts.status, 'active'))
          .groupBy(schema.communityPosts.kind),
      [] as Array<{ kind: string; c: number }>,
    ),
    safe(
      () =>
        db
          .select({ c: count() })
          .from(schema.boardPosts)
          .where(gte(schema.boardPosts.createdAt, last7)),
      [{ c: 0 }],
    ),
    safe(
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
    ),
    safe(
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
    ),
  ]);

  const userTotalC = userTotal[0]?.c ?? 0;
  const userLast30C = userLast30[0]?.c ?? 0;
  const userPrev30C = userPrev30[0]?.c ?? 0;
  const articleTotalC = articleTotal[0]?.c ?? 0;
  const articleLast30C = articleLast30[0]?.c ?? 0;
  const revTotal = revenueTotalRows[0] ?? { amount: 0, purchases: 0 };
  const rev30 = revenueLast30Rows[0] ?? { amount: 0, purchases: 0 };
  const revPrev30 = revenuePrev30Rows[0] ?? { amount: 0 };
  const openReports = pendingReports[0]?.c ?? 0;
  const openVerifs = pendingVerifications[0]?.c ?? 0;
  const activeCommunity = communityActive[0]?.c ?? 0;
  const last7Board = boardPostsTotal[0]?.c ?? 0;

  const revDeltaPct =
    revPrev30.amount > 0
      ? Math.round(((rev30.amount - revPrev30.amount) / revPrev30.amount) * 100)
      : null;
  const userDeltaPct =
    userPrev30C > 0
      ? Math.round(((userLast30C - userPrev30C) / userPrev30C) * 100)
      : null;

  // ロール別を辞書化
  const roleMap = Object.fromEntries(usersByRoleRows.map((r) => [r.role, r.c]));
  const statusMap = Object.fromEntries(
    articleByStatusRows.map((r) => [r.status, r.c]),
  );
  const kindMap = Object.fromEntries(communityByKind.map((r) => [r.kind, r.c]));

  return (
    <div>
      <AdminPageHeader
        title="運営ダッシュボード"
        description={`${now.toLocaleString('ja-JP', { dateStyle: 'long', timeStyle: 'short' })} 現在のスナップショット`}
      />

      {/* 1. 未処理タスクの警告バー */}
      {openReports > 0 || openVerifs > 0 ? (
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
                <p className="text-[11px] text-foreground/65">
                  クリックして対応する
                </p>
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
                <p className="text-[11px] text-foreground/65">
                  クリックしてレビュー
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-amber-600" />
            </Link>
          ) : null}
        </section>
      ) : null}

      {/* 2. ビジネス KPI */}
      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="総ユーザー"
          value={userTotalC.toLocaleString('ja-JP')}
          delta={userDeltaPct}
          footer={`過去 30 日 +${userLast30C.toLocaleString('ja-JP')}`}
        />
        <KpiCard
          label="公開記事"
          value={articleTotalC.toLocaleString('ja-JP')}
          footer={`過去 30 日 +${articleLast30C.toLocaleString('ja-JP')}`}
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
      </section>

      {/* 3. コンテンツサマリ */}
      <section className="mb-8 grid gap-4 lg:grid-cols-3">
        {/* ユーザーロール別 */}
        <SummaryCard
          icon={Users2}
          title="ユーザーロール別"
          href="/admin/users"
          rows={[
            { label: '読者 (reader)', value: roleMap['reader'] ?? 0 },
            {
              label: 'ライター (resident_writer)',
              value: roleMap['resident_writer'] ?? 0,
            },
            { label: '編集者 (editor)', value: roleMap['editor'] ?? 0 },
            {
              label: '日記投稿者 (light_diarist)',
              value: roleMap['light_diarist'] ?? 0,
            },
          ]}
        />

        {/* 記事ステータス別 */}
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

        {/* コミュニティ投稿 kind 別 */}
        <SummaryCard
          icon={MessageSquare}
          title="コミュニティ投稿 (active)"
          href="/admin/community"
          rows={[
            { label: '求人 (job)', value: kindMap['job'] ?? 0 },
            { label: 'アパート (apartment)', value: kindMap['apartment'] ?? 0 },
            { label: '売買 (marketplace)', value: kindMap['marketplace'] ?? 0 },
            { label: 'グループ (group)', value: kindMap['group'] ?? 0 },
            { label: 'レッスン (lesson)', value: kindMap['lesson'] ?? 0 },
            { label: '助け合い (mutual_aid)', value: kindMap['mutual_aid'] ?? 0 },
          ]}
          footer={`合計 active: ${activeCommunity}`}
        />
      </section>

      {/* 4. Top クリエイター + 直近購入 */}
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
          {topCreatorsRows.length === 0 ? (
            <p className="text-[12px] text-foreground/55">
              過去 30 日に売上のあるクリエイターはいません。
            </p>
          ) : (
            <ul className="space-y-1">
              {topCreatorsRows.map((row, i) => (
                <li
                  key={`${row.writerId}-${i}`}
                  className="flex items-center gap-3 py-1.5"
                >
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold tabular text-foreground/65">
                    {i + 1}
                  </span>
                  <Link
                    href={`/residents/${row.writerId}`}
                    className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground hover:text-primary-300"
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
          {recentPurchasesRows.length === 0 ? (
            <p className="text-[12px] text-foreground/55">
              まだ購入がありません。
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recentPurchasesRows.map((row) => (
                <li key={row.id} className="flex items-start gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/articles/${row.articleId}`}
                      className="block truncate text-[12px] font-medium text-foreground hover:text-primary-300"
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

      {/* 5. クイックリンク (admin 内 + 外部) */}
      <section className="mb-8 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl bg-card p-5 ring-1 ring-border">
          <h2 className="mb-3 text-[12px] font-bold uppercase tracking-[0.16em] text-foreground/55">
            Locore 内
          </h2>
          <div className="flex flex-wrap gap-2">
            <QuickLink href="/admin/board">掲示板に投稿</QuickLink>
            <QuickLink href="/admin/verifications">
              本人確認をレビュー
            </QuickLink>
            <QuickLink href={`/admin/reports?status=open`}>通報対応</QuickLink>
            <QuickLink href="/admin/users">ユーザー管理</QuickLink>
            <QuickLink href="/calendar">イベントカレンダー</QuickLink>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-foreground/55">
            <span>
              掲示板 (7日新着):{' '}
              <strong className="tabular text-foreground">{last7Board}</strong>
            </span>
            <span>
              未対応通報:{' '}
              <strong className="tabular text-foreground">{openReports}</strong>
            </span>
            <span>
              未処理本人確認:{' '}
              <strong className="tabular text-foreground">{openVerifs}</strong>
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-card p-5 ring-1 ring-border">
          <h2 className="mb-3 flex items-baseline justify-between text-[12px] font-bold uppercase tracking-[0.16em] text-foreground/55">
            <span>外部サービス</span>
            <Link
              href="/admin/system/services"
              className="text-[10px] font-normal normal-case tracking-normal text-primary-300 hover:underline"
            >
              すべて見る →
            </Link>
          </h2>
          <div className="flex flex-wrap gap-2">
            <QuickLink href="https://supabase.com/dashboard" external>
              Supabase
            </QuickLink>
            <QuickLink href="https://vercel.com/dashboard" external>
              Vercel
            </QuickLink>
            <QuickLink href="https://resend.com/dashboard" external>
              Resend
            </QuickLink>
            <QuickLink href="https://console.anthropic.com/" external>
              Anthropic
            </QuickLink>
            <QuickLink
              href="https://github.com/matsushitayuhi-dotcom/locore"
              external
            >
              GitHub
            </QuickLink>
          </div>
          <p className="mt-3 text-[11px] text-foreground/55">
            各サービスの管理画面・API キー・DNS・ログに 1 クリックで。env
            設定状況は「すべて見る」から確認できます。
          </p>
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// 部品
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
        <p className="mt-0.5 text-[10px] text-foreground/50 tabular">
          {footer}
        </p>
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
                r.highlight
                  ? 'font-medium text-foreground'
                  : 'text-foreground/70'
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

function QuickLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-[11px] font-medium text-foreground/75 hover:bg-primary-500/10 hover:text-primary-300"
      >
        {children} ↗
      </a>
    );
  }
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-[11px] font-medium text-foreground/75 hover:bg-primary-500/10 hover:text-primary-300"
    >
      {children}
    </Link>
  );
}
