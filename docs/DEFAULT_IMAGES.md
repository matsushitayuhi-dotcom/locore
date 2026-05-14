# Locore で使われているデフォルト画像の一覧

「ちゃんとした画像に置き換えたい」用の作業リスト。すべて Unsplash から curated した
URL を使っていて、フォーマットは:

```
https://images.unsplash.com/photo-{ID}?w={WIDTH}&auto=format&fit=crop&q=80
```

`{ID}` を差し替えれば全画面で画像が変わる。

## 1. スプラッシュ画面 (`/`)

`apps/web/app/page.tsx`

| 項目 | 推奨サイズ | 現在の URL | 用途 |
|---|---|---|---|
| Traveler カードのヒーロー | **1200×1500** (4:5) | `photo-1502602898657-3e91760cbb34` (Eiffel) | 「旅する人として」のカード背景 |
| Resident カードのヒーロー | **1200×1500** (4:5) | `photo-1524396309943-e03f5249f002` (Lyon) | 「そこに暮らす人として」のカード背景 |

サイズ指定は `w=1200`。実際の表示は SP 100vw / PC 50vw、aspect 4:5。
ブランド感が出るので **ここが最優先**で差し替え推奨。

## 2. 国カードのヒーロー画像

migration `0030_france_regions_and_hero_images.sql` で seed されている。
`countries.hero_image_url` 列に格納。

使われる場所:
- `/` のホーム（旅行者）の国カルーセル
- `/world` の WorldPicker
- `/country/[code]` の上部ヒーロー（全幅）

### サイズ感

| 表示場所 | aspect | 表示サイズの目安 |
|---|---|---|
| カルーセルタイル | 3:4 縦長 | 240×320 |
| WorldPicker active カード | 5:4 横長 | 400×320 |
| WorldPicker coming soon カード | 4:5 縦長 | 240×300 |
| `/country/[code]` のヒーロー | 16:9 横長フル幅 | 1600×900 |

**全部 `w=1200` で取得しているので、横長と縦長で `fit=crop` がいい感じに切ってくれている**。
画像を差し替えるなら 1200×800 以上の横長を選ぶと安全。

### 各国の現在の URL（28 ヶ国分）

| code | 国 | Unsplash photo ID |
|---|---|---|
| `fr` | フランス | `1502602898657-3e91760cbb34` (Eiffel) |
| `it` | イタリア | `1531572753322-ad063cecc140` (Colosseum) |
| `es` | スペイン | `1583422409516-2895a77efded` (Sagrada Familia) |
| `gb` | イギリス | `1513635269975-59663e0ac1ad` (London) |
| `de` | ドイツ | `1587330979470-3016b6702d89` (Berlin) |
| `nl` | オランダ | `1534351590666-13e3e96c5017` (Amsterdam) |
| `pt` | ポルトガル | `1555881400-74d7acaacd8b` (Lisbon) |
| `jp` | 日本 | `1545569341-9eb8b30979d9` (Tokyo) |
| `tw` | 台湾 | `1552919572-be9c89bfe05c` (Taipei) |
| `kr` | 韓国 | `1538485399081-7c8978d28b9b` (Seoul) |
| `th` | タイ | `1528181304800-259b08848526` (Wat Arun) |
| `vn` | ベトナム | `1528127269322-539801943592` |
| `sg` | シンガポール | `1525625293386-3f8f99389edd` (Marina Bay) |
| `id` | インドネシア | `1537996194471-e657df975ab4` (Bali) |
| `in` | インド | `1564507592333-c60657eea523` (Taj Mahal) |
| `us` | アメリカ | `1496588152823-86ff7695e68f` (NYC) |
| `ca` | カナダ | `1503614472-8c93d56cd9b6` (Banff) |
| `mx` | メキシコ | `1518105779142-d975f22f1b0a` |
| `au` | オーストラリア | `1506973035872-a4ec16b8e8d9` (Sydney Opera) |
| `nz` | ニュージーランド | `1469521669194-babb45599def` (Milford) |
| `br` | ブラジル | `1483729558449-99ef09a8c325` (Rio) |
| `ar` | アルゼンチン | `1589909202802-8f4aadce1849` (Buenos Aires) |
| `pe` | ペルー | `1526392060635-9d6019884377` (Machu Picchu) |
| `ma` | モロッコ | `1597212618440-806262de4f6b` (Marrakech) |
| `eg` | エジプト | `1539650116574-75c0c6d73f6e` (Pyramids) |
| `ae` | UAE | `1518684079-3c830dcef090` (Dubai) |
| `tr` | トルコ | `1524231757912-21f4fe3a7200` (Istanbul) |
| `za` | 南アフリカ | `1580060839134-75a5edca2e99` (Cape Town) |

差し替えは Supabase で:
```sql
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-NEWID?w=1200&auto=format&fit=crop&q=80' WHERE code = 'fr';
```

## 3. 地域カードのヒーロー画像（フランス 14 地域）

migration `0030` で seed。`cities.hero_image_url` 列。

使われる場所:
- `/country/fr` の地域グリッド
- `/region/[slug]` の上部

| slug | 名前 | photo ID |
|---|---|---|
| `paris` | パリ＆近郊 | `1502602898657-3e91760cbb34` |
| `lyon` | リヨン | `1524396309943-e03f5249f002` |
| `marseille` | マルセイユ | `1599991005465-7e2eb8f15db5` |
| `nice-cote-azur` | ニース・コートダジュール | `1503917988258-f87a78e3c995` |
| `bordeaux` | ボルドー | `1583266488953-7d3e3a32f5b1` |
| `strasbourg` | ストラスブール | `1559717237-c0e635a47fbd` |
| `provence` | プロヴァンス | `1502602898657-3e91760cbb34` |
| `loire-valley` | ロワール渓谷 | `1581784368651-8916092072cf` |
| `normandy` | ノルマンディー | `1581450239849-3aae74b5f02d` |
| `brittany` | ブルターニュ | `1597595272404-fb1b0b146f04` |
| `french-alps` | フレンチアルプス | `1551524559-8af4e6624178` |
| `toulouse` | トゥールーズ | `1591289297030-9e92a8e9c673` |
| `champagne` | シャンパーニュ | `1568213816046-0ee1c42bd559` |
| `dordogne` | ドルドーニュ | `1551634979-2b11f8c946fe` |

差し替え:
```sql
UPDATE cities SET hero_image_url = '...' WHERE slug = 'paris';
```

## 4. 記事カードのカバー画像

`articles.cover_image_url` 列。

- 設定されていれば writer がアップロードしたものを使う
- **無ければ `https://picsum.photos/seed/{articleId}/960/640` でランダムフォールバック**

サンプル記事（migration 0026 / 0027）の cover_image_url は全部 NULL なので、picsum の
ランダム画像が出ている。

「ちゃんとした写真にする」なら:
1. 記事を編集して cover image をアップロード
2. または SQL で個別に URL を埋める

## 5. アバター

`users.avatar_url` 列。

- 設定されていれば使う
- 無ければ `<AvatarFallback>` でイニシャル表示（getInitials）

## 6. スポット写真

`spots.google_photo_urls` 列。

- Google Places API から取得した URL を保存（→ `docs/GOOGLE_PLACES_PHOTOS.md`）
- 無ければ非表示（プレースホルダ画像なし）

## 差し替えの優先度

1. **スプラッシュの 2 枚** — 第一印象で一番効くので、ブランド感のある写真にしたい
2. **フランスのヒーロー** — トップカルーセルで一番大きく出る
3. **パリ＆近郊** — 旅行者ホームの先頭、最も視認される地域カード
4. その他 active 地域（14 地域）
5. Coming Soon 国（28 ヶ国） — グレーアウトされているので優先度低

## Unsplash 以外のソース

商用利用 OK + 高品質:
- **Pexels** — Unsplash と同等、API もあり
- **Wikimedia Commons** — ランドマーク系で良い写真多数（要 attribution）
- 独自撮影 — 書き手自身が撮ったやつを毎月数枚アップしてもらう、もアリ

将来的には R2 / Supabase Storage に自前ホスティングし、`hero_image_url` を
`https://r2.locore.app/...` にする想定（migration して URL を一括書き換え）。
