/**
 * クリエイターランク (Tier) と手数料率の算出ロジック。
 *
 * 方針 (2026-05):
 *   - 価格上限は撤廃。Tier の差は手数料率の差で扱う
 *   - Tier は販売実績で自動変動（Founders は永久 10%）
 *
 * 手数料率は writer_profiles.commission_rate_pct に保存する想定だが、
 * 「現在の販売実績ベースだとどう判定されるか」を計算する純粋関数を提供する。
 *
 * 月次バッチ（cron）で writer_profiles を一括更新する想定だが、UI 上の
 * 「現在の状態」表示にもこの関数を使う。
 */

export type WriterTier = 'founder' | 'S' | 'A' | 'B';

/** Tier ごとの手数料率（%）。価格 × commission/100 が運営取り分。 */
export const TIER_COMMISSION_PCT: Record<WriterTier, number> = {
  founder: 10,
  S: 15,
  A: 20,
  B: 25,
};

export const TIER_LABEL: Record<WriterTier, string> = {
  founder: 'Founders',
  S: 'プロ',
  A: '認定',
  B: '入門',
};

export const TIER_DESCRIPTION: Record<WriterTier, string> = {
  founder: '立ち上げ期の 50 人限定。永久 10% の手数料率。',
  S: '累計 50 件以上の販売 + 月間 ¥30,000 以上の売上で昇格。',
  A: '累計 10 件以上の販売で昇格。',
  B: '全クリエイターの初期 Tier。',
};

/**
 * 販売実績から自動判定される Tier。Founders は別軸なのでここでは含めない
 * （Founders は writer_profiles.founding_member を見て判定する）。
 */
export function evaluateTierFromSales(args: {
  lifetimeSalesCount: number;
  /** 直近 30 日の売上（JPY）。なければ 0 */
  last30DaysRevenueJpy?: number;
}): 'S' | 'A' | 'B' {
  const sales = args.lifetimeSalesCount;
  const recent = args.last30DaysRevenueJpy ?? 0;
  if (sales >= 50 && recent >= 30_000) return 'S';
  if (sales >= 10) return 'A';
  return 'B';
}

/**
 * 写真の writer 全体に通用する「実効 Tier」と手数料率を返す。
 * founding_member=true なら無条件で founder。
 */
export function effectiveTier(args: {
  foundingMember: boolean;
  baseTier: 'S' | 'A' | 'B';
}): { tier: WriterTier; commissionPct: number } {
  const tier: WriterTier = args.foundingMember ? 'founder' : args.baseTier;
  return { tier, commissionPct: TIER_COMMISSION_PCT[tier] };
}

/**
 * 価格に対する writer の受け取り額（手取り）を算出。
 * 表示用なのでシンプル整数。
 *
 *   payout = price * (1 - commissionPct/100)
 */
export function writerPayout(priceJpy: number, commissionPct: number): number {
  if (priceJpy <= 0) return 0;
  const ratio = Math.max(0, 100 - commissionPct) / 100;
  return Math.floor(priceJpy * ratio);
}
