import type { ReactNode, CSSProperties } from 'react';
import { DECK } from '@/lib/deck/tokens';

/**
 * Founders Deck の 1 スライドを描く固定アスペクト比のフレーム。
 *
 * - 9:16 縦長で固定（Instagram Stories と同サイズ）
 * - 親要素の幅に追従し、高さは aspect-ratio で自動算出
 * - 内部のテキスト/レイアウトは「1080×1920 の絶対座標を 100% にスケール」
 *   する設計ではなく、CSS 単位（px）をそのまま使う簡易版
 *   → 親要素の幅を変えると、文字が拡縮される（Card-in-Card 表示でも OK）
 *
 * variant:
 *   - "cream"   通常背景（クリーム）
 *   - "ink"     反転（ネイビー背景、白文字）
 *   - "stamp"   terra-cotta 単色（ヒーロー）
 */

type Props = {
  variant?: 'cream' | 'ink' | 'stamp';
  /** ページ番号（フッター右下に小さく出す） */
  pageNumber?: number;
  /** 章番号などをフッター左下に */
  pageLabel?: string;
  /** 内側の余白を上書きしたいとき */
  padding?: number;
  /** 中央寄せ垂直配置にする (default true) */
  center?: boolean;
  children: ReactNode;
};

export function SlideFrame({
  variant = 'cream',
  pageNumber,
  pageLabel,
  padding = DECK.space.pad,
  center = true,
  children,
}: Props) {
  const palette = (() => {
    switch (variant) {
      case 'ink':
        return {
          bg: DECK.color.ink,
          fg: DECK.color.cream,
          fgMuted: 'rgba(250, 245, 235, 0.65)',
          accent: DECK.color.terracottaSoft,
        };
      case 'stamp':
        return {
          bg: DECK.color.terracotta,
          fg: DECK.color.cream,
          fgMuted: 'rgba(250, 245, 235, 0.75)',
          accent: DECK.color.cream,
        };
      default:
        return {
          bg: DECK.color.cream,
          fg: DECK.color.ink,
          fgMuted: DECK.color.inkMuted,
          accent: DECK.color.terracotta,
        };
    }
  })();

  const style: CSSProperties = {
    aspectRatio: DECK.size.aspectRatio,
    backgroundColor: palette.bg,
    color: palette.fg,
    padding,
    // CSS カスタムプロパティとしてパレットを子に流す
    ['--deck-bg' as string]: palette.bg,
    ['--deck-fg' as string]: palette.fg,
    ['--deck-fg-muted' as string]: palette.fgMuted,
    ['--deck-accent' as string]: palette.accent,
    fontFamily: DECK.font.serif,
  };

  return (
    <section
      style={style}
      className={
        'relative w-full overflow-hidden rounded-[20px] shadow-sm ring-1 ring-black/5 ' +
        (center
          ? 'flex flex-col justify-center'
          : 'flex flex-col')
      }
    >
      {children}

      {(pageNumber !== undefined || pageLabel) ? (
        <footer
          className="absolute inset-x-0 bottom-0 flex items-end justify-between"
          style={{
            paddingLeft: padding,
            paddingRight: padding,
            paddingBottom: padding / 2,
            color: palette.fgMuted,
            fontFamily: DECK.font.sans,
            fontSize: DECK.fontSize.foot,
            letterSpacing: DECK.tracking.kicker,
            textTransform: 'uppercase',
          }}
        >
          <span>{pageLabel ?? 'Locore · Founders'}</span>
          {pageNumber !== undefined ? (
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              {String(pageNumber).padStart(2, '0')}
            </span>
          ) : null}
        </footer>
      ) : null}
    </section>
  );
}
