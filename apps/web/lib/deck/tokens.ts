/**
 * Locore Founders Deck — デザイントークン (A4 縦 / PDF 前提版)
 *
 * 1 スライド = 1 ページ = A4 縦（210×297mm / 1:1.414）。
 * 150dpi 換算で 1240×1748px。print CSS で実際に A4 用紙にも 1 ページ
 * 1 スライドで載るようにしてある。
 *
 * 9:16 縦長 (Instagram Stories) から A4 縦に切り替えた理由:
 *   - PDF として配布したいときに A4 が世界標準
 *   - 9:16 は左右が狭すぎて 1 段組テキストが詰まって見えた
 *   - A4 はそれでもモバイル縦でちゃんと読める（少しだけ細長くなるだけ）
 *
 * 余白は「ページ全体の 10%」を基準に大きめに取り、読み手に
 * "ページの中で文字が泳げる" 感を出している。
 */

export const DECK = {
  /** スライド基本サイズ — A4 portrait at 150dpi */
  size: {
    width: 1240,
    height: 1748,
    /** CSS aspect-ratio で使う。プリント時の 1 ページサイズと一致 */
    aspectRatio: '1 / 1.414',
    /** print CSS の @page で使う実寸 */
    printWidthMm: 210,
    printHeightMm: 297,
  },

  /** 配色 (前バージョンから据え置き) */
  color: {
    cream: '#FAF5EB',
    creamDeep: '#F3E9D2',
    terracotta: '#B5453A',
    terracottaSoft: '#D26954',
    amber: '#E58D3B',
    sand: '#E8D9C2',
    ink: '#1B2330',
    inkMuted: '#5C6470',
    inkSubtle: '#9098A1',
    coffee: '#7A4A33',
  },

  /** タイポグラフィ */
  font: {
    /* "serif" は名前のみ残し、実値は sans-serif スタックに統一 (明朝撤去後) */
    serif: 'var(--font-sans-jp), system-ui, -apple-system, "Segoe UI", "Helvetica Neue", "Hiragino Sans", "Yu Gothic", sans-serif',
    sans: 'var(--font-sans), system-ui, -apple-system, "Helvetica Neue", "Hiragino Sans", "Yu Gothic", sans-serif',
    mono: 'var(--font-mono), "JetBrains Mono", "Menlo", monospace',
  },

  /**
   * フォントサイズ (1240px 幅 = A4 width 想定の絶対 px)
   * A4 で 8〜10 行収まる程度に調整
   */
  fontSize: {
    /** ヒーロータイトル */
    display: '92px',
    /** 章タイトル */
    h1: '64px',
    /** ヘッドライン */
    h2: '46px',
    /** サブヘッドライン */
    h3: '30px',
    /** 本文 */
    body: '22px',
    /** 引用文 */
    quote: '38px',
    /** 数字 (巨大) */
    statBig: '220px',
    /** ラベル / アイブロウ */
    kicker: '15px',
    /** フッター・脚注 */
    foot: '13px',
  },

  /**
   * 余白スケール
   * 「ギチギチ」防止のため前バージョンから大幅増。
   * pad は 1240px 幅の 10% 弱 (= 120px) を取って、文字の左右に十分な余白を確保。
   */
  space: {
    /** スライドの内側パディング */
    pad: 120,
    /** セクション間 (ヒーロー要素ブロック同士の間) */
    section: 72,
    /** 要素間 */
    gap: 32,
    /** 細かい要素間 */
    inline: 14,
  },

  tracking: {
    kicker: '0.22em',
    tight: '-0.015em',
    normal: '0',
  },

  border: {
    thin: '1px',
    medium: '2px',
    thick: '4px',
  },

  radius: {
    chip: '999px',
    card: '20px',
    none: '0',
  },
} as const;

export type DeckTokens = typeof DECK;
