# v2ピボットに向けた既存実装の棚卸し

> 2026-09-03 調査。新コンセプト（在外邦人へのスポット相談・B2C）を基準に、既存実装を仕分けた結果。

## 最重要の発見

**決済は完全モック。** Stripeはリポジトリのどこにも組み込まれていない（依存パッケージなし）。記事購入は `purchaseArticleMock()` が決済なしで purchases 行を書くだけ、admin の payouts / revenue は21行のスタブ。エスクロー系10テーブル（migration 0052）はスキーマのみでコードから参照ゼロ。**→ 旧コンセプトの「お金まわり」に沈没コストはほぼ無い。**

## ① そのまま核になる資産

- **居住認証**（アプリ内で最も完成度が高い）：申請フォーム→書類アップロード（Supabase Storage）→管理者審査（admin/verifications、935行）→承認/却下メール→30日後書類自動削除（GDPR対応cron）。v2の信頼の根幹
- **チャット**：1対1 DM、既読管理付き、5秒ポーリング（Realtimeではない）。テキストのみだが動作する。事前質問の場としてそのまま使える
- **user_services テーブル + servicesページ**：料金・所要時間・言語・集合場所・キャンセルポリシーまで持つ「サービス紹介」。予約機能を足せば相談メニューになる（隠れた優良資産）
- **認証基盤**：Supabase メール+パスワード（OAuth未配線）。middleware・requireEditor等のロール制御も実装済み
- **reviews / reports / audit_logs**：相談後レビュー・通報に転用可
- **メール基盤**：Resend統合済み（テンプレは認証系3種のみ→予約系を追加する）
- **Vercel cron の型**：ai-paris-events / cleanup-verification-files 等。リマインダーメールに流用

## ② 新規に作るもの（＝v2 MVPの本体）

- **空き枠管理＋予約フロー**：既存 calendar は「パリの街イベントカレンダー」（board_posts.event_date のmonth grid）であって予約機能ではない。bookings テーブルから新設
- **本物のStripe決済**：Checkout + Webhook。手数料計算はモックのロジックが参考になる
- **ビデオ通話**：自前実装なし（Daily/Twilio/WebRTC等の痕跡ゼロ）→ Meet/Zoomリンク共有で開始

## ③ 判断保留

- **記事エディター＋公開パイプライン**：コードベース最大の投資（writer配下24ファイル7,317行、TipTap、旅程ブロック、スポット、写真）。v2の主役ではないが「エキスパートが知見を記事でも見せる」補強コンテンツの道あり。急いで消さない
- **admin全体**（39ファイル6,834行）：verifications/reports/usersは残す。articles/board/communityは凍結対象と連動

## ④ 凍結・非表示候補（削除はしない）

- jobs / apartments / marketplace / groups / lessons / help（community_posts 単一テーブル + 独立ルート → ナビから外すだけで済む）
- light_diaries、trips、クライシス情報（crisis_*）、AIモデレーション（article_moderation_scores）、editor_collections
- 未使用のエスクロー系10テーブル（参照ゼロなので放置で無害）

## その他の事実

- apps/api（NestJS）と apps/workers（BullMQ）は実質空のスキャフォールド。実ロジックは全て apps/web の Server Actions
- i18n は日本語のみ（next-intl設定済みだがUI文字列はハードコード）
- Web Push はスキーマ＋設定UIのみ、クライアントコードなし
- DBは51テーブル（Drizzle）+ 手書きmigration 60本

## 結論

リポジトリは捨てない。重い部品（信頼＝居住認証、管理画面、チャット、サービスメニュー）が既に動いており、足りないのは「予約」と「本物の決済」の2つ。旧コンセプト固有機能は外すだけで済む。**同じ骨格の上に表側を差し替えるのが最短。**

タスクは Notion「Locore TODO v2（相談版MVP）」を参照。コンセプトは [concept-v2.md](./concept-v2.md)。
