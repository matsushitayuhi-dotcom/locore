import Link from 'next/link';
import Image from 'next/image';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { schema } from '@locore/db';
import { Badge } from '@locore/ui';
import { requireUser } from '@/lib/auth/require-user';
import { getDb } from '@/lib/db/client';

export const metadata = {
  title: '購入した記事',
  description: 'これまでに購入した記事の一覧',
};

export const dynamic = 'force-dynamic';

const DURATION_LABEL: Record<string, string> = {
  half_day: '半日',
  full_day: '1日',
  few_hours: '数時間',
  other: '半日',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function PurchasesPage() {
  const me = await requireUser('/purchases');
  const db = getDb();

  // 自分の購入レコード（completed のみ）
  let purchaseRows: Array<{
    id: string;
    articleId: string;
    amountJpy: number;
    purchasedAt: Date;
    status: 'pending' | 'completed' | 'refunded';
  }> = [];
  let diagnostic: string | null = null;

  try {
    purchaseRows = await db
      .select({
        id: schema.purchases.id,
        articleId: schema.purchases.articleId,
        amountJpy: schema.purchases.amountJpy,
        purchasedAt: schema.purchases.purchasedAt,
        status: schema.purchases.status,
      })
      .from(schema.purchases)
      .where(eq(schema.purchases.buyerId, me.id))
      .orderBy(desc(schema.purchases.purchasedAt));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    diagnostic = `purchases テーブルの取得に失敗: ${msg}`;
  }

  // 関連記事をまとめて取得
  const articleIds = Array.from(
    new Set(purchaseRows.map((p) => p.articleId)),
  );
  let articleMap = new Map<
    string,
    {
      id: string;
      title: string;
      coverImageUrl: string | null;
      area: string;
      articleType: 'spot_guide' | 'itinerary';
      durationType: string;
      writerName: string;
    }
  >();

  if (articleIds.length > 0) {
    try {
      const rows = await db
        .select({
          id: schema.articles.id,
          title: schema.articles.title,
          coverImageUrl: schema.articles.coverImageUrl,
          articleType: schema.articles.articleType,
          durationType: schema.articles.durationType,
          cityNameJa: schema.cities.nameJa,
          writerName: schema.users.displayName,
        })
        .from(schema.articles)
        .leftJoin(schema.users, eq(schema.articles.writerId, schema.users.id))
        .leftJoin(
          schema.cities,
          eq(schema.articles.cityId, schema.cities.id),
        )
        .where(inArray(schema.articles.id, articleIds));

      articleMap = new Map(
        rows.map((r) => [
          r.id,
          {
            id: r.id,
            title: r.title,
            coverImageUrl: r.coverImageUrl,
            area: r.cityNameJa ?? 'パリ',
            articleType: r.articleType,
            durationType: r.durationType ?? 'other',
            writerName: r.writerName ?? '匿名',
          },
        ]),
      );
    } catch {
      // ignore — 表示時に「（記事情報を取得できませんでした）」になる
    }
  }

  return (
    <main className="mx-auto max-w-screen-md px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-6">
        <p className="mb-2 inline-flex items-center text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/60">
          Purchases
        </p>
        <h1 className="text-[28px] font-bold tracking-tight">購入した記事</h1>
        <p className="mt-2 text-[13px] text-foreground/60">
          これまでに購入した記事をいつでも読み返せます。
        </p>
      </header>

      {diagnostic ? (
        <div className="mb-4 rounded-md bg-warning-50 p-4 text-[12px] text-warning-700 ring-1 ring-warning-500">
          <p className="font-bold">⚠ 購入記録の取得に失敗しました</p>
          <p className="mt-1 font-mono text-[11px] leading-relaxed">
            {diagnostic}
          </p>
        </div>
      ) : null}

      {purchaseRows.length === 0 ? (
        <div className="rounded-md bg-card p-8 text-center text-[13px] text-foreground/60 ring-1 ring-primary-100">
          購入した記事はまだありません。気になる記事を見つけたら購入してここにまとめて見返せます。
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-md bg-card ring-1 ring-primary-100">
          {purchaseRows.map((p) => {
            const article = articleMap.get(p.articleId);
            const isRefunded = p.status === 'refunded';
            const isPending = p.status === 'pending';
            return (
              <li key={p.id}>
                {article ? (
                  <Link
                    href={`/articles/${article.id}`}
                    className="flex items-start gap-3 px-4 py-3 transition hover:bg-primary-50/40 sm:gap-4"
                  >
                    <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-sm bg-muted sm:h-20 sm:w-28">
                      {article.coverImageUrl ? (
                        <Image
                          src={article.coverImageUrl}
                          alt=""
                          fill
                          sizes="112px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant={
                            article.articleType === 'itinerary'
                              ? 'accent'
                              : 'default'
                          }
                        >
                          {article.articleType === 'itinerary'
                            ? '旅程プラン'
                            : 'スポット紹介'}
                        </Badge>
                        <Badge variant="outline">{article.area}</Badge>
                        <Badge variant="secondary">
                          {DURATION_LABEL[article.durationType] ?? '半日'}
                        </Badge>
                        {isRefunded ? (
                          <Badge variant="outline">返金済み</Badge>
                        ) : null}
                        {isPending ? (
                          <Badge variant="outline">処理中</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug">
                        {article.title}
                      </p>
                      <p className="mt-1 truncate text-[12px] text-foreground/60">
                        {article.writerName}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[11px] text-foreground/50 tabular">
                        <span>
                          ¥{p.amountJpy.toLocaleString('ja-JP')} で購入
                        </span>
                        <span>{formatDate(p.purchasedAt.toISOString())}</span>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-start gap-3 px-4 py-3 sm:gap-4">
                    <div className="h-16 w-24 shrink-0 rounded-sm bg-muted sm:h-20 sm:w-28" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-foreground/60">
                        （記事情報を取得できませんでした）
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[11px] text-foreground/50 tabular">
                        <span>
                          ¥{p.amountJpy.toLocaleString('ja-JP')} で購入
                        </span>
                        <span>{formatDate(p.purchasedAt.toISOString())}</span>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
