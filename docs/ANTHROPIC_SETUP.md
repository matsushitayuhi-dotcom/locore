# Anthropic API（Claude）セットアップ

掲示板の AI 自動投稿機能（`/api/cron/ai-paris-events`）を動かすために必要な、
Anthropic コンソール側の設定と Locore 側の環境変数を一通り。

## 何のための API か

`apps/web/app/api/cron/ai-paris-events/route.ts` が:

1. 毎朝 05:00 UTC（パリ朝 7 時頃）に Vercel Cron から叩かれる
2. Claude `claude-sonnet-4-5` + `web_search` ツールでパリの当日〜週末のイベントを 3〜5 件収集
3. JSON で帰ってきた内容を `board_posts` テーブルに `auto_collected=true` で挿入
4. ホーム / `/board` の「新着ニュース」に出る

これを動かすには **2 つのキー** が必要:

| キー名                  | 何のため                                                   |
| ----------------------- | ---------------------------------------------------------- |
| `ANTHROPIC_API_KEY`     | Claude API を叩くため                                      |
| `CRON_SECRET`           | Vercel Cron からのリクエストだけを通すための Bearer トークン |

## ステップ 1: Anthropic アカウントを作る

1. <https://console.anthropic.com/> にアクセス
2. Google アカウントまたはメールで Sign up
3. ログイン後、ダッシュボード右上の **Settings → Plans & Billing**
4. **「Add credits」** から最低 $5 をチャージ（クレジットカード or Bank Transfer）
   - プロト段階の利用量なら $5 でも数ヶ月持ちます
   - ただし `web_search` ツールは別建てで、1 リクエスト $0.01 程度

## ステップ 2: API キーを発行

1. **Settings → API keys**
2. **Create Key**
3. Key name: `locore-prod`（用途が分かる名前を）
4. Workspace: `Default`
5. **Permissions: Full access** で OK（Cron 専用キーなのでスコープは絞れない）
6. 表示された `sk-ant-api03-...` を **その場でコピー**（再表示できません）

> Tip: 本番用と開発用でキーを分けると、流出時の被害を限定できます。
> プロト段階は 1 本でも大丈夫。

## ステップ 3: CRON_SECRET を生成

Vercel Cron は `Authorization: Bearer ${CRON_SECRET}` を自動で付けてリクエストしてきます。
このシークレットを自分で 1 つランダム生成します:

```bash
# macOS / Linux
openssl rand -hex 32
# 例: a7f3b9d4e2c1...（64 文字の hex）

# Windows PowerShell
[Convert]::ToHexString((1..32 | ForEach-Object { Get-Random -Maximum 256 })) -replace '-',''
```

## ステップ 4: Vercel に環境変数を登録

Vercel ダッシュボード → 該当プロジェクト → **Settings → Environment Variables**:

| Name                | Value                  | Environments                        |
| ------------------- | ---------------------- | ----------------------------------- |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...`     | Production, Preview, Development    |
| `CRON_SECRET`       | `a7f3b9d4...`（64 文字） | Production だけで OK（Preview 不要） |

`Add another` でそれぞれ追加 → **Save**。

すでにデプロイされている本番に反映させるには、対応する deployment を Redeploy するか、
新しい commit を push してください。

## ステップ 5: Vercel Cron を有効化

`apps/web/vercel.json` にすでに以下が入っています:

```json
{
  "crons": [
    { "path": "/api/cron/ai-paris-events", "schedule": "0 5 * * *" }
  ]
}
```

これを有効にするには **Vercel Pro プラン以上** が必要です（Hobby は週 1 回まで）。
プロト段階で Hobby のままなら、次のどちらかでしのげます:

### 案 A: 週 1 に頻度を落とす（無料）

`vercel.json` の schedule を `"0 5 * * 1"`（毎週月曜）に変更。

### 案 B: 外部 cron から叩く（無料、毎日 OK）

[cron-job.org](https://cron-job.org) などの無料サービスに登録し、
毎日 05:00 UTC に `https://locore.app/api/cron/ai-paris-events` を **GET** リクエスト。
Header に:

```
Authorization: Bearer <CRON_SECRET と同じ値>
```

を設定すれば、Vercel Cron と同じ挙動になります（route.ts 側で GET にも対応済み）。

## ステップ 6: 動作確認

ローカルで手動で叩く（環境変数を読み込んだ状態で `pnpm dev` 起動後）:

```bash
curl -X POST http://localhost:3000/api/cron/ai-paris-events \
  -H "Authorization: Bearer $CRON_SECRET"
```

返ってくる JSON:

```json
{ "ok": true, "inserted": 4, "ids": ["abc...", "def...", ...] }
```

もしくは

```json
{ "ok": true, "skipped": true, "reason": "already-posted-today" }
```

エラーの場合:

```json
{ "ok": false, "error": "ANTHROPIC_API_KEY not set" }
{ "ok": false, "error": "unauthorized" }              // CRON_SECRET が違う
{ "ok": false, "error": "anthropic-call-failed" }     // Claude 側のエラー
```

挿入された記事は `/board` または `/admin/board` で確認できます。

## コスト見積もり

毎朝 1 回の cron 1 回あたり:

- Claude `sonnet-4-5` リクエスト: ~3,000 input tokens + 4,000 output tokens 程度
  = **約 $0.06**
- `web_search` ツール 3〜5 回呼び出し = **約 $0.03〜$0.05**

→ **1 回あたり $0.10 前後 × 30 日 ≒ 月 $3**

5 ヶ国に拡張しても月 $15 程度で収まります。

## 監視・運用

### Cron のログ確認
Vercel ダッシュボード → **Logs** → Functions タブ。`/api/cron/ai-paris-events`
で絞り込みすると挿入件数が見えます。

### 投稿の編集 / 削除
`/admin/board` ページ（編集者ロール限定）から、または Supabase Studio で直接
`board_posts` テーブルを編集してください。

### `web_search` が無効な場合

`@anthropic-ai/sdk` のバージョンが古い、または Anthropic 側で web_search が
有効化されていないアカウントの場合は、tool エラーが返ってきます。route.ts は
try-catch で 502 を返すので、その場合は `model` パラメータを変えるか、tool 配列を
空にして純粋な「過去の知識ベースの提案」モードに切り替えるとひとまず動きます。

## トラブルシュート

| 症状                          | 確認ポイント                                                                |
| ----------------------------- | --------------------------------------------------------------------------- |
| `unauthorized` が返る         | `CRON_SECRET` が Vercel と Cron で一致しているか                            |
| `ANTHROPIC_API_KEY not set`   | Vercel 環境変数の Environment が Production に入っているか                  |
| `anthropic-call-failed`       | クレジット残高 0 / API キーが revoked / モデル名が変わった                  |
| `no-events-parsed`            | Claude の JSON 抽出に失敗。最近のモデル変更で出力形式が崩れた可能性。ログ確認 |
| 投稿はされるが質が低い        | `apps/web/app/api/cron/ai-paris-events/route.ts` の SYSTEM_PROMPT を調整    |

## 関連ファイル

- `apps/web/app/api/cron/ai-paris-events/route.ts` — 本体
- `apps/web/vercel.json` — Cron 設定
- `apps/web/lib/board/db.ts` — `hasAiEventPostForToday()` の重複ガード
- `apps/web/app/admin/board/page.tsx` — 投稿の管理 UI

## 次のフェーズ

地理拡張に合わせて、ファイル名を `/api/cron/ai-events?region=paris` のように
パラメタライズして、リージョン毎に呼べるようにする想定です。
