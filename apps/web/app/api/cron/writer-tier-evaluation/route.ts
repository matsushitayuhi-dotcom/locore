import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import {
  evaluateTierFromSales,
  effectiveTier,
  TIER_COMMISSION_PCT,
} from '@/lib/writer/rank';

/**
 * 月次 cron。
 * 全ライターの累計販売数 / 直近 30 日売上を集計し、
 *   - writer_profiles.lifetime_sales_count / lifetime_revenue_jpy
 *   - writer_profiles.tier
 *   - writer_profiles.commission_rate_pct
 *   - writer_profiles.tier_evaluated_at
 * を更新する。
 *
 * Founders は無条件で 10% / tier='founder' に。
 *
 * Vercel Cron + 外部 cron どちらからでも叩ける（GET / POST 両対応、CRON_SECRET 必須）。
 */

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return runCron(req);
}
export async function GET(req: Request) {
  return runCron(req);
}

async function runCron(req: Request) {
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const db = getDb();

  // 全ライターの累計を集計
  const aggRows = await db.execute(sql`
    SELECT
      a.writer_id AS writer_id,
      count(p.id)::int AS sales,
      coalesce(sum(p.amount_jpy), 0)::int AS revenue,
      coalesce(sum(CASE WHEN p.purchased_at >= now() - interval '30 days'
                        THEN p.amount_jpy ELSE 0 END), 0)::int AS revenue_30d
    FROM purchases p
    JOIN articles a ON a.id = p.article_id
    WHERE p.status = 'completed'
    GROUP BY a.writer_id
  `);

  let updated = 0;
  let createdMissing = 0;

  // 既存 writer_profiles を全件取って Map に
  const profiles = await db
    .select({
      userId: schema.writerProfiles.userId,
      foundingMember: schema.writerProfiles.foundingMember,
    })
    .from(schema.writerProfiles);
  const profileByUser = new Map(profiles.map((p) => [p.userId, p]));

  const rows = (aggRows as unknown as { rows: unknown[] }).rows ?? [];
  for (const raw of rows) {
    const r = raw as {
      writer_id: string;
      sales: number;
      revenue: number;
      revenue_30d: number;
    };
    const profile = profileByUser.get(r.writer_id);
    if (!profile) continue; // writer_profile が無いユーザーは無視（通常は発生しない）

    const baseTier = evaluateTierFromSales({
      lifetimeSalesCount: r.sales,
      last30DaysRevenueJpy: r.revenue_30d,
    });
    const { tier, commissionPct } = effectiveTier({
      foundingMember: profile.foundingMember,
      baseTier,
    });

    // tier='founder' は writer_tier enum に無いので、DB 上は base tier ('S'/'A'/'B') を保存し、
    // founding_member = true との組み合わせで判定する。
    // → DB に保存するのは baseTier のみ。commission_rate_pct で実効ランクを表現。
    await db
      .update(schema.writerProfiles)
      .set({
        tier: baseTier,
        commissionRatePct: commissionPct,
        lifetimeSalesCount: r.sales,
        lifetimeRevenueJpy: r.revenue,
        tierEvaluatedAt: new Date(),
      })
      .where(eq(schema.writerProfiles.userId, r.writer_id));
    updated += 1;
  }

  // 集計対象外（販売がまだない）writer の Founders 反映
  // founding_member=true なら commission を 10 に維持、それ以外は 25 ('B') に
  for (const p of profiles) {
    if (rows.some((r) => (r as { writer_id: string }).writer_id === p.userId)) {
      continue;
    }
    const baseTier: 'B' = 'B';
    const { commissionPct } = effectiveTier({
      foundingMember: p.foundingMember,
      baseTier,
    });
    await db
      .update(schema.writerProfiles)
      .set({
        tier: baseTier,
        commissionRatePct: commissionPct,
        tierEvaluatedAt: new Date(),
      })
      .where(eq(schema.writerProfiles.userId, p.userId));
  }

  return NextResponse.json({ ok: true, updated, createdMissing, totalProfiles: profiles.length });
}

// Tier 別の手数料率を返す JSON（管理画面で確認用）
export async function HEAD() {
  return NextResponse.json({ tiers: TIER_COMMISSION_PCT });
}
