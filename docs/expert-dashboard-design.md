# エキスパートのマイページ（ダッシュボード）— 設計案（2026-09-06）

モック: `mockups/v2/expert-dashboard.html`
狙い: いまの /settings/profile（入力フォームの集まり）を、エキスパートが「毎日開いて、次の一手が分かる」場所に変える。
数字は「見て終わり」ではなく行動に接続する（返答・空き枠追加・プロフィール補完）。

## 1. 画面構成（上から）

| # | ブロック | 中身 | 行動への接続 |
| --- | --- | --- | --- |
| 0 | ヘッダー | あいさつ・今週の要約 1 行・公開ステータス・「公開プロフィールを見る」 | 非公開なら公開までの残り項目へ |
| 1 | **今やること** | 未返答リクエスト（最古からの経過時間）・未読メッセージ・今週の空き枠（少なければ警告色）・プロフィール未完了 | それぞれのページへ直リンク。最上段＝いちばん効く数字 |
| 2 | **今月の数字** | 相談件数（確定）・売上（確定＋見込み）・プロフィール閲覧・お気に入り登録。各カードに先月同期比と 30 日スパークライン | 補助行: レビュー平均・平均返答時間（同じ国の中央値と比較）・承諾率 |
| 3 | **今月の目標** | 本人が設定する相談件数の目標。進捗バー・達成見込み日・「空き枠を増やすと +N 件」の提案 | 「空き枠を追加する」ボタン |
| 3' | **マイルストーン** | 在籍確認 / 初相談 / 初レビュー★5 / 10 件 / 25 件 / 返答 24h×10 / お気に入り 50 / 継続プラン初契約。取得済みはライム、未取得は「あと N」 | 「次の一歩」1 行。返答 24h×10 は公開プロフィールに「返答が早い」バッジとして出す |
| 4 | これからの予定 / 最近のレビュー | 直近 3 件の予定（要返答はタグ）・直近 2 件のレビュー | 予定・履歴 / レビュー一覧へ |

## 2. 左ナビ（設定ページ群をエキスパート目線で並べ直す）

```
ダッシュボード
相談リクエスト (2)      ← /bookings?tab=received
予定・履歴              ← /bookings
メッセージ (1)          ← /chat
── 出品 ──
相談メニュー・プラン    ← /settings/services
空き時間                ← /settings/availability
── 見せ方 ──
プロフィール            ← /settings/profile
発信・メディア          ← /settings/profile#sns（将来は独立ページ）
在籍確認・資格          ← /settings/verification
公開ステータス          ← /settings
── その他 ──
売上・振込              ← 新規（決済導入まではプレースホルダ）
通知・アカウント        ← /settings/notifications, /settings/account
```

URL 案: `/dashboard`（エキスパートのみ。非エキスパートは /settings/profile へ）。ハンバーガーの「エキスパート向け」先頭に「ダッシュボード」を置く。

## 3. データの出どころ

| 指標 | いまある | 計算 |
| --- | --- | --- |
| 未返答リクエスト | consultation_bookings | status = requested の件数・最古の created_at |
| 未読メッセージ | chat | 既存の unreadChatCount |
| 今週の空き枠 | expert_availability | 今日〜7 日の未予約スロット数 |
| プロフィール未完了 | completeness | 既存の getProfileCompleteness |
| 相談件数 | consultation_bookings | status ∈ {accepted, completed} を月で集計 |
| 売上 | consultation_bookings.price_jpy ＋ plan_enrollments.monthly_price_jpy | 確定 = completed、見込み = accepted（未実施）＋ active プランの当月分 |
| レビュー | reviews | 平均・件数・直近 |
| お気に入り登録 | user_follows | followee = 自分 の件数と日次増分 |
| 返答時間・承諾率 | consultation_bookings | requested → accepted/declined の時刻差、accepted / (accepted+declined) |
| **プロフィール閲覧** | **なし → 新規** | `profile_view_daily(user_id, day, views)` を /experts/[id] の表示時に upsert（本人・editor・bot UA は除外。IP は保存しない） |
| 目標 | **なし → 新規** | users.monthly_goal_bookings integer（既定 null = 未設定。未設定時は「目標を決める」導線） |
| 同じ国の中央値 | 集計 | 同一 residency_country のエキスパートの返答時間中央値（個人は出さない） |

追加 DDL（additive・0090 案）: `profile_view_daily` テーブル、`users.monthly_goal_bookings`。

## 4. 「頑張りたくなる」ための設計原則

- 数字は必ず「比較」か「次の一手」を添える（先月比・中央値・あと N 件）。孤立した数字を置かない
- 悪い数字は責めない。空き枠が少ないときは「増やすと +N 件見込める」と伸びしろで言う
- マイルストーンは取得済みを大きく、未取得は「あと N」で近さを見せる。取得時はトーストとメール
- 週 1 回のダイジェストメール（今週の閲覧・お気に入り・要返答）は Phase 2

## 5. 進め方

1. `/dashboard` の骨組み（今やること・今月の数字・予定・レビュー）を既存データだけで実装
2. 0090（閲覧計測・目標）を追加して「プロフィール閲覧」「今月の目標」を有効化
3. マイルストーン判定と公開プロフィールの「返答が早い」バッジ
4. 左ナビの並び替え（SettingsNav をダッシュボード基準に）と「売上・振込」プレースホルダ
