-- 0034_writer_status_and_commission.sql
--
-- ライター登録の方針変更:
--   1. 「現地に住んでいる人」だけでなく、過去居住者・旅行者も書けるように
--   2. 価格上限は撤廃。クリエイターランクの差は手数料率の差で扱う
--   3. 販売実績によって tier が自動で変動するロジックを後で動かすので、
--      その判断材料となるカラムを追加

-- =========================================================================
-- 1. residency_status: 居住状況
-- =========================================================================
-- 'current_resident' : 現在その国に居住している（認証申請可能）
-- 'past_resident'    : 過去に住んでいた（思い出として書ける）
-- 'traveler'         : 訪れたことのある旅行者（観光客視点の有料記事）
-- 'unspecified'      : 未指定（旧データ用、最終的に上記いずれかに）
ALTER TABLE writer_profiles
  ADD COLUMN IF NOT EXISTS residency_status text NOT NULL DEFAULT 'unspecified';

CREATE INDEX IF NOT EXISTS writer_profiles_residency_status_idx
  ON writer_profiles(residency_status);

-- 既存ユーザーの推定: residency_verified_at に値があれば current_resident、
-- residency_years > 0 なら past_resident、それ以外は unspecified にしておく
UPDATE writer_profiles
SET residency_status =
  CASE
    WHEN residency_verified_at IS NOT NULL THEN 'current_resident'
    WHEN residency_years > 0 THEN 'past_resident'
    ELSE 'unspecified'
  END
WHERE residency_status = 'unspecified';

-- =========================================================================
-- 2. commission_rate_pct: 手数料率（%）
-- =========================================================================
-- 価格上限を撤廃した代わりに、クリエイターランクごとの手数料率で差をつける。
-- 既定値はランク別に:
--   founder (founding_member=true) : 10
--   S                              : 15
--   A                              : 20
--   B                              : 25
-- 数値（整数 %）として持つ。決済時はこの値で writer payout を計算。
ALTER TABLE writer_profiles
  ADD COLUMN IF NOT EXISTS commission_rate_pct integer NOT NULL DEFAULT 25;

-- 既存データのバックフィル
UPDATE writer_profiles
SET commission_rate_pct =
  CASE
    WHEN founding_member = true THEN 10
    WHEN tier = 'S' THEN 15
    WHEN tier = 'A' THEN 20
    ELSE 25
  END
WHERE commission_rate_pct = 25;

-- =========================================================================
-- 3. lifetime_sales_count: 累計販売数キャッシュ
-- =========================================================================
-- tier 自動昇格の判定材料。purchases から COUNT(*) で都度算出してもよいが、
-- ダッシュボード描画のたびに走らせるのは重いので、月次バッチで更新する想定。
ALTER TABLE writer_profiles
  ADD COLUMN IF NOT EXISTS lifetime_sales_count integer NOT NULL DEFAULT 0;
ALTER TABLE writer_profiles
  ADD COLUMN IF NOT EXISTS lifetime_revenue_jpy integer NOT NULL DEFAULT 0;
ALTER TABLE writer_profiles
  ADD COLUMN IF NOT EXISTS tier_evaluated_at timestamptz;

-- 既存ユーザーの初回バックフィル
UPDATE writer_profiles wp
SET
  lifetime_sales_count = sub.cnt,
  lifetime_revenue_jpy = sub.rev,
  tier_evaluated_at = now()
FROM (
  SELECT
    a.writer_id,
    count(p.id)::int AS cnt,
    coalesce(sum(p.amount_jpy), 0)::int AS rev
  FROM purchases p
  JOIN articles a ON a.id = p.article_id
  WHERE p.status = 'completed'
  GROUP BY a.writer_id
) sub
WHERE sub.writer_id = wp.user_id;
