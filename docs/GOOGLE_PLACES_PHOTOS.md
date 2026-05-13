# Google Places のスポット写真設定ガイド

「スポットの写真を Google マップから引っ張ってこれないか」というよくある要望に対する、現状とセットアップ手順のメモ。

## 結論：すでに動きます

Locore は既に **Google Places JavaScript API の Place Photos** に対応していて、
ライターがスポットを Google から検索すると、その場所の写真を最大 3 枚まで自動で
取得・保存します。データベース上は `spots.google_photo_urls` カラムに URL 配列として
保存されています。

実装ファイル:
- `apps/web/components/writer/SpotPlacesPicker.tsx` — 検索 + 写真抽出
- `apps/web/components/writer/SpotEditor.tsx` — 写真 URL のスポットへの紐付け
- `apps/web/components/SpotsCardList.tsx` — 公開ページでの表示

## なぜ既存サンプル記事には写真がないか

サンプル記事（migration 0026 / 0027 で投入されたもの）は、スポットの `google_place_id`
が NULL で挿入されています。なので Places API には繋がっていないため写真もありません。

写真を出すには、**ライター（または編集者）が** スポット編集画面から
「Google Maps で検索」ボタンを使い、該当する Place を選ぶ必要があります。

## セットアップ手順

### 1. Google Cloud Console で API を有効化

[Google Cloud Console](https://console.cloud.google.com/) で:

1. プロジェクトを作る（or 既存のプロジェクトを選ぶ）
2. **API & Services → Library** で次の 4 つを **Enable**:
   - `Maps JavaScript API` — マップ描画
   - `Places API`（新版でも legacy でも可） — テキスト検索 + Place Details
   - `Geocoding API` — 住所 → 緯度経度（任意）
   - `Routes API` または `Directions API` — ルーティング（旅程記事で使う場合）
3. **Credentials → Create credentials → API key** で API キーを発行

### 2. API キーの制限を必ずかける

無制限のキーは事故の元です。**HTTP referrer 制限**を入れます:

`API key → Application restrictions → HTTP referrers`

許可するドメイン:
```
https://locore.app/*
https://*.vercel.app/*
http://localhost:3000/*
```

`API restrictions` で、上で有効化した 4 つの API のみに絞ります。

### 3. 環境変数の設定

Vercel ダッシュボードで:

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
```

ローカル開発時は `apps/web/.env.local` にも同じものを置きます。

> Note: `NEXT_PUBLIC_` プレフィックスのため、このキーはクライアントに露出します。
> 上記の HTTP referrer 制限を必ず入れて、自社ドメインからしか叩けないようにしてください。

### 4. 課金設定

Google Maps Platform は月 $200 までは無料枠です。Locore のプロト段階では
ほぼ収まる見込みですが、Cloud Console で Billing → Budget alerts を必ず設定:

```
$10 / $50 / $100 / $200 の 4 段階で通知
```

参考料金（2025 年時点）:
- Maps JavaScript API（地図ロード）: $7 / 1,000 ロード
- Places API Place Details: $17 / 1,000 リクエスト
- Place Photo: $7 / 1,000 リクエスト

スポット 1 個追加で 1 Place Details + 1 Photo を消費 ≒ $0.024。

## ライターの操作フロー（写真を出す手順）

1. `/writer/articles/new` で記事を作る、または既存記事を編集
2. **Spots セクション** → 「+ スポットを追加」
3. 検索ボックスに店名や住所を入れる
4. Google のオートコンプリート候補が出るので、該当のものをクリック
5. 自動で取得される項目:
   - 正式名称（formatted_address）
   - 緯度・経度
   - 営業時間（weekday_text）
   - 電話番号、ウェブサイト
   - Google レーティング、価格レベル
   - **写真 URL 最大 3 枚**（ランドスケープ優先）
6. 保存すると、公開ページのスポットカードでサムネが出る

## 既存サンプル記事に後付けで写真を入れる

`spots.google_place_id` を埋めると、写真も自動で出るようになります。
やり方は 2 つ:

### A. 1 つずつ手で（プロト向け）

1. ライターアカウントで対象記事の編集画面を開く
2. 各スポットを「Google Maps で検索」して再選択
3. 保存

### B. バッチで（運用フェーズ）

`apps/api` に `scripts/backfill-place-photos.ts` のような Node スクリプトを置いて:

```ts
// 疑似コード
for (const spot of spotsWithoutPlaceId) {
  const candidates = await placesTextSearch(`${spot.name} ${spot.address}`);
  const placeId = candidates[0]?.place_id;
  if (!placeId) continue;
  const details = await placeDetails(placeId, ['photos', 'opening_hours', ...]);
  const photoUrls = details.photos.slice(0, 3).map((p) =>
    `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${p.photo_reference}&key=${KEY}`
  );
  await db.update(spots).set({
    googlePlaceId: placeId,
    googlePhotoUrls: photoUrls,
    // 他のフィールドも上書き
  }).where(eq(spots.id, spot.id));
}
```

Server-to-server なので別の API キーを使うこと（クライアント側キーと混ぜない）。

## 注意点

1. **Attribution**: Google の利用規約上、写真には「Photo: Google」などの
   クレジット表示が必要。SpotsCardList の写真サムネ近くに小さく出すこと。
2. **URL 期限**: `getUrl()` で返ってくる URL は無期限ではなく、長期保存は
   推奨されない。次フェーズで自社の R2 / Supabase Storage にコピーする
   想定で設計しておく。
3. **「Photo Reference」 vs 「Photo URL」**: 古い API は `photo_reference`、
   新 API は HTTP URL を直接返す。SpotPlacesPicker は JS SDK の `getUrl()`
   経由なので両対応されている。
4. **画像最適化**: 取得した URL は `images.unsplash.com` と違い `images.googleapis.com`
   になる。Next.js の `next.config.mjs` に hostname を追加することがある:
   ```ts
   remotePatterns: [
     { protocol: 'https', hostname: 'maps.googleapis.com' },
     { protocol: 'https', hostname: 'lh3.googleusercontent.com' }, // 新 API はこっち
   ]
   ```

## 関連環境変数まとめ

| 名前                                 | 用途                                 | 場所                |
| ------------------------------------ | ------------------------------------ | ------------------- |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`    | クライアント側マップ + Places JS     | Vercel + .env.local |
| `GOOGLE_MAPS_API_KEY_SERVER`（仮）   | バッチ backfill 用、HTTP refer 不可  | Vercel のみ         |

server-side キーは「IP 制限」または「使われる Cloud Run / Function のサービスアカウントに限定」する設定にしてください。
