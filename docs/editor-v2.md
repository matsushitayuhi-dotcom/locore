# 記事エディタ v2（/writer/articles/[id]/write）

> 前身の `docs/editor-spec.md` は削除した。あれは `place` / `itinerary` / `GeoRef` / `editorsNote` /
> `image.layout` を前提に書かれていたが、**実装の `blocks.ts` にはどれも存在しない**。
> あれを設計の拠り所にすると、旅行専用の作り（スポット登録フォーム・地図の自動生成・記事タイプ 2 択）を
> もう一度呼び込んでしまう。本書がエディタの仕様書の唯一の版になる。

---

## 0. 仕様の基準

**仕様の基準は `apps/web/lib/articles/blocks.ts`（保存形式）と `apps/web/components/articles/Prose.tsx`（表示）である。**
この 2 つに書かれていないものは存在しない。本書を含むどのドキュメントも、この 2 つと食い違ったら
コードのほうが正しい。

- 保存形式: `apps/web/lib/articles/blocks.ts` … `blockSchema`（19 種の discriminated union）
- 表示: `apps/web/components/articles/Prose.tsx`, `Inline.tsx`, `app/articles/[id]/EditorialArticle.tsx`
- 編集: `apps/web/app/writer/articles/[id]/write/`（`BlockEditor.tsx` / `blockOps.ts` /
  `useBlockKeymap.ts` / `BLOCK_KINDS.ts` / `actions.ts`）

**この作り直しで触るのは編集 UI とその周辺だけ。保存形式と表示側は無改修。**
公開済みの記事の見た目を 1px も変えないための線引きであり、既存記事の中に「もう挿入できない種類」が
残っていても表示は今までどおりに描かれる。

文中の装飾は `Inline.tsx` が解釈する `**太字**` と `[文字](URL)` の 2 つだけ。HTML は持たない。

---

## 1. 3 原則

1. **書き手が触る語彙は 9 語だけ。** 実装用語（`paragraph` / `aside` / `link_card` / `embed` /
   heading の level / list の style）と enum 値を UI に一切出さない。
   旧エディタの「埋め込み 1 · リンク」「埋め込み 2 · SNS・地図」は禁止例。
2. **402px でできないことは PC でも主導線にしない。** 新エディタで `max-lg:hidden` / `max-sm:hidden` を
   使ったら差し戻し。PC の追加要素は「速く書くための重複経路」（`/` メニュー、ショートカット、ドラッグ）に限る。
3. **入力欄の font-size は例外なく 16px 以上。タップできる要素は 44×44px 以上。**
   16px 未満の入力欄は iOS Safari がフォーカスのたびに拡大する。小さく見せたいところは
   色・字間・太さで従属させる。hover でしか出ない UI を作らない。

書き手は在学生・卒業生で、プロのライターではない。**スマホで書く。**

---

## 2. 書き手に見せる 9 語

| 書き手が見る言葉 | 内部の種類（`EditorKind`） | 保存形式（`blocks.ts`） |
|---|---|---|
| 本文 | `paragraph` | `paragraph` |
| 見出し / 小見出し | `heading2` / `heading3` | `heading`（level 2 / 3） |
| 箇条書き / 番号つき | `bullet` / `number` | `list`（style bullet / number） |
| 引用 | `quote` | `quote`（`cite` は「出典」） |
| 写真 | `image` | `image`（`caption` と `alt` を編集） |
| メモ | `aside` | `aside`（kind は「ポイント / 注意 / メモ」のピル） |
| 表 | `table` | `table`（セル単位で編集） |
| 区切り線 | `divider` | `divider` |
| リンク | `link` | `link_card` **または** `embed`（URL から自動判別） |

- 定義は `app/writer/articles/[id]/write/BLOCK_KINDS.ts`。UI 文言はここからしか取らない。
- `EditorKind` は「保存形式 → 書き手の語彙」の写像でしかない。heading の level と list の style を
  畳んであるのは、書き手に「レベル」「スタイル」という概念を見せないため。
- **リンクは 1 つのボタン。** URL を 1 本もらって `actions.ts` の `resolveUrlBlock` が
  `link_card` か `embed` かを決める。書き手に 2 択を見せない。
- メモの中の 3 つのピルは「ポイント / 注意 / メモ」。`point` / `caution` / `memo` という値は出さない。

---

## 3. 402px の画面

```
44px の sticky ヘッダ … ← / 状態ドット+「保存済み 12:03」/ …（公開ボタンは置かない）
カバー写真（あれば 3:2 の実寸）
タイトル 26px / サブタイトル 16px（表示側は 15.5px。入力欄なので 16px に上げる）
本文ブロック列（幅・余白は Prose と同一）
────────────────────────────
書式バー 52px（＋ / 見出し / ・ / ” / 写真 / リンク / ↺ / 目）
visualViewport を購読してソフトキーボードの真上に固定。フォールバックは sticky bottom-0
```

- タイトル・サブタイトルの見た目は `EditorialArticle.tsx` の h1（`max-sm:text-[26px]`）と
  subtitle（`max-sm:text-[15.5px]`）に寄せる。書いている画面と出来上がりがずれないため。
  **ただしサブタイトルは編集できる入力欄なので、font-size は 16px にする。**
  原則 3（入力欄は 16px 以上）は表示側との一致より優先する。15.5px にすると iOS Safari が
  フォーカスのたびに拡大し、旧エディタで潰したはずの不具合が戻る。
  0.5px の差は行間・色・字間（`leading-[1.7]` / `text-neutral-700`）で吸収する。
- 公開ボタンをヘッダに置かない。402px の 44px 幅に「戻る・保存状態・公開」を並べると全部 44px を割る。
  公開は … の中。
- 本文ブロックの幅・行間・余白は `Prose.tsx` と同じ値を使う。`Prose.tsx:28` の mobile 本文は
  `max-sm:text-[16px]` で、**ちょうど下限に接している**。以後 Prose 側が 15.5px などに下がっても、
  編集画面はそれに追随しない。**Prose に合わせた結果 16px を割る値は採らない。**

### エディタが保存する項目

`actions.ts` の `saveSchema` がすべて。ここに無いものはエディタから保存されない。

| 項目 | 上限 | エディタでの扱い | 送らなかったとき |
|---|---|---|---|
| `title` | 120 字 | 必須。ヘッダ直下の入力欄 | （必須なので必ず送る） |
| `subtitle` | 300 字 | 編集する。タイトルの下の入力欄（16px） | 触らない |
| `lead` | 600 字 | **編集しない。** 既存記事の値はそのまま残す | 触らない |
| `topic` | 40 字 | … の中から選ぶ | 触らない |
| `coverImageUrl` | 2048 字 | カバー写真の差し替え・削除 | 触らない |
| `blocks` | — | 本文。上限は `normalizeBlocksForSave` が黙って吸収する | （常に送る） |

- **「キーが無い = 触らない」「空文字 = 消す」**（`actions.ts` の保存の約束ごと 1）。
  空の payload で旧エディタの値を潰さないための決まり。
- `subtitle` は 0091 のカラムで、`EditorialArticle.tsx:74` が描いているのに旧 `/write` の
  `saveSchema` に無く、**書いても永久に空だった**。新エディタはこれを保存する。
- `lead`（`EditorialArticle.tsx:109` のリード文）は編集の入口を作らない。9 語の原則の外にある
  「もう 1 つの本文」を増やさないため。既存の値は上のルールで残る。

---

## 4. 書式バー — 挿入ではなくトグル

書式バーの各ボタンは「**いまカーソルがある行の書式を変える**」。新しいブロックを足すボタンではない。

| ボタン | 動き |
|---|---|
| 見出し | 本文 → 見出し → 小見出し → 本文 の循環（`cycleHeading`） |
| ・ | 本文 → 箇条書き → 番号つき → 本文 の循環（`cycleList`） |
| ” | 本文 ⇄ 引用（`toggleQuote`） |
| 写真 | その場に写真を差し込む（カメラロールを開く） |
| リンク | URL を尋ねて `resolveUrlBlock` に投げる |
| ↺ | 元に戻す / やり直す |
| 目 | 書いたものを読む形で確認 |

**本文テキストは書式を変えても必ず残る。** 変換は `blockOps.ts` の `turnInto` が行い、
テキストを移送したうえで **ブロックの id を維持する**（id が変わると textarea が再マウントされて
キャレットが飛ぶ）。旧エディタは空のブロックで replace していたので、段落を見出しに変えると中身が消えた。

**写真・表・区切り線・リンクなど、文字を打たないブロックが選ばれているとき**、バーは
ブロックのペイン（種類を変える / ↑ / ↓ / 複製 / 削除）に切り替わる。
**テキストの行にカーソルがある間は書式トグルのまま**で、ブロックのペインは右端のボタンから開く。

`FormatBar.tsx` はこれを 2 つの状態で表す。仕様と実装で同じ名前を使うこと:

| 名前 | 意味 | バーの既定のペイン |
|---|---|---|
| `canFormat` | 文字が打てるブロック（本文・見出し・リスト・引用・メモ）にカーソルがある | 書式トグル |
| `hasBlock` | 何かのブロックが選ばれている（写真・表・区切り線を含む） | `canFormat` が false ならブロック |

「種類を変える」に並ぶのは `TURN_INTO_KINDS`（本文・見出し・小見出し・箇条書き・番号つき・引用・メモ）＝
テキストを保ったまま行き来できるものだけ。だから `canFormat` が false のときは押せない。

### 保存に失敗したとき

自動保存は **必ず再送する**。旧エディタは失敗しても toast を出すだけで、書き手の下書きが
dirty のまま放置されていた。

- `saveArticleBlocks` は `SaveResult` を返す。失敗は `{ ok:false, error, retryable, retryAfterMs }`。
- `retryable`（通信・DB の一時障害）なら `retryAfterMs` 待って `attempt + 1` で
  **同じ payload をそのまま再送**する。保存は記事 id への上書きなので何度送っても安全（冪等）。
- `retryable` が false（入力不正・権限なし）のときだけ手を止めて書き手に伝える。

PC の重複経路（402px で同じことができるので、あくまで近道）:
`/` メニュー、行頭の markdown（`## ` `- ` `1. ` `> ` `---` → `applyMarkdownShortcut`）、
Enter で分割、Backspace で結合、矢印キーでブロックをまたぐ移動。

> **IME の約束**: すべてのキー分岐は `e.nativeEvent.isComposing` を最初に見る（`useBlockKeymap.ts`）。
> 日本語変換の確定 Enter は改行ではない。旧エディタはこれを見ておらず、変換を確定した瞬間に
> ブロックが差し替わっていた。

---

## 5. ＋ シート — 挿入の唯一の正規ルート

＋ を押すとボトムシートが出る。2 列グリッド、各セル 88px 角、アイコン + 日本語 + 一行の説明。

```
写真   見出し
箇条書き 番号つき
引用   メモ
表    区切り線
リンクを貼る
```

**ここに載っているものが、書き手が挿入できる全部。**（`BLOCK_KINDS`）
「小見出し」と「本文」はシートに出さない。小見出しは見出しボタンの循環と「種類を変える」から、
本文は既定なので選ぶ必要がない。

旧エディタでは、ブロック挿入の唯一の入口が「空の段落で `/` を打つ」だった。iPhone のかなキーボードでは
`/` が打ちにくく、＋ ボタンも「ブロックを追加」も段落しか足さないので、**スマホの書き手は見出しも写真も
リストも作れなかった。** ＋ シートはその穴をふさぐためのもので、PC でも同じものが出る。

---

## 6. 表示専用に落とした 9 種

`blockSchema` の 19 種のうち、次の 9 種は **編集 UI を持たない**。

| 保存形式 | 読み取り専用カードに出す名前 | 「本文に変換」の行き先 |
|---|---|---|
| `images` | 写真を並べたもの | 写真ブロックに分ける |
| `takeaways` | まとめ | 箇条書き |
| `checklist` | チェックリスト | 箇条書き |
| `faq` | よくある質問 | 小見出し + 本文 |
| `terms` | 用語の説明 | 本文 |
| `timeline` | 時系列 | 箇条書き |
| `proscons` | 良い点・気になる点 | 箇条書き |
| `stats` | 数字 | 箇条書き |
| `footnotes` | 注釈 | 番号つき |

- `blockSchema` と `Prose.tsx` の描画は **無傷で残す**。公開済み記事の見た目は変えない。
- 新エディタに挿入手段は置かない。既存記事にこれらが含まれるときだけ、
  **読み取り専用カード + 「本文に変換」ボタン**を出す（`blockOps.convertToBody`。中身は 1 つも捨てない）。
- 判定は `BLOCK_KINDS.ts` の `isDisplayOnly` / `displayOnlyLabel`。
- 増やさない。ここに 1 つ足すたびに、書き手が覚える言葉が 1 つ増えて 9 語の原則が崩れる。

---

## 7. 旅行記事の要素を普通のブログに畳む

旧ウィザード（`/edit`）は旅行記事専用の作りだった。新エディタはそれを引き継がない。
**スポットの新規登録 UI は作らない**（`spots` テーブルの既存行は消さない。`/library?tab=spots` の
ブックマークと trips が参照している）。

| 旧: 旅行専用の要素 | 新: 普通のブログでの書き方 |
|---|---|
| 旅程（itinerary / order / time） | **見出し + 表**。1 日 1 見出し、表の列は「時間 / 行き先 / メモ」 |
| スポット（place / GeoRef / 地図の自動生成） | **見出し + 写真 + 段落 + Google マップの URL を 1 行**。<br>URL を貼れば `resolveUrlBlock` が `embed`（provider `gmap`）にする |
| 交通手段（transfer / mode / minutes） | **本文 1 行**。「駅から徒歩 8 分」と書く |
| 集約マップ・順路 | 作らない。地図は場所ごとの 1 本のリンクだけ |
| editorsNote | メモ（`aside`） |
| 費用・所要時間のサマリー | 表、または箇条書き |

こう畳める根拠は、記事が「順番のある体験」かどうかを**データ構造で表さなくても、
見出しと表で十分読める**から。構造で持つのをやめると、記事タイプの 2 択も、
場所ブロックの有無による自動レイアウト分岐も要らなくなる。

既存のフォト日記・旅程記事は普通のブログ形式に平坦化してよい（フォト日記の全画面 scroll-snap 表示と、
旅程の地図付き表示は失われてよい）。

---

## 8. 有料記事

**有料記事は新規に作れない。** 既存の有料記事は表示・購入とも今のまま生かす。
`paywall` にあたるブロックは作らない。エディタに課金の入口を置かない。

---

## 9. デモ（/demo/editor）

`apps/web/app/demo/editor/page.tsx` は、ログインなしで新エディタを触れる場所（保存されない）。
初期データは **挿入できる 9 種だけ**で組む。挿入手段の無いブロック（`takeaways` / `timeline` など）を
デモに置くと、見せているものを書き手が再現できない。
末尾に「見出し + 写真 + 段落 + マップの URL」で場所を書く例を入れてある（§7 の実演）。

- **デモではリンクのプレビューは付かない。** `resolveUrlBlock` は未ログインだと
  `canFetch === false` で外部へ取りに行かない（`actions.ts`）。だから初期データの `link_card` /
  `embed` にも `preview` を持たせない。持たせると、デモ訪問者が同じ URL を貼っても
  同じ見た目にならない（`link_card` は `p?.title ?? block.url` で生 URL の見出しになる）。
  **触れば再現できるものだけを初期データに置く。**
  なお `gmap` はログイン時でもプレビューを取らず、`EmbedBlock.tsx` が URL から場所名を組み立てる
  （`gmapPlaceName`）ので、地図だけは貼れば名前が出る。
- 保存されないので、ヘッダに「保存済み HH:MM」を出さない（`updatedAt` を空で渡す）。
- 写真は picsum のランダム画像で、中身は毎回変わる。**alt に写っているものを断定して書かない。**
  実在の店名・施設名も置かない（無関係な写真に実在の場所の断定が結び付く）。

---

## 10. 用語の言い換え表（UI 文言のレビュー用）

| 出してよい | 出してはいけない |
|---|---|
| 本文 | 段落 / paragraph / テキストブロック |
| 見出し / 小見出し | H2 / H3 / heading level |
| 箇条書き / 番号つき | リスト / ul / ol / bullet / number |
| メモ（ポイント / 注意 / メモ） | コールアウト / callout / aside / point / caution |
| 引用 / 出典 | quote / cite |
| 写真 | 画像 / image / メディア |
| 表 | テーブル / table |
| 区切り線 | 罫 / hr / divider |
| リンク | リンクカード / 埋め込み / link_card / embed / oEmbed |

---

## 11. 残っている参照

`docs/editor-spec.md` を消したので、次のファイルのコメントは行き先の無い参照になっている。
いずれも旧ウィザード・モックアップ側で、削除か書き換えの対象:

- `apps/web/app/writer/articles/[id]/edit/components/WizardShell.tsx`（旧ウィザード。削除対象）
- `apps/web/app/mockup/page.tsx`, `apps/web/components/mockups/PlaceGuideMock.tsx`,
  `apps/web/components/mockups/EssayMock.tsx`, `apps/web/components/mockups/tripData.ts`
- `apps/web/components/article/v2/classify.ts`（「入口 2 択」を前提にしている）
