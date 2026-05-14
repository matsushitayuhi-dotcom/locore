import { SlideFrame } from '../SlideFrame';
import { DECK } from '@/lib/deck/tokens';

/**
 * 引用 / マニフェスト風スライド。
 * 大きなセリフ斜体で 1 文。
 */
type Props = {
  quote: string;
  attribution?: string;
  pageNumber?: number;
  /** ネガティブ反転で使うか */
  invert?: boolean;
};

export function SlideQuote({ quote, attribution, pageNumber, invert }: Props) {
  const variant = invert ? 'ink' : 'cream';
  return (
    <SlideFrame variant={variant} pageNumber={pageNumber}>
      <div
        className="flex flex-col"
        style={{ gap: DECK.space.section }}
      >
        <span
          aria-hidden
          style={{
            fontFamily: DECK.font.serif,
            fontSize: '200px',
            lineHeight: 0.5,
            color: invert ? DECK.color.terracottaSoft : DECK.color.terracotta,
            opacity: 0.55,
          }}
        >
          “
        </span>
        <blockquote
          style={{
            fontFamily: DECK.font.serif,
            fontSize: DECK.fontSize.quote,
            lineHeight: 1.55,
            letterSpacing: DECK.tracking.tight,
            fontStyle: 'italic',
            fontWeight: 500,
            color: invert ? DECK.color.cream : DECK.color.ink,
            margin: 0,
            maxWidth: '18ch',
          }}
        >
          {quote}
        </blockquote>
        {attribution ? (
          <p
            style={{
              fontFamily: DECK.font.sans,
              fontSize: DECK.fontSize.kicker,
              letterSpacing: DECK.tracking.kicker,
              textTransform: 'uppercase',
              color: invert ? 'rgba(250, 245, 235, 0.65)' : DECK.color.inkMuted,
              margin: 0,
            }}
          >
            — {attribution}
          </p>
        ) : null}
      </div>
    </SlideFrame>
  );
}
