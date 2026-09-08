# Locore で作業するときに必ず読むこと

## スマホ幅のレイアウト

このリポジトリで最も繰り返し出ているバグは、**PC 幅では絶対に再現しない日本語特有の
レイアウト崩れ**。日本語はどこでも改行できるため flex の子が 1 文字幅まで潰れ、
「ボ / ス / ト / ン」のように縦一列に積まれる。

横並び（`flex`）を書いたら、その回に必ず次を守る:

- 縮んでほしくないもの（ボタン・バッジ・アイコン）に `shrink-0` と `whitespace-nowrap`
- 縮んでいいもの（本文・見出し）に `min-w-0`、必要なら `truncate`
- `shrink-0` を足したら、しわ寄せを受ける側の幅が残るか確かめる。残らないなら `flex-wrap`
- 固定幅 `w-[280px]` は 320px の画面に入らない。`max-w-full` を併記する
- `absolute` で重ねた装飾は `max-sm:static` で縦並びに戻す。飾りは `max-sm:hidden`

確認は 390px（iPhone 14〜17）を基準に、狭い方は 320px（画面表示「拡大」）まで。
一括検査は `/dev/mobile-audit`。詳細と実機での見かたは
[docs/mobile-layout.md](./docs/mobile-layout.md)。

## チームで作業するときの必須工程

**画面に手を入れる作業には、必ず「iPhone の見た目チェック」担当を入れる。**
コードが型として正しくても、402px で文字が縦積みになったり要素が重なったりする。
チェックの結果に応じて、文字数を詰める・ボタンの並びを組み直すところまでやること。

- 基準幅は **402px**（iPhone 17 実測）。狭い側は **320px**（画面表示「拡大」）まで
- 見るもの: 画面と親からのはみ出し / 文字同士の重なり / 1 文字ずつの縦積み /
  10px 未満の文字 / 36px 未満のタップ領域
- **Xcode の iOS シミュレータを主手段にする。** 数値だけで済ませず、実際の WebKit で
  目で見ること。iPhone は Chrome アプリでも中身は WebKit なので Chrome の確認は保証にならない

  ```bash
  xcrun simctl list devices available | grep iPhone
  xcrun simctl boot <デバイスID> && open -a Simulator
  xcrun simctl openurl booted "http://localhost:3000/…"   # Mac と同じネットワーク
  xcrun simctl io booted screenshot /tmp/shot.png          # 撮って目で見る
  ```

  simctl でできるのは URL を開くこととスクリーンショットまで。タップとスクロールは
  シミュレータのウィンドウを直接操作する
- 数を洗うときは `/dev/mobile-audit`（全ページを指定幅の iframe で開いて機械的に数える）
- **ブラウザとシミュレータは 1 つしか無い。見た目チェックは直列の工程に置く**
  （並列エージェントで奪い合わせない）。コードの修正だけを並列にする

## 変更を出す前に

```bash
pnpm --filter @locore/web typecheck
pnpm --filter @locore/web lint
```

セットアップとモノレポ構成は [CONTRIBUTING.md](./CONTRIBUTING.md)、
ローカル環境は [docs/setup.md](./docs/setup.md)。
