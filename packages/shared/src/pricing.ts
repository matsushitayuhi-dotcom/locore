/**
 * 価格・手数料計算ロジック。
 *
 * Phase 1 の手数料テーブル：
 *   - Tier S / 認証クリエイター: 10%
 *   - Tier A: 15%（中間。詳細は PRD で確認すること）
 *   - Tier B（未認証）         : 20%
 *
 * 数値は今後の判断で変わりうるため、定数として明示する。
 */
import { Tier } from './enums';

/** UI で選択可能な価格帯（JPY、税込み）。0円（無料）は別フローで扱う */
export const PRICE_TIERS: readonly number[] = [
  300, 500, 800, 1000, 1500, 2000, 3000, 5000,
] as const;

/** Tier B（未認証）の上限価格 */
export const TIER_B_PRICE_CAP_JPY = 1000;

/** Tier ごとのプラットフォーム手数料率（0.0〜1.0） */
export const PLATFORM_FEE_RATE: Record<Tier, number> = {
  [Tier.S]: 0.1,
  [Tier.A]: 0.15,
  [Tier.B]: 0.2,
};

/** writer の Tier を表す最小限のオブジェクト */
export interface WriterFeeContext {
  tier: Tier;
}

/**
 * 与えられた書き手と記事金額から、プラットフォーム手数料額（JPY、整数）を返す。
 *
 * @param writer  書き手（tier を持つ）
 * @param amount  記事の販売額（JPY、整数）
 * @returns       プラットフォーム手数料額（JPY、四捨五入で整数）
 */
export function calculateFee(writer: WriterFeeContext, amount: number): number {
  if (amount < 0) {
    throw new RangeError(`amount must be >= 0, got ${amount}`);
  }
  const rate = PLATFORM_FEE_RATE[writer.tier];
  return Math.round(amount * rate);
}

/** 書き手取り分（販売額 − 手数料）を返す */
export function calculatePayout(writer: WriterFeeContext, amount: number): number {
  return amount - calculateFee(writer, amount);
}

/** 与えられた価格が PRICE_TIERS のいずれかに一致するか */
export function isValidPriceTier(price: number): boolean {
  return PRICE_TIERS.includes(price);
}
