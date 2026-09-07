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

## 変更を出す前に

```bash
pnpm --filter @locore/web typecheck
pnpm --filter @locore/web lint
```

セットアップとモノレポ構成は [CONTRIBUTING.md](./CONTRIBUTING.md)、
ローカル環境は [docs/setup.md](./docs/setup.md)。
