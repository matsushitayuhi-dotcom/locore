# クリエイターランク / 非居住者ライター対応の方針メモ

「クリエイターランクと価格上限」を撤廃したので、関連するスキーマと運用方針を
整理しておく。実装は段階的に。

## 方針変更（2026-05）

旧:
- writer の tier (S/A/B) によって記事の**価格上限**が変わる（S=¥5,000、A=¥3,000、B=¥1,000）
- tier は手動で運用が付与

新:
- **価格上限は廃止**。全 writer が全価格帯を選べる
- tier の差は「**手数料率の差**」で扱う
- tier は**販売実績によって自動で変動**するように
- writer 認証バッジ（居住認証済み）を別軸で持つ

## クリエイターランク (tier) の意味付け

現状の `writer_profiles.tier` enum は `'S' | 'A' | 'B'`。これを以下に再定義。

| tier | 名称（案） | 手数料率 | 昇格条件 |
|---|---|---|---|
| `S` | プロ | 15% | 累計 50 件以上の販売 + 月間 ¥30,000 以上の売上 |
| `A` | 認定 | 20% | 累計 10 件以上の販売 |
| `B` | 入門 | 25% | 全 writer のデフォルト |
| `founder` | Founders | 10% 永久 | 立ち上げ期 50 人限定 |

実装に必要なもの:

1. **手数料率カラム**を `writer_profiles` に追加（または tier ごとのレートを定数化）
   ```sql
   ALTER TABLE writer_profiles
     ADD COLUMN commission_rate_pct integer NOT NULL DEFAULT 25;
   ```
2. **販売実績の集計**を月次バッチで（`purchases` テーブルから）
3. tier 自動昇格の Server Action / cron

## 居住認証バッジ (verification_badge)

「実際にその街に 1 年以上住んでいる」を確認した writer に付ける別ラベル。
ランクとは独立。

すでに `residency_verifications` テーブルがある（`packages/db/src/schema/residency_verifications.ts`）。
これを活用:
- writer 登録時は **居住していなくても OK**（旅行者・過去居住者）
- 居住認証を申請して通れば badge が付く
- 認証バッジが付いた writer の記事には UI 上で「居住認証 ✓」マーク

### バッジ UI 案

| バッジ | 意味 | 表示 |
|---|---|---|
| 🏠 **居住認証** | 1 年以上の居住確認済み | terra 色のバッジ、記事カードと writer プロフィールに |
| ⭐ **Founders** | 立ち上げメンバー | 永久バッジ、紫色 |
| 📍 **過去居住者** | 過去にその街に住んでいた | 控えめなグレーバッジ（任意自己申告） |

`packages/ui/src/components/locore/ResidencyBadge.tsx` を拡張するか、新規 `WriterBadges.tsx` を作る。

## 非居住者 writer の受け入れ

要件:
- 旅行者 / 過去居住者でも writer 登録できる
- 認証バッジは付かない
- 記事は普通に書ける + 販売できる
- ただし「居住認証あり」の記事との表示差をつける（バッジで区別）

### 現状の課題

`writer_profiles.residency_years` カラムが必須っぽくなっている。
- 0 を許容できるか確認
- `residency_status` enum (`current_resident` | `past_resident` | `traveler`) を追加？
- writer signup フロー（`/become-writer`）で「居住状況」を選ばせる

### 実装ステップ案

1. `writer_profiles` に `residency_status` カラム追加（`current_resident` | `past_resident` | `traveler`）
2. `/become-writer` フローで自己申告
3. `current_resident` を選んだら residency_verifications の申請に進める
4. `past_resident` / `traveler` はそのまま登録完了（バッジなし writer）
5. 記事カード / プロフィールでバッジを出し分け
6. `/about-service` の文言にも反映（「現地民の本物だけ」→「現地に住んでいた人 / 訪れた人も歓迎」）

## /about-service の文言調整が必要

現在は「**現地に住む人だけ書ける記事**」を推している。新方針だと:

- 「現地に**住んでいる / 住んでいた / これから住む** 人が書ける」に広げる
- ただし「現地民の本物」という編集価値を保つために、認証バッジで差別化
- 旅行者 writer は「**ビジター視点** の記事」として価値を持たせる（リスト旅行記とは別軸の有料記事）

## 段階的実装プラン

### Phase 1 (即やる、コード変更小)
- ✅ `TIER_PRICE_CAPS` 削除（完了）
- 手数料率を tier 別の定数として apps/web の lib に置く
- writer ダッシュボードに「あなたの手数料率は X%」表示

### Phase 2 (中規模)
- migration: `writer_profiles.residency_status` 追加
- migration: `writer_profiles.commission_rate_pct` 追加 + デフォルト値
- `/become-writer` を「居住状況選択」と「居住認証申請（任意）」の 2 ステップに分割
- 記事カードに居住認証バッジ表示
- /about-service の文言更新

### Phase 3 (cron + 自動昇格)
- 月次バッチで販売実績を集計
- 閾値超えで tier を自動昇格
- 通知メール

### Phase 4 (Founders)
- founding_applications との連携で `tier='founder'` を付与
- 永久 10% レートの enforce

## 参考ファイル

- `packages/db/src/schema/writer_profiles.ts`
- `packages/db/src/schema/residency_verifications.ts`
- `packages/db/src/schema/founding_applications.ts`
- `packages/ui/src/components/locore/ResidencyBadge.tsx`
- `apps/web/app/writer/articles/[id]/edit/components/BasicInfoSection.tsx` （上限削除済）
- `apps/web/app/become-writer/` （フロー要見直し）

優先度高い順で着手するならフェーズ 1 → 2 →（4 と並行で）3、です。
