/**
 * Locore Founders Deck — デザイントークン
 *
 * スライドは「縦 9:16 のカード」を 1 枚 = 1 スライドとして扱う。
 * モバイル（Instagram Stories 寸法）でそのままシェアできる前提。
 *
 * 既存サイトの Editorial Light パレットを継承しつつ、スライド向けに
 * 「より落ち着いた色」「より大きなコントラスト比」「印刷でも飛ばない値」
 * に微調整してある。
 *
 * 利用例:
 *   import { DECK } from '@/lib/deck/tokens';
 *   style={{ backgroundColor: DECK.color.cream }}
 */

export const DECK = {
  /** スライド基本サイズ（px）。9:16 比 */
  size: {
    width: 1080,
    height: 1920,
    aspectRatio: '9 / 16',
  },

  /** 配色 */
  color: {
    /** 標準の紙色。背景に使う */
    cream: '#FAF5EB',
    /** やや暗いクリーム。セクション区切り背景に */
    creamDeep: '#F3E9D2',
    /** メインのブランドカラー = terra-cotta */
    terracotta: '#B5453A',
    /** terra-cotta のホバー / 強調用に少し明るく */
    terracottaSoft: '#D26954',
    /** 暖色のアンバー。サブアクセント */
    amber: '#E58D3B',
    /** ベージュ。控えめなアクセント */
    sand: '#E8D9C2',
    /** メインのテキスト色 = ディープネイビー */
    ink: '#1B2330',
    /** 補助テキスト */
    inkMuted: '#5C6470',
    /** さらに薄いキャプション色 */
    inkSubtle: '#9098A1',
    /** 印章 / 引用などの暗めのアクセント */
    coffee: '#7A4A33',
  },

  /** タイポグラフィスケール（モバイル 9:16 を基準に逆算） */
  font: {
    serif: 'var(--font-serif-jp), var(--font-serif), "Times New Roman", serif',
    sans: 'var(--font-sans), -apple-system, "Helvetica Neue", "Hiragino Sans", "Yu Gothic", sans-serif',
    mono: 'var(--font-mono), "JetBrains Mono", "Menlo", monospace',
  },

  /** 文字サイズ（rem 換算ではなく、スライド内 absolute px） */
  fontSize: {
    /** ヒーロータイトル */
    display: '88px',
    /** 章タイトル */
    h1: '64px',
    /** ヘッドライン */
    h2: '48px',
    /** サブヘッドライン */
    h3: '32px',
    /** 本文 */
    body: '22px',
    /** 引用文・キャプション */
    quote: '36px',
    /** 数字（巨大） */
    statBig: '180px',
    /** ラベル / アイブロウ */
    kicker: '14px',
    /** フッター・脚注 */
    foot: '14px',
  },

  /** 余白スケール（px） */
  space: {
    /** スライドの内側パディング */
    pad: 80,
    /** セクション間のギャップ */
    section: 56,
    /** 要素間 */
    gap: 24,
    /** 細かい要素間 */
    inline: 12,
  },

  /** トラッキング（letter-spacing） */
  tracking: {
    kicker: '0.22em',
    tight: '-0.015em',
    normal: '0',
  },

  /** 線の太さ */
  border: {
    thin: '1px',
    medium: '2px',
    thick: '4px',
  },

  /** 角丸 */
  radius: {
    chip: '999px',
    card: '20px',
    none: '0',
  },
} as const;

export type DeckTokens = typeof DECK;
