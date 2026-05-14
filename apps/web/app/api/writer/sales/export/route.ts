import { NextResponse } from 'next/server';
import { and, asc, eq, gte, lt, sql } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireWriter } from '@/lib/auth/require-user';

/**
 * GET /api/writer/sales/export?month=YYYY-MM
 *
 * 自分の記事の購入（status=completed）を、指定月のぶんだけ時系列で
 * CSV としてダウンロードさせる。1 購入 = 1 行。
 */

export const dynamic = 'force-dynamic';

function parseMonth(m: string | null): { from: Date; to: Date; key: string } {
  const now = new Date();
  let year = now.getFullYear();
  let month0 = now.getMonth();
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
  return { from, to, key };
}

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: Request) {
  const me = await requireWriter('/writer/sales');
  const db = getDb();

  const url = new URL(req.url);
  const { from, to, key } = parseMonth(url.searchParams.get('month'));

  // 自分の記事
  const myArticles = await db
    .select({ id: schema.articles.id })
    .from(schema.articles)
    .where(eq(schema.articles.writerId, me.id));

  const myArticleIds = myArticles.map((a) => a.id);

  const header = [
    '購入日時(JST)',
    '記事ID',
    '記事タイトル',
    '価格(円)',
    '手数料(円)',
    '振込予定額(円)',
    '購入ID',
  ];

  const lines: string[] = [header.join(',')];

  if (myArticleIds.length > 0) {
    const articleIdList = sql.join(
      myArticleIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    );

    const rows = await db
      .select({
        id: schema.purchases.id,
        purchasedAt: schema.purchases.purchasedAt,
        articleId: schema.purchases.articleId,
        title: schema.articles.title,
        amountJpy: schema.purchases.amountJpy,
        feeJpy: schema.purchases.feeJpy,
        payoutJpy: schema.purchases.payoutJpy,
      })
      .from(schema.purchases)
      .innerJoin(schema.articles, eq(schema.articles.id, schema.purchases.articleId))
      .where(
        and(
          eq(schema.purchases.status, 'completed'),
          gte(schema.purchases.purchasedAt, from),
          lt(schema.purchases.purchasedAt, to),
          sql`${schema.purchases.articleId} IN (${articleIdList})`,
        ),
      )
      .orderBy(asc(schema.purchases.purchasedAt));

    for (const r of rows) {
      // JST に変換した ISO 風文字列
      const dt = new Date(r.purchasedAt);
      const jst = new Date(dt.getTime() + 9 * 60 * 60 * 1000);
      const ts = jst.toISOString().replace('T', ' ').slice(0, 19);
      lines.push(
        [
          csvEscape(ts),
          csvEscape(r.articleId),
          csvEscape(r.title),
          csvEscape(r.amountJpy),
          csvEscape(r.feeJpy),
          csvEscape(r.payoutJpy),
          csvEscape(r.id),
        ].join(','),
      );
    }
  }

  // Excel が UTF-8 を正しく読めるよう BOM 付き
  const body = '﻿' + lines.join('\r\n') + '\r\n';
  const filename = `locore-sales-${key}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
