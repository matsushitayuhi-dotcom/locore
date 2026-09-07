# スマホ幅のレイアウト規約

PC で見ている限り再現しない崩れが繰り返し出たので、原因と守るべきことをまとめる。

## 何が起きていたか

日本語には単語の切れ目が無く、**どこでも改行できる**。CSS 的に言うと、日本語テキストの
`min-content` 幅は **1 文字分**しかない。

flex の子は既定で `min-width: auto`（= `min-content`）まで縮む。つまり幅が足りないと、
flex は日本語のテキストを**1 文字ずつの縦一列**になるまで平気で潰す。英語なら最長の単語で
止まるので、この崩れは日本語サイト固有であり、かつ PC 幅では絶対に再現しない。

実例（すべて同じ原因）:

| 場所 | 症状 |
| --- | --- |
| `/`（ヒーローのカード） | 「ボストン・HBS在学中」が 50px 幅に潰れて 1 文字ずつ縦積み |
| `/about-service` | 「続きの相談も、同じ流れで。」が 189px の行の中で 23px に潰れ 8 行に |
| 記事エディタのヘッダー | 「公開する」「記事ページの例」が縦一列になりヘッダーだけで 150px |

## 守ること

### 1. 横並びの中で「縮んでいい方」と「縮んではいけない方」を必ず決める

```tsx
<div className="flex items-center gap-3">
  <Avatar className="shrink-0" />              {/* 縮まない */}
  <div className="min-w-0 flex-1">…テキスト…</div> {/* 縮む側。min-w-0 を付ける */}
  <button className="shrink-0 whitespace-nowrap">申し込む</button> {/* 縮まない */}
</div>
```

- 縮んでほしくないもの（ボタン・バッジ・アイコン）→ `shrink-0` と `whitespace-nowrap`
- 縮んでいいもの（本文・見出し）→ `min-w-0`、必要なら `truncate`

### 2. `shrink-0` を付けたら、その分の幅が本当にあるか確かめる

`shrink-0` は「自分は縮まない」宣言なので、**しわ寄せは必ず隣に行く**。
狭い行に固定幅の要素を 2 つ以上置くと、残りが数十 px になって上の崩れが起きる。
入り切らないなら `flex-wrap` で次の行に落とす。

```tsx
<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
  <p className="min-w-[8rem] flex-1">…</p>
  <button className="ml-auto shrink-0">…</button>  {/* 狭いときは次の行へ */}
</div>
```

### 3. 固定ピクセル幅はスマホで効かないものとして書く

`w-[280px]` のような固定幅は 320px の画面に入らない。`max-w-full` を併記するか、
`w-full sm:w-[280px]` のようにスマホ側を基準にする。

### 4. `absolute` で重ねた装飾は、スマホでは縦並びに戻す

重ね置きは幅に余裕がある前提の表現。`max-sm:static` にして通常の流し込みへ戻し、
背景の板など純粋な飾りは `max-sm:hidden` で消す。

### 5. 書いたら 390px で見る

`sm:` の分岐を書いた回だけでなく、**横並びを書いたら必ず**確認する。

## 確認のしかた

### 実機（いちばん確実）

```bash
pnpm --filter @locore/web exec next dev -p 3000 -H 0.0.0.0
```

Mac の LAN IP（`ipconfig getifaddr en0`）を使って、同じ Wi-Fi のスマホから
`http://<IP>:3000` を開く。ホットリロードも効く。
さらに USB 接続して iPhone 側で Safari の Web インスペクタを ON にすると、
Mac の Safari の開発メニューから実機のページを直接インスペクトできる。

### iOS シミュレータ（WebKit で確認したいとき）

iPhone は Chrome アプリでも中身は WebKit なので、Chrome での確認は保証にならない。

```bash
xcodebuild -downloadPlatform iOS     # 初回のみ。7〜10GB
xcrun simctl list devices            # 使えるデバイスを確認
open -a Simulator
```

### 一括検査

`/dev/mobile-audit` を開いて幅を選び、「検査」を押す。
全ページを指定幅の iframe で開いて、横スクロール・はみ出し・1 文字ずつ縦積みを一覧する。
ログインが要るページも、開いているセッションのまま検査できる。

開発サーバーだと初回コンパイルで時間がかかるうえローカル DB が空なので、
**プレビューや本番のデプロイ先で開くほうが速く、実データでの崩れも拾える。**

対象ページは `apps/web/app/dev/mobile-audit/routes.ts`、判定ロジックは同ディレクトリの
`audit.ts`。
