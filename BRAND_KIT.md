# Locore Brand Kit

資料作り (Keynote / Google Slides / PowerPoint / Figma / Canva / 印刷物) 用のブランドキット。
ソースは `apps/web/app/globals.css` + `packages/ui/src/tailwind-preset.ts` から抽出。
コードを変更したらこのドキュメントも更新してください。

---

## 1. ブランドの核

**ブランド名**: Locore (ロコレ / ロコア)
**パレット名**: Editorial Light
**コンセプト**: 紙の雑誌の落ち着いた地色 (クリーム) に、現地の土・暖かさを表す
**テラコッタ**を効かせる。日本の伝統色「弁柄 (べんがら)」「朱華 (はねず)」と
ヨーロッパ南部の土壁の色の中間。

---

## 2. カラーパレット

### 2.1 メインカラー (3 色だけ覚えればよい)

| 役割 | 名前 | HEX | RGB | 用途 |
|---|---|---|---|---|
| **Primary / シグネチャー** | テラコッタ | **`#D4634A`** | 212, 99, 74 | ロゴ、CTA ボタン、リンク、見出しの差し色 |
| **Background** | クリーム | **`#FAFAF7`** | 250, 250, 247 | ページ背景、紙の地色 |
| **Foreground** | インク | **`#18181B`** | 24, 24, 27 | 本文・見出し文字色 |

スライドで「3 色だけ使う」ならこの 3 つ。

### 2.2 Primary スケール (テラコッタ系)

| トークン | HEX | 用途の目安 |
|---|---|---|
| `primary-50` | `#FAF1ED` | Tint 背景 (バッジ薄塗り) |
| `primary-100` | `#F4DACE` | カードの薄ハイライト |
| `primary-200` | `#EBC0AD` | 装飾アクセント |
| `primary-300` | `#DD9477` | サブ CTA、リンクホバー |
| **`primary-500`** | **`#D4634A`** | **メイン CTA、ロゴ** |
| `primary-700` | `#A84A35` | 強調見出し、シリアスな状態 |
| `primary-900` | `#6E2F1F` | 落ち着いた強調、フッターロゴ |

### 2.3 Accent (深いテラレッド、ハート・保存などのインタラクション色)

| トークン | HEX | 用途 |
|---|---|---|
| `accent-50` | `#FCE5DC` | お気に入り済みの薄塗り |
| `accent-300` | `#DB8467` | サブアクセント |
| **`accent-500`** | **`#C84A2C`** | **ハート (いいね)、ブックマーク** |
| `accent-700` | `#903019` | プレス時、フォーカス |

### 2.4 Secondary (信頼・情報系の深いブルー)

「お知らせ」「公式情報」「行政」系のセクションに限定使用。

| トークン | HEX | 用途 |
|---|---|---|
| `secondary-50` | `#DCEAF5` | 情報トースト背景 |
| `secondary-300` | `#6BA1C9` | 装飾ラベル |
| **`secondary-500`** | **`#2C7EB4`** | 行政・公式系の見出し色 |
| `secondary-700` | `#1C5384` | 同上、深め |

### 2.5 Neutral (グレースケール、本文・罫線・枠)

| トークン | HEX | 用途 |
|---|---|---|
| `neutral-0` | `#FFFFFF` | 白 (純色) |
| `neutral-25` | `#FAFAF7` | **背景クリーム (= bg)** |
| `neutral-50` | `#F4F2EC` | カードの控えめ背景 (muted surface) |
| `neutral-100` | `#E7E5E0` | **罫線 / divider** |
| `neutral-200` | `#C9C5BB` | 強めの罫線 |
| `neutral-300` | `#A5A09A` | プレースホルダー、無効文字 |
| `neutral-400` | `#837F78` | サブテキスト弱 |
| `neutral-500` | `#71717A` | サブテキスト |
| `neutral-700` | `#3F3F46` | 強めの本文 |
| `neutral-900` | `#18181B` | **インク (= fg、本文)** |
| `neutral-950` | `#0E0E0F` | ヘアラインの最濃部 |

### 2.6 State カラー (UI 状態通知)

| 状態 | 50 | 500 | 700 | 用途 |
|---|---|---|---|---|
| Success | `#DCFCE7` | **`#15803D`** | — | 完了、承認、公開済み |
| Warning | `#FEF3C7` | **`#D97706`** | `#92400E` | 注意、要確認 |
| Danger | `#FEE2E2` | **`#DC2626`** | — | エラー、削除、却下 |
| Info | `#DBEAFE` | **`#2563EB`** | — | 一般お知らせ |

### 2.7 Locore 固有: Local スコア (記事のローカル度)

記事の信頼度バッジに使う 3 色:

| トークン | HEX | 意味 |
|---|---|---|
| `local-high` | `#D4634A` | 完全にローカル (現地民しか知らない) |
| `local-mid` | `#DD9477` | 中間 (一部観光客にも知られる) |
| `local-low` | `#C9C5BB` | 観光地寄り |

---

## 3. フォント

### 3.1 役割別

| 役割 | フォント | 入手先 | 備考 |
|---|---|---|---|
| **日本語見出し** (h1-h6) | **Noto Serif JP** | [Google Fonts](https://fonts.google.com/specimen/Noto+Serif+JP) | Weight: 400 / 500 / 600 / 700 |
| **日本語本文** | **Noto Sans JP** | [Google Fonts](https://fonts.google.com/specimen/Noto+Sans+JP) | Weight: 400 / 500 / 700 |
| Latin 文字本文 | Inter Tight (or Inter) | [Google Fonts](https://fonts.google.com/specimen/Inter+Tight) | サイズ感を Japanese と揃えやすい |
| 等幅 (コード・数字) | SF Mono / Consolas | システム / Apple | フォールバックで対応 |

### 3.2 推奨ペアリング (資料作成時)

- **タイトル / 見出し**: Noto Serif JP (Bold 700) — 字間 -0.01em
- **サブタイトル / 本文**: Noto Sans JP (Regular 400) — 行間 1.85
- **数字 / 西欧名**: Inter Tight (Medium 500)

### 3.3 フォールバック (Web)

```
sans-jp:  Noto Sans JP → Hiragino Sans → Yu Gothic Medium → Yu Gothic → メイリオ
serif-jp: Noto Serif JP → Hiragino Mincho ProN → Yu Mincho → serif
sans:     Inter Tight → Inter → Helvetica Neue → Helvetica → system-ui
mono:     SF Mono → SFMono-Regular → Consolas → Liberation Mono
```

### 3.4 設定値 (Web 上)

- `font-feature-settings: 'palt' 1` (プロポーショナル詰め)
- `letter-spacing: 0.005em` (本文)
- `letter-spacing: -0.01em` (見出し)
- `-webkit-font-smoothing: antialiased`

---

## 4. 形状 (radius / shadow)

### 4.1 角丸

| トークン | サイズ | 用途 |
|---|---|---|
| `radius-xs` | 6px | チップ、ボタン |
| `radius-sm` | 8px | 入力欄、小さなカード |
| `radius-md` | 12px | カード、モーダル |
| `radius-lg` | 16px | ヒーロー、大カード |
| `radius-xl` | 24px | ランディング系のヒーロー |
| `radius-full` | 9999px | ピル形ボタン、アバター |

### 4.2 影

| トークン | CSS |
|---|---|
| `shadow-xs` | `0 1px 2px rgba(24, 24, 27, 0.04)` |
| `shadow-sm` | `0 2px 6px rgba(24, 24, 27, 0.06)` |
| `shadow-md` | `0 6px 16px rgba(24, 24, 27, 0.08)` |
| `shadow-lg` | `0 16px 32px rgba(24, 24, 27, 0.12)` |

紙の上に置いた感じの軽い影。`24, 24, 27` はインク色 (`neutral-900`) を起点。

---

## 5. 資料作成時の指針

### 5.1 「Locore らしさ」を 1 枚で出すなら

- 背景はクリーム (`#FAFAF7`)、本文インク (`#18181B`)
- アクセントはテラコッタ (`#D4634A`) を **1 枚に 1 箇所** だけ
- 見出しは **Noto Serif JP Bold**、本文は **Noto Sans JP**
- 角丸は 12-16px、影はほぼ無し or `shadow-sm`
- 区切り罫線は `#E7E5E0` の薄いライン

### 5.2 NG パターン

- ❌ 純白背景 (`#FFFFFF`) — 紙感が出ない、クリームを使う
- ❌ 黒文字 (`#000000`) — 強すぎる、インク (`#18181B`) を使う
- ❌ テラコッタの大面積塗り — 1 枚に 1 アクセント
- ❌ ゴシック体の見出し — 紙の雑誌感を壊す
- ❌ 影が強い (Material Design 的) — 平面的に保つ

### 5.3 印刷時の CMYK 近似

(Web HEX を CMYK にざっくり)

| 色 | HEX | CMYK 近似 |
|---|---|---|
| テラコッタ | `#D4634A` | C: 7 / M: 71 / Y: 75 / K: 0 |
| クリーム | `#FAFAF7` | C: 1 / M: 1 / Y: 3 / K: 0 |
| インク | `#18181B` | C: 70 / M: 65 / Y: 60 / K: 75 |
| 深いテラレッド | `#C84A2C` | C: 12 / M: 81 / Y: 88 / K: 2 |

印刷物は実物のプリンタプロファイルで再計算してください。

---

## 6. ロゴ・アイコン

- ロゴワードマーク: `apps/web/public/` 配下の `locore-logo*.svg` (リポジトリ参照)
- アイコンセット: [lucide-react](https://lucide.dev/) — ストロークの細い、紙の細字風アイコン
- ロゴカラーは **テラコッタ (`#D4634A`)** が基本、暗背景では `#FAFAF7`

---

## 7. クイック参照 (コピペ用)

### CSS / Tailwind config

```css
:root {
  /* Core */
  --terracotta: #D4634A;
  --cream:      #FAFAF7;
  --ink:        #18181B;

  /* Accent */
  --terra-red:  #C84A2C;

  /* Borders */
  --border:     #E7E5E0;
}
```

### Google Fonts インポート

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@400;500;600;700&family=Inter+Tight:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Figma / Sketch 用カラー名

```
Locore/Terracotta    #D4634A
Locore/Cream         #FAFAF7
Locore/Ink           #18181B
Locore/Terra-Red     #C84A2C
Locore/Border        #E7E5E0
```

---

最終更新: 2026-05-19
ソース: `apps/web/app/globals.css`, `packages/ui/src/tailwind-preset.ts`
