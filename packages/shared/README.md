# @locore/shared

Locore モノレポの全パッケージから再利用される、フレームワーク非依存の純粋 TypeScript ロジック。

含めるもの:

- `enums.ts` — `Tier`、`ArticleStatus`、`WriterRole`、`ReviewTag` 等
- `pricing.ts` — `calculateFee`、`PRICE_TIERS`、`PLATFORM_FEE_RATE` 等
- `geo.ts` — Haversine 距離計算（クリティカルパスは PostGIS 側で）
- `constants.ts` — `MIN_PAYOUT_JPY`、`KYC_DOC_TTL_DAYS` 等の運用定数

含めないもの:

- DB スキーマ（→ `@locore/db`）
- API スキーマ・zod（→ `@locore/api-contracts`）
- React / NestJS 依存
