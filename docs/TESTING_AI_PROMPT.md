# AI プロンプトのマニュアルテスト

`apps/web/app/api/cron/ai-paris-events/route.ts` の Claude プロンプトを、
**DB を汚さずに**何度もテストするためのガイド。

`?dryRun=1` を付けて叩くと、route は:

- 認証はチェックする（CRON_SECRET 必要）
- 当日重複ガードを **スキップ**（何度叩いても OK）
- Claude を実際に呼ぶ（web_search 込み）
- **DB に書かない**
- Claude の生出力 + JSON 抽出後 + バリデート後を JSON で返す

これで「プロンプトを書き換える → 叩く → 結果を読む → 直す」を 1 分ループで回せます。

## 3 通りの方法

### 方法 A: 本番（locore.app）に直接叩く ← 一番楽

新しい dryRun フラグは Production にデプロイされているので、
そのまま curl で叩けば終わり。

```bash
# Mac / Linux
curl -s 'https://locore.app/api/cron/ai-paris-events?dryRun=1' \
  -H "Authorization: Bearer YOUR_CRON_SECRET" | jq

# Windows PowerShell
$headers = @{ Authorization = "Bearer YOUR_CRON_SECRET" }
Invoke-RestMethod -Uri 'https://locore.app/api/cron/ai-paris-events?dryRun=1' -Headers $headers
```

`YOUR_CRON_SECRET` は Vercel 環境変数に登録したのと同じ値です。

実行に **30〜60 秒** かかります（web_search を 5 回回すため）。
コスト 1 回 約 $0.10。

### 方法 B: ローカル開発サーバから

```bash
# 別ターミナルで
cd apps/web
pnpm dev

# 別ターミナル
curl -s 'http://localhost:3000/api/cron/ai-paris-events?dryRun=1' \
  -H "Authorization: Bearer $CRON_SECRET" | jq
```

ローカル `.env.local` に以下が必要:
```
ANTHROPIC_API_KEY=sk-ant-api03-...
CRON_SECRET=...（本番と同じ or 別でも可）
DATABASE_URL=...（DB 読み書きには必要、dryRun でも hasAiEventPostForToday の呼び出しはスキップされる）
```

メリット: route.ts を書き換えた瞬間 hot reload で反映される。

### 方法 C: Anthropic Console Workbench（プロンプトのみ純粋テスト）

[console.anthropic.com/workbench](https://console.anthropic.com/workbench)
で **System** と **User** を直接貼り付けて Run する方法。
web_search ツールは対応していないので、「フォーマットが守られるか」「トーンが
合っているか」だけ検証できます。

手順:

1. **System** プロンプト欄に `route.ts` の `SYSTEM_PROMPT` を貼る
2. **User** プロンプト欄に以下のようなものを貼る:
   ```
   # 今日の情報
   - パリ現地日付: 2026-05-14（木曜日）
   - 取材対象期間: 2026-05-14 〜 2026-05-22（8 日先まで）

   # 依頼
   検索ツール無しなので、過去の一般知識から「もしも 5/14〜5/22 にパリで
   こういうイベントがあったら」という想定で 3 件出してください。
   システムプロンプトに沿った JSON フォーマットで返してください。
   ```
3. Model: `claude-sonnet-4-5`
4. Max tokens: 4000
5. **Run**

これは事実検証はできませんが、プロンプトの構造・トーンチェックには最速です。

## レスポンスの読み方

dryRun のレスポンス例:

```json
{
  "ok": true,
  "dryRun": true,
  "prompt": {
    "today": "2026-05-14",
    "inEightDays": "2026-05-22",
    "weekdayJa": "木曜日"
  },
  "rawParsedCount": 4,        // Claude が返した件数
  "validCount": 3,             // sanitize 後に残った件数
  "events": [                  // 実際に DB に入る予定の中身
    {
      "title": "...",
      "body": "...",
      "event_date": "2026-05-17",
      "event_location": "Place de la République",
      "source_urls": [{ "name": "...", "url": "https://..." }]
    }
  ],
  "rawText": "{ \"events\": [...] }",  // Claude の生出力（デバッグ用）
  "usage": {
    "input_tokens": 2934,
    "output_tokens": 1820,
    "server_tool_use": { "web_search_requests": 4 }
  },
  "stopReason": "end_turn"
}
```

### 注目ポイント

| フィールド          | 何をチェックするか                                 |
| ------------------- | -------------------------------------------------- |
| `rawParsedCount`    | Claude が出してきた件数。5 件水増しっぽければ要調整 |
| `validCount`        | sanitize で弾かれていれば、URL の不備や日付不正    |
| `events[].title`    | 30 字以内か、煽り口調になってないか                |
| `events[].body`     | 具体的な数字 / 場所が入っているか、抽象的でないか  |
| `events[].source_urls` | 実在しそうな URL か、知らないサイトばかりでないか |
| `usage.input_tokens`  | 増えすぎてないか（プロンプトが膨らみすぎサイン） |
| `usage.web_search_requests` | 5 を超えていれば max_uses に近い      |

## プロンプト調整のループ

1. `dryRun=1` で叩く → 結果を読む
2. **悪い結果** を抜き出して `route.ts` の `SYSTEM_PROMPT` を直す
   - 「煽り口調が出た」→ 悪い title の例にその実例を追加
   - 「過去のイベントを出した」→ 取材手順 a 「過去のものは絶対に出さない」を強調
   - 「URL を捏造した」→ 厳守ルールに「実際に開いて確認した URL のみ」を太字化
3. commit & push（Vercel が自動デプロイ）
4. デプロイ完了後に再度 `dryRun=1` で叩く

## DB に実際入れて確認したくなったら

dryRun を外して GET（または POST）で叩くと、本番フローで挿入されます:

```bash
curl -s 'https://locore.app/api/cron/ai-paris-events' \
  -H "Authorization: Bearer $CRON_SECRET" | jq
```

挿入された投稿は `/admin/board` か Supabase Studio から確認 / 削除できます。
**当日中に再度叩いても重複ガードでスキップされる** ので、複数回挿入したい
場合は Supabase で既存の `source='ai_event'` の今日分を消してから再実行。

## 改善履歴を残す

プロンプト調整は地味な作業の積み重ねなので、
`docs/PROMPT_TUNING_LOG.md` のような形で「何を直したらどう良くなったか」
を残しておくと、後で振り返れます。テンプレ:

```markdown
## 2026-05-14
- 症状: title に「絶対！」が混入
- 対応: 悪い title 例にその実例を 1 行追加
- 結果: 次回の dryRun では出なくなった

## 2026-05-21
- 症状: 同じマルシェを毎週水増し
- 対応: 「過去 2 週間に投稿したものと重複しない」を取材手順に追加
- 結果: 多様性が出るようになった
```

## トラブル

| エラー                            | 対処                                                       |
| --------------------------------- | ---------------------------------------------------------- |
| `unauthorized`                    | `CRON_SECRET` が一致しているか、`Bearer ` のスペース忘れ   |
| `ANTHROPIC_API_KEY not set`       | Vercel env / .env.local 確認                               |
| `anthropic-call-failed`           | クレジット 0、API キー期限切れ、モデル名タイポ              |
| `validCount: 0`                   | sanitize が全部弾いた。`rawText` を見て JSON 形式 / URL 形式を要チェック |
| 60 秒タイムアウト                 | web_search の max_uses を 3 に減らす、または max_tokens を下げる |

これでテストは回せるはずです。最初の dryRun でどんな結果が出るか試して、
気になる挙動があれば SYSTEM_PROMPT を直す → 再度 dryRun のループへ。
