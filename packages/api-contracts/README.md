# @locore/api-contracts

API レイヤの契約を一元管理する。フロント・バック両方で参照される。

含めるもの:

- `src/articles.ts`、`src/users.ts` — zod スキーマ（リクエスト・レスポンス）
- `openapi/openapi.yaml` — OpenAPI 3.1 定義（人間 / SDK 生成 / モック用）

zod を真実の源とし、OpenAPI は手書きで同期する（小規模なうちは十分）。
将来 `zod-openapi` 等で自動生成に切り替える可能性あり。
