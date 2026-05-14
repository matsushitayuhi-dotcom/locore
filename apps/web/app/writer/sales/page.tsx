import Link from 'next/link';
import { and, desc, eq, gte, lt, sql } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireWriter } from '@/lib/auth/require-user';

/**
 * /writer/sales — クリエイター向けの売上レポート画面。
 *
 * 表示するもの:
 *  ① 当月の「日別の売上部数 + 売上金額（＝ライターの取り分 payout）」
 *  ② 日付をクリックすると、その日の記事別ブレークダウン
 *  ③ CSV エクスポート（時系列 = 1 購入 1 行）ボタン
 *
 * URL クエリ:
 *  - `month=YYYY-MM` … 表示する月（既定: 今月）
 *  - `date=YYYY-MM-DD` … 詳細を開く日付（任意）
 */

export const metadata = { title: '売上レポート' };
export const dynamic = 'force-dynamic';

type DailyRow = {
  day: string; // 'YYYY-MM-DD'
  purchases: number;
  amountJpy: number;
  payoutJpy: number;
};

type ArticleRow = {
  articleId: string;
  title: string;
  purchases: number;
  amountJpy: number;
  payoutJpy: number;
};

function parseMonth(m: string | undefined): { from: Date; to: Date; label: string; key: string } {
  const now = new Date();
  let year = now.getFullYear();
  let month0 = now.getMonth(); // 0-indexed
  if (m && /^\d{4}-\d{2}$/.test(m)) {
    const [y, mm] = m.split('-').map((x) => parseInt(x, 10));
    if (y && mm && mm >= 1 && mm <= 12) {
      year = y;
      month0 = mm - 1;
    }
  }
  const from = new Date(year, month0, 1);
  const to = new Date(year, month0 + 1, 1);
  const key = `${year}-${String(month0 + 1).padStart(2, '0')}`;
  const label = `${year}年${month0 + 1}月`;
  return { from, to, key, label };
}

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map((x) => parseInt(x, 10));
  const d = new Date(y!, (m ?? 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function dayKey(d: Date): string {
  // 日本時間で日付ラベルを作りたいのでローカル変換に頼らず手動で
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export default async function WriterSalesPage({
  searchParams,
}: {
  searchParams?: { month?: string; date?: string };
}) {
  const me = await requireWriter('/writer/sales');
  const db = getDb();

  const { from, to, key: monthKey, label: monthLabel } = parseMonth(searchParams?.month);
  const drillDate =
    searchParams?.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date)
      ? searchParams.date
      : null;

  // 自分の記事 ID 一覧
  const myArticles = await db
    .select({ id: schema.articles.id, title: schema.articles.title })
    .from(schema.articles)
    .where(eq(schema.articles.writerId, me.id));

  const myArticleIds = myArticles.map((a) => a.id);

  let daily: DailyRow[] = [];
  let monthTotalPurchases = 0;
  let monthTotalAmount = 0;
  let monthTotalPayout = 0;

  let drill: ArticleRow[] = [];

  if (myArticleIds.length > 0) {
    const articleIdList = sql.join(
      myArticleIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    );

    // ① 日別集計（当月のみ）
    const dailyRows = await db
      .select({
        day: sql<string>`to_char((${schema.purchases.purchasedAt}) AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM-DD')`,
        purchases: sql<number>`count(*)::int`,
        amountJpy: sql<number>`coalesce(sum(${schema.purchases.amountJpy}), 0)::int`,
        payoutJpy: sql<number>`coalesce(sum(${schema.purchases.payoutJpy}), 0)::int`,
      })
      .from(schema.purchases)
      .where(
        and(
          eq(schema.purchases.status, 'completed'),
          gte(schema.purchases.purchasedAt, from),
          lt(schema.purchases.purchasedAt, to),
          sql`${schema.purchases.articleId} IN (${articleIdList})`,
        ),
      )
      .groupBy(sql`to_char((${schema.purchases.purchasedAt}) AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM-DD')`)
      .orderBy(sql`to_char((${schema.purchases.purchasedAt}) AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM-DD') desc`);

    daily = dailyRows;
    for (const r of daily) {
      monthTotalPurchases += r.purchases;
      monthTotalAmount += r.amountJpy;
      monthTotalPayout += r.payoutJpy;
    }

    // ② ドリルダウン: その日の記事別
    if (drillDate) {
      const drillFrom = new Date(`${drillDate}T00:00:00+09:00`);
      const drillTo = new Date(drillFrom.getTime() + 24 * 60 * 60 * 1000);

      drill = await db
        .select({
          articleId: schema.purchases.articleId,
          title: schema.articles.title,
          purchases: sql<number>`count(*)::int`,
          amountJpy: sql<number>`coalesce(sum(${schema.purchases.amountJpy}), 0)::int`,
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
            gte(schema.purchases.purchasedAt, drillFrom),
            lt(schema.purchases.purchasedAt, drillTo),
            sql`${schema.purchases.articleId} IN (${articleIdList})`,
          ),
        )
        .groupBy(schema.purchases.articleId, schema.articles.title)
        .orderBy(desc(sql`sum(${schema.purchases.payoutJpy})`));
    }
  }

  // 当月の日付配列（空の日も含めて並べる）
  const allDays: string[] = [];
  for (let d = new Date(from); d < to; d.setDate(d.getDate() + 1)) {
    allDays.push(dayKey(d));
  }
  const byDay = new Map(daily.map((r) => [r.day, r]));

  // CSV ダウンロード URL
  const csvHref = `/api/writer/sales/export?month=${monthKey}`;

  const prevMonth = shiftMonth(monthKey, -1);
  const nextMonth = shiftMonth(monthKey, +1);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
            Sales report
          </p>
          <h2 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">
            {monthLabel} の売上
          </h2>
          <p className="mt-1 text-[12px] text-foreground/55">
            日付をクリックすると、その日の記事別の内訳が表示されます。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/writer/sales?month=${prevMonth}`}
            className="rounded-md bg-card px-3 py-1.5 text-[12px] ring-1 ring-border hover:bg-muted"
          >
            ← {prevMonth}
          </Link>
          <Link
            href={`/writer/sales?month=${nextMonth}`}
            className="rounded-md bg-card px-3 py-1.5 text-[12px] ring-1 ring-border hover:bg-muted"
          >
            {nextMonth} →
          </Link>
          <a
            href={csvHref}
            className="inline-flex items-center gap-1 rounded-md bg-primary-500 px-3 py-1.5 text-[12px] font-bold text-neutral-950 hover:bg-primary-300"
          >
            CSV 出力
          </a>
        </div>
      </header>

      {/* 月合計サマリー */}
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="購入件数" value={`${monthTotalPurchases.toLocaleString('ja-JP')} 件`} />
        <SummaryCard
          label="売上総額"
          value={`¥${monthTotalAmount.toLocaleString('ja-JP')}`}
          hint="顧客から受け取った合計"
        />
        <SummaryCard
          label="あなたの取り分"
          value={`¥${monthTotalPayout.toLocaleString('ja-JP')}`}
          hint="手数料を引いた振込予定額"
        />
      </div>

      {/* ① 日別 */}
      <section className="rounded-xl border border-border bg-card">
        <header className="flex items-baseline justify-between border-b border-border px-4 py-3 sm:px-6">
          <h3 className="text-[14px] font-semibold tracking-tight">日別の売上</h3>
          <p className="text-[11px] text-foreground/55">
            {allDays.length} 日間 / 購入のあった日: {daily.length} 日
          </p>
        </header>
        <ul className="divide-y divide-border">
          {allDays.map((d) => {
            const row = byDay.get(d);
            const isOpen = drillDate === d;
            const dayLabel = (() => {
              const parts = d.split('-').map((x) => parseInt(x, 10));
              const dateObj = new Date(parts[0]!, parts[1]! - 1, parts[2]!);
              const weekday = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];
              return `${parts[1]}/${parts[2]}（${weekday}）`;
            })();
            const params = new URLSearchParams();
            params.set('month', monthKey);
            if (!isOpen) params.set('date', d);
            const href = `/writer/sales?${params.toString()}`;
            const hasSales = (row?.purchases ?? 0) > 0;

            return (
              <li key={d}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-4 py-2.5 transition hover:bg-muted/40 sm:px-6 ${
                    isOpen ? 'bg-primary-500/10' : ''
                  } ${!hasSales ? 'opacity-50' : ''}`}
                >
                  <span className="w-20 shrink-0 text-[13px] tabular text-foreground/80">
                    {dayLabel}
                  </span>
                  <span className="flex-1 text-[13px] tabular text-foreground/70">
                    {hasSales ? `${row!.purchases} 件` : '—'}
                  </span>
                  <span className="shrink-0 text-[13px] font-semibold tabular">
                    {hasSales ? `¥${row!.payoutJpy.toLocaleString('ja-JP')}` : '¥0'}
                  </span>
                  <span className="ml-2 shrink-0 text-[10px] text-foreground/40">
                    {isOpen ? '▲ 閉じる' : hasSales ? '▼ 詳細' : ''}
                  </span>
                </Link>

                {/* ② ドリルダウン */}
                {isOpen ? (
                  <div className="border-t border-border bg-background/40 px-4 py-3 sm:px-6">
                    {drill.length === 0 ? (
                      <p className="text-[12px] text-foreground/55">
                        この日の購入はありません。
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {drill.map((a) => (
                          <li
                            key={a.articleId}
                            className="flex items-center gap-2"
                          >
                            <Link
                              href={`/articles/${a.articleId}`}
                              className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground hover:text-primary-300"
                            >
                              {a.title}
                            </Link>
                            <span className="shrink-0 text-[11px] tabular text-foreground/55">
                              {a.purchases} 件
                            </span>
                            <span className="shrink-0 text-[12px] font-semibold tabular">
                              ¥{a.payoutJpy.toLocaleString('ja-JP')}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-[11px] text-foreground/40">
        金額はすべて日本円。CSV には status=completed のすべての購入が時系列で出力されます（指定月のみ）。
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">
        {label}
      </p>
      <p
        className="mt-1.5 text-[22px] font-semibold tabular tracking-tight"
        style={{ fontFamily: 'var(--font-sans), system-ui, sans-serif' }}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-foreground/50">{hint}</p> : null}
    </div>
  );
}
