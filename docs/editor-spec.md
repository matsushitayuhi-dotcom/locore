# Locore 記事エディタ ブロックモデル仕様（v0 / 設計検討用）

> 目的: 投稿エディタを「自由HTML」ではなく**型のついたブロックの積み上げ**にすることで、
> 誰が書いても出力が破綻しない（＝“失敗しない”）。本書はその構造の検討用たたき台。
> モックアップ（`/mockup`）は本仕様のブロックから各タイプを描き分けたもの。

---

## 1. 記事タイプ

実装上の基本フラグは1つ:

| type | 説明 | 場所ブロック | 地図 | 順番/時間/移動 |
|---|---|---|---|---|
| `itinerary`（旅程） | 順序のある体験＝モデルコース | あり | あり（順路） | **あり** |
| `standard`（それ以外） | 順序のない記事 | 任意 | 任意（ピン） | なし |

`standard` は「場所ブロックを使うか／地図を出すか」を記事内のブロック構成で決める。
代表的な見せ方は2つ:

- **場所紹介（place-guide）**: 複数の場所を順不同で紹介（地図ピンあり）
- **読み物（essay）**: 場所・地図を持たない、文章・写真・動画主体

→ **タイプは `itinerary | standard` の2分岐**。残りはブロック構成の違いとして表現する
（＝エディタ実装をシンプルに保つ）。

---

## 2. 共通ブロック（全タイプで使える）

| ブロック | フィールド | 出力 |
|---|---|---|
| `heading` | level(h2/h3), text | 見出し |
| `paragraph` | richtext（太字/リンク/リスト） | 本文 |
| `image` | src[], caption, layout(single/grid/full) | 画像 |
| `video` | provider(youtube/vimeo/upload), src, caption | 動画埋め込み |
| `quote` | text, cite | 引用 |
| `callout` | kind(tip/warn/info), text | 「コツ・注意」ボックス（ライム破線） |
| `divider` | — | 区切り |
| `editorsNote` | text | エディターズノート（前書き/編集メモ帯） |

`callout` が「失敗しないための小技」の置き場所。書き手は **callout ブロックを挿入して
文字を入れるだけ** で、常に同じ体裁で出力される（スタイルを壊せない）。

---

## 3. 場所ブロック `place`（場所を扱う記事の中核・全タイプ共通）

**場所を構成するブロックはタイプ間で同一。** これが設計の肝。

```ts
type PlaceBlock = {
  name: string;            // 名称
  category?: string;       // カテゴリタグ（カフェ/美術館 等）
  location: GeoRef;        // 地図情報（後述）— ここから個別マップ＆集約マップを自動生成
  photos?: Media[];        // 写真
  body?: RichText;         // 説明
  cost?: string;           // 費用（任意）
  tip?: string;            // その場所のコツ（任意 = place 内のミニ callout）
  links?: { label: string; url: string }[]; // 公式/予約 等（任意）
};

type GeoRef =
  | { query: string }              // "Du Pain et des Idées, Paris"
  | { lat: number; lng: number }   // 48.8686, 2.3625
  | { placeId: string };           // Google Place ID（本番推奨）
```

---

## 4. 旅程拡張（`itinerary` のときだけ `place` に付記）

旅程系は、共通の `place` ブロックに**順番・時間・移動**を足すだけ:

```ts
type ItineraryStop = PlaceBlock & {
  order: number;                                   // 順番（自動採番）
  time?: { start: string; end?: string };          // 時刻（08:00 / 08:45）
  transfer?: {                                     // 次の場所への移動
    mode: 'walk' | 'metro' | 'bus' | 'taxi' | 'bike' | 'train';
    minutes: number;
    distanceKm?: number;
  };
};
```

> ユーザー認識との一致:「場所の情報を構成するブロックは同じで、旅程系の場合は
> それに順番・時間・移動手段の情報を付記する」。

---

## 5. 地図（`place.location` から自動生成）

書き手は地図を手で埋め込まない。**`place.location` フィールドから自動生成**する。

- **個別「地図で見る」**: `https://www.google.com/maps/search/?api=1&query=<lat,lng or query>`
- **集約マップ**:
  - `itinerary` → `order` に沿った **directions（順路）**
  - `place-guide` → 順不同の **ピン群**
  - `essay` → `place` ブロックが無い → **地図セクション無し**
- 実装メモ: モックは APIキー不要の `https://maps.google.com/maps?...&output=embed` を使用。
  **本番は公式 Google Maps Embed API（要APIキー）に差し替え予定。**

---

## 6. タイプ別の標準レイアウト（出力テンプレ）

同じブロック群を、タイプごとに既定の順序で組む。

### 6-1. 旅程（itinerary）
`Hero（フルブリード）` → `editorsNote` → `集約マップ＋スポット概観` →
`旅程タイムライン（order/time/transfer 付き place）` → `サマリー（合計時間/予算/距離）` →
`著者カード` → `関連記事` → `日付フッター`

### 6-2. 場所紹介（standard / place-guide）
`Hero` → `導入(paragraph)` → `場所紹介（リッチな place の連なり・順不同）` →
`ピン集約マップ` → `縦並び場所リスト（各 place に Google Map リンク）` →
`著者カード` → `関連記事` → `日付フッター`

### 6-3. 読み物（standard / essay）
`Hero` → `本文（paragraph / image / video / quote / callout / divider の自由な連なり）` →
`著者カード` → `関連記事` → `日付フッター`
※ `place` ブロック・地図は持たない。

---

## 7. メタ（全記事共通・末尾）

- 著者: 名前＋在住地（＋肩書き程度）。**「文・写真：◯◯」式のクレジットは出さない。**
- 公開日 / 最終更新日: **記事末尾のフッター帯**に小さく（ヒーローには出さない）。
- 関連記事。

---

## 8. “失敗しない”仕組み（まとめ）

1. 自由HTMLを書かせない。**ブロックの積み上げ**のみ。
2. 場所・旅程は**構造化ブロック（フォーム入力）** → レイアウト崩れが起きない。
3. 「コツ・注意」は**専用 callout ブロック** → 常に同じ体裁。
4. 地図は `place.location` から**自動生成** → 手作業の埋め込みミスが無い。
5. ヒーロー・タイポ・配色はテンプレ側が担保 → 書き手はコンテンツに集中。

---

## 9. 未決事項（今後の検討）

- `standard` 内のサブタイプ（place-guide / essay）をエディタ上で明示選択させるか、
  ブロック構成から自動判定するか。
- 動画ブロックのアップロード/外部埋め込みの優先順位。
- `GeoRef` の本番実装（Place ID 取得 UX / Embed API キー管理）。
- 写真の濃淡（全 place に写真必須にしない＝テキストのみ place を許容するか）。
