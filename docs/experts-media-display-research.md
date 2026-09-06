# エキスパートページの「発信・メディア」表示形式 — 調査メモ（2026-09-06）

対象: `/experts/[id]` に出す、エキスパート本人の外部発信（YouTube / note / ブログ / X / Instagram / TikTok / Podcast など）と Locore 内記事の見せ方。
ゴール: **表示の仕方をエキスパート自身が選べる**ようにする。その前提として「世の中にどんな表示方式があるか」「各方式に必要なデータをどう取るか」を整理する。

## 0. いまの Locore

| 項目 | 現状 |
| --- | --- |
| データ | `sns_links`（platform / url のみ。タイトル・画像・並び順の指定なし）。platform は tiktok / instagram / youtube / x / threads / blog / facebook / note / website / email |
| /experts/[id] | SNS は非表示（`includeSns: false`）。Locore 内記事は「◯◯さんの記事」にカバー画像つきカード 2 件 |
| /users/[id]（旧ハブ） | `SocialIcons` でアイコン列（内容は伝わらない） |

→ 「何を発信している人か」がページ上で一切見えない。ここが改善対象。

## 1. 世の中で使われている表示方式（カタログ）

| # | 方式 | 見た目 | 代表例 | 向く内容 | 必要データ |
| --- | --- | --- | --- | --- | --- |
| A | **アイコン列** | 丸アイコンだけを横に並べる | ほぼ全プロフィール、現 `SocialIcons` | 「どこにいるか」だけ伝えたいとき | platform + url |
| B | **ボタンリスト（Classic）** | 1 行 1 リンク。左に 1:1 サムネ、中央にタイトル | Linktree Classic（1:1・200px 以上） | ブログ・固定リンク・note マガジン | タイトル、任意で正方形画像 |
| C | **フィーチャードカード（Featured / Hero）** | 16:9 の大きな画像＋タイトル。1〜2 件を目立たせる | Linktree Featured（16:9・680×383 以上。YouTube / TikTok / Spotify / Instagram は自動プレビュー） | 代表動画・最新エピソード・イチオシ記事 | 横長画像、タイトル |
| D | **リンクカード（OG unfurl）** | OG 画像＋タイトル＋説明＋ドメイン。Slack / Notion / X に貼ったときの見た目 | Slack、Notion、Discord、はてなブログカード | note・Zenn・Medium・Substack・個人ブログ など「ページ単位」のリンク全般 | OG メタ（og:title / og:image / og:description / site_name） |
| E | **サムネイルグリッド** | 正方形 3 列。写真の面で見せる | Beacons の image grid / Instagram feed ブロック | 写真中心（Instagram）。留学の現地写真など | 画像 N 枚（自動取得は Meta 審査が必要） |
| F | **横スクロール・カルーセル** | 横に流れるカード列 | Beacons carousel、YouTube チャンネルのシェルフ | 動画 / エピソードが複数あるとき | カード 3〜10 件 |
| G | **埋め込みプレイヤー（embed）** | その場で再生できる iframe / 公式ウィジェット | YouTube、Spotify、X ポスト、TikTok、Instagram | 「まず 1 本見てほしい」動画・音声 | oEmbed HTML または video id。**重い**ので facade（lite-youtube：サムネだけ先に出し、クリックで iframe）が定石 |
| H | **Bento グリッド** | 大小のタイルを自由配置 | bento.me、Betterbio | ポートフォリオ型の自己表現 | エディタが重く、Locore の「相談を選ぶ」目的とはズレる |
| I | **最新投稿の自動フィード** | チャンネル / アカウントを 1 本登録すると最新 N 件がカードで出る | Linktree（YouTube / TikTok 最新投稿の自動取得）、Beacons（Instagram feed） | 更新が多い人。手入力ゼロで鮮度が保てる | RSS または各社 API |

## 2. 必要データをどう取るか（実装コストの現実）

| プラットフォーム | サムネ / タイトルの取り方 | 認証 | 備考 |
| --- | --- | --- | --- |
| **YouTube（動画）** | `https://i.ytimg.com/vi/{videoId}/hqdefault.jpg` は API 不要・常に存在。`maxresdefault.jpg` は無い動画があり、無いと 120×90 の灰色プレースホルダが返る | 不要 | タイトルは `youtube.com/oembed?url=` で無認証取得。埋め込みは facade（lite-youtube-embed 相当）で軽くする |
| **YouTube（チャンネル最新）** | `youtube.com/feeds/videos.xml?channel_id=` の RSS | 不要 | 方式 I をほぼタダで実現できる |
| **X** | `publish.twitter.com/oembed` で投稿の埋め込み HTML | 不要 | プロフィール URL は OG 情報が乏しい → アイコン or ボタン表示が現実的 |
| **TikTok** | oEmbed（動画単位）。blockquote を公式スクリプトが昇格 | 不要 | 動画単位なら方式 C / G が可能 |
| **Instagram / Threads / Facebook** | Meta の oEmbed は **Facebook App 登録＋審査（oEmbed Read）が必要** | 必要 | 自動サムネは当面あきらめ、方式 A / B（本人が画像を上げる）で扱う |
| **Spotify / Apple Podcasts** | oEmbed（無認証）。iframe プレイヤー | 不要 | 方式 G が軽い |
| **note** | 記事ページに og:image（見出し画像）・og:title がある → 方式 D で十分。`note.com/{user}/rss` で最新記事 RSS | 不要 | note 公式の embed ガイドラインは「note に他サービスを埋め込む」側の仕様。note 自身の oEmbed 提供は要確認 |
| **一般ブログ / Zenn / Medium / Substack** | サーバー側で HTML を取得し OG / Twitter Card を解析（metascraper 系の自前実装、または Microlink・Iframely のような API） | 不要 | Microlink は無料枠 1 日 25 件・有料あり。Iframely は 1,900+ サイト対応だが商用。自前なら Vercel の Route Handler で fetch → 解析 → DB キャッシュ |

共通の設計ポイント:

- **取得はサーバー側で 1 回だけ**行い、結果（title / description / image_url / kind / fetched_at）を DB に保存する。表示のたびに外部へ取りに行かない。
- **画像は hotlink せず自前バケットへコピー**するか、少なくとも `referrerPolicy="no-referrer"` と失敗時のフォールバック（platform 色の面＋アイコン）を用意する。OG 画像は差し替え・消失が普通に起きる。
- 本人が**上書きできる**こと（タイトル・画像アップロード）。自動取得は初期値にすぎない。

## 3. 方式の比較（Locore の目的 =「この人に相談するか決める材料」）

| 方式 | 情報量 | 実装 | 表示速度 | 見た目の統一 | 所感 |
| --- | --- | --- | --- | --- | --- |
| A アイコン列 | 低 | 済 | ◎ | ◎ | 補助としては残す（ヒーローの言語行の横など） |
| B ボタンリスト | 中 | 小 | ◎ | ◎ | 手入力タイトルで成立。全プラットフォームに使える保険 |
| C フィーチャード | 高 | 中 | ○ | ○ | YouTube / note の代表 1 本に最適。Intro 型の白基調と相性が良い |
| D OG カード | 高 | 中 | ○ | △（画像の縦横比がばらつく） | ブログ系の本命。比率は 16:9 に cover で揃える |
| E グリッド | 中 | 中 | ○ | ◎ | Meta 審査が壁。本人アップ画像なら可 |
| F カルーセル | 高 | 小（`ExpertRail` 流用） | ○ | ◎ | 動画 3 本以上のとき |
| G 埋め込み | 最高 | 中 | △（facade で ○） | △ | YouTube だけ許可、facade 必須 |
| H Bento | 高 | 大 | ○ | △ | 見送り |
| I 自動フィード | 高 | 中（RSS） | ○ | ◎ | YouTube / note / Podcast は RSS で無認証。Phase 2 の目玉 |

## 4. Locore への提案（「ユーザーが選べる」の具体形）

### 4.1 選べる単位を 2 段にする

1. **リンクごとの「表示形式」**（`display`）: `icon` / `button` / `card` / `featured` / `embed`
   - 既定値は platform から自動: YouTube → `featured`、note・blog・website → `card`、X・Instagram・TikTok・Threads・Facebook → `button`（画像は本人アップ or なし）、email → 非表示（相談はチャットで完結の方針）
   - `embed` は YouTube のみ許可（facade）。他は `featured` に落とす
2. **セクション全体の「並べ方」**（`layout`）: `list`（縦 1 列）/ `grid`（2 列）/ `rail`（横スクロール、`ExpertRail` 流用）
   - 既定は件数で自動: 1〜2 件 → `list`、3 件以上 → `rail`

### 4.2 データ

- `sns_links` に追加（additive、0088 案）: `kind`（profile / post / video / article / podcast）, `title`, `description`, `image_url`, `display`, `sort_order`, `fetched_at`, `fetch_status`
- 取得アクション `fetchLinkPreview(url)`: YouTube（video id → hqdefault + oembed title）、X / TikTok / Spotify（oembed）、それ以外（OG 解析）。失敗しても保存はできる（タイトル手入力）
- Phase 2: `feed_url`（YouTube channel RSS / note RSS / Podcast RSS）を持たせ、cron で最新 3 件を `link_feed_items` に同期

### 4.3 ページ上の位置と見せ方

- 「◯◯さんの記事」を **「発信・メディア」** に拡張し、Locore 内記事と外部リンクを同じカード文法で並べる。順序は 経歴 → 資格 → **発信** → レビュー（決め手の並びを崩さない）
- 白基調・角丸 12px・画像 16:9 cover・左上にプラットフォームの小バッジ（YouTube / note / Blog）。Intro 型の写真カードと同じ余白感
- `featured` は 1 件だけ大きく（全幅・16:9）、残りは `card` / `button` で下に。設定画面では **プレビュー付きのラジオ**で形式を選ぶ

### 4.4 やらないこと

- Instagram / Threads / Facebook の自動サムネ（Meta 審査待ち）。本人アップ画像で代替
- Bento 型の自由配置
- クライアントからの直接 fetch（CORS・鍵漏れ・速度の三重苦）

## 5. 進め方（案）

1. **モック**: 上記 A〜G を同じサンプルで並べた HTML を作り、採用する形式と既定値を決める（`mockups/v2/expert-media-formats.html`）
2. **Phase 1**: 0088 + 取得アクション + 設定画面の形式セレクタ + `/experts/[id]` の「発信・メディア」セクション
3. **Phase 2**: RSS 自動フィード（YouTube / note / Podcast）と cron

## 参考（2026-09-06 閲覧）

- Linktree Featured / Classic レイアウト: [Highlight your links with Featured Layouts](https://help.linktr.ee/en/articles/8580581-highlight-your-links-with-featured-layouts), [Linktree is now allowing users to highlight links better with featured layout function (TechCrunch)](https://techcrunch.com/2024/03/19/linktree-is-now-allowing-users-to-highlight-links-better-with-featured-layout-function/), [How to add a thumbnail icon to your links](https://help.linktr.ee/en/articles/5434160-how-to-add-a-thumbnail-icon-to-your-links)
- Beacons のブロック（carousel / image grid / Instagram feed）: [Beacons vs Bento.me (2026)](https://unil.ink/blog/beacons-vs-bento), [Betterbio vs. Linktree & Beacon.ai: The Bento UI Advantage](https://betterb.io/blog/betterbio-vs-linktree-beacon-ai-bento-ui-engagement)
- oEmbed 提供状況（YouTube / X / TikTok / Spotify 無認証、Meta は要 App 審査）: [Popular oEmbed providers](https://www.oembedproviders.com/oembed-providers/), [oembed.com](https://oembed.com/), [WordPress Embeds](https://wordpress.org/documentation/article/embeds/), [Microlink Embed API](https://microlink.io/embed)
- YouTube サムネ URL と facade: [lite-youtube-embed / youtube-thumbnail-urls.md](https://github.com/paulirish/lite-youtube-embed/blob/master/youtube-thumbnail-urls.md), [YouTube Thumbnail URL Structure](https://wildandfreetools.com/blog/youtube-thumbnail-url-structure-developer/)
- OG unfurl サービス: [Microlink Link Preview API](https://microlink.io/link-preview), [Iframely README](https://github.com/goofrider/iframely/blob/master/README.md), [Free Alternatives to Microlink and OpenGraph.io in 2026](https://binary.ph/2026/03/18/free-alternatives-to-microlink-and-opengraph-io-in-2026/)
- note の embed 仕様: [embed機能 開発ガイドライン（note ヘルプ）](https://www.help-note.com/hc/ja/articles/900001827326-embed%E6%A9%9F%E8%83%BD-%E9%96%8B%E7%99%BA%E3%82%AC%E3%82%A4%E3%83%89%E3%83%A9%E3%82%A4%E3%83%B3), [テキスト記事に埋め込みできるサービス一覧](https://www.help-note.com/hc/ja/articles/360019596133)
