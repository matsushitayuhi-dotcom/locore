# @locore/ui

Locore のデザインシステム — shadcn/ui ベースの Tailwind preset と共通コンポーネント。

設計判断は [`DESIGN.md`](../../DESIGN.md)（v0.1）と [`ARCHITECTURE-DECISIONS.md` §6](../../ARCHITECTURE-DECISIONS.md) を真実の源とする。Phase 1 は **Light モードのみ**。Dark モードは Phase 2 で検討。

## 設計原則（要点）

- **Quiet Premium / Editorial First / Map as Stage** — 紙とインクを思わせるオフホワイト基調、控えめなシャドウ、ボーダーで構造を表現
- カバー画像は **3:2**（DESIGN.md §1.3、Instagram 的な 16:9 や正方形は使わない）
- 角丸は控えめ（カード `8px`）、Apple/Stripe 風の 16〜24px は使わない
- 評価軸は「ローカル度」が先、「満足度」が後

## インストール

モノレポ内で利用する場合：

```jsonc
// apps/web/package.json
{
  "dependencies": {
    "@locore/ui": "workspace:*"
  }
}
```

## セットアップ（apps/web 側）

### 1. CSS 変数を読み込む

```ts
// apps/web/src/app/layout.tsx
import "@locore/ui/styles.css";
```

このファイルは `@tailwind base/components/utilities` と `:root` のトークン CSS 変数を含む。

### 2. Tailwind preset を適用する

```ts
// apps/web/tailwind.config.ts
import type { Config } from "tailwindcss";
import locorePreset from "@locore/ui/tailwind-preset";

export default {
  presets: [locorePreset],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/dist/**/*.js",
  ],
} satisfies Config;
```

`content` に `packages/ui/dist/**/*.js` を入れることで、UI パッケージ側で使われた Tailwind クラスもアプリのビルドに含まれる。

### 3. フォントを読み込む

`next/font` で Noto Sans JP / Noto Serif JP / Inter / Fraunces / JetBrains Mono を読み込み、`<html>` の `className` に CSS 変数を渡す（`--font-sans-jp` 等）。トークン CSS 側で `font-family: var(--font-sans-jp)` 等を参照しているので、変数が解決されればそのまま動く。

## 使用例

```tsx
import {
  ArticleCard,
  Button,
  Card,
  CardContent,
  LocalScoreBar,
  PriceTag,
  ResidencyBadge,
  SatisfactionStars,
} from "@locore/ui";

export function Demo() {
  return (
    <div className="bg-background min-h-screen p-6">
      <ArticleCard
        article={{
          id: "art_001",
          title: "マレ地区で観光客がいない3軒",
          coverImageUrl: "/fixtures/marais.jpg",
          area: "パリ・マレ",
          author: { name: "Junko", tier: "S", residencyYears: 8 },
          localScore: 65,
          satisfactionStars: 4.7,
          reviewCount: 41,
          priceJpy: 800,
          durationType: "half-day",
          spotsCount: 5,
        }}
        onAddToTrip={(a) => console.log("add", a.id)}
        onBookmark={(a) => console.log("bookmark", a.id)}
      />
    </div>
  );
}
```

## コンポーネント一覧

### Primitives（shadcn/ui ベース）

| Name | Notes |
| --- | --- |
| `Button` | variants: `primary` / `secondary` / `ghost` / `destructive` / `outline` / `link`、sizes: `sm` / `md` / `lg` / `icon`、`asChild` で `<Slot>` 委譲 |
| `Card` / `CardHeader` / `CardTitle` / `CardDescription` / `CardContent` / `CardFooter` | 控えめなボーダー + `shadow-xs` |
| `Badge` | variants: `default` / `secondary` / `accent` / `warning` / `outline` |
| `Input` | フォーカス時 2px primary ボーダー、`error` プロパティで danger 表示 |
| `Slider` | Radix Slider ベース、Locore トークン適用 |
| `Avatar` / `AvatarImage` / `AvatarFallback` | sizes: `xs` / `sm` / `md` / `lg` / `xl`、`getInitials()` ヘルパ付属 |

### Locore 固有コンポーネント

| Name | Props（要点） |
| --- | --- |
| `LocalScoreBar` | `value: 0-100`、`showLabel?`、`size: sm/md/lg`。値に応じて moss / dusty purple / terracotta に色変化（DESIGN.md §7.6） |
| `ResidencyBadge` | `tier: 'S' \| 'A' \| 'B'`、`years?`、`iconOnly?`。Tier S は最も目立ち、Tier B は控えめ（DESIGN.md §7.5） |
| `CreatorBadge` | `type: 'verified' \| 'founding'` |
| `ArticleCard` | `article: ArticleCardModel` を受け取り、3:2 カバー / タイトル / 著者行 / ローカル度 / 価格 + アクション行を一体表示。ホバー時に画像 `scale(1.02)` と `shadow-sm` 演出（DESIGN.md §3.2） |
| `PriceTag` | `amount`、`size`、`suffix?`。`¥1,234` 表記、`tabular-nums` 適用 |
| `SatisfactionStars` | `rating: 0-5`、`count?`、`size`、`showStars?`。フィル色は `warning-500` |

### トークン（TS から HEX を取得したい時）

```ts
import { colors, neutral, primary, local, localScoreColor } from "@locore/ui";
import * as tokens from "@locore/ui/tokens";

console.log(neutral[25]);            // "#FAF8F5"
console.log(localScoreColor(72));    // "#5E7548" (moss)
```

### アイコン

```ts
import { MapPin, BadgeCheck } from "@locore/ui/icons";
```

`lucide-react` の curated 再エクスポート。任意のアイコンが必要なら `lucide-react` から直接 import してよい。

## デザイントークン構成

トークンは 3 層で定義されている：

1. **CSS Variables** (`src/styles/globals.css`) — `--color-primary-700` 等の `:root` 定義
2. **Tailwind preset** (`src/tailwind-preset.ts`) — Tailwind の `theme.extend` から CSS 変数を参照
3. **TypeScript constants** (`src/tokens/*.ts`) — JS から型安全な HEX 値アクセス（SVG `fill`、canvas、Google Maps スタイルなどに）

3 層は同一値で同期している。値を変更する場合は **3 ファイル全てを更新する**こと。

## 開発

```bash
cd packages/ui
pnpm install          # 依存解決
pnpm build            # tsup で ESM 出力 (dist/)
pnpm dev              # tsup --watch
pnpm typecheck        # tsc --noEmit
```

## ライセンス

Internal — Locore 専用。
