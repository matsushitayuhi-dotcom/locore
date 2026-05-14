import { SlideFrame } from '../SlideFrame';
import { DECK } from '@/lib/deck/tokens';
import { Logo } from '@/components/Logo';

/**
 * カバースライド（表紙）。
 * Founders 募集資料の 1 枚目。
 */
type Props = {
  kicker?: string;
  title: string;
  subtitle?: string;
  pageNumber?: number;
};

export function SlideCover({ kicker, title, subtitle, pageNumber }: Props) {
  return (
    <SlideFrame variant="stamp" pageNumber={pageNumber} pageLabel="Locore">
      <div className="flex flex-col items-center text-center" style={{ gap: DECK.space.section }}>
        <div style={{ opacity: 0.95 }}>
          <Logo variant="icon" height={120} />
        </div>

        {kicker ? (
          <p
            style={{
              fontFamily: DECK.font.sans,
              fontSize: DECK.fontSize.kicker,
              letterSpacing: DECK.tracking.kicker,
              textTransform: 'uppercase',
              opacity: 0.85,
            }}
          >
            {kicker}
          </p>
        ) : null}

        <h1
          style={{
            fontFamily: DECK.font.serif,
            fontSize: DECK.fontSize.display,
            lineHeight: 1.1,
            letterSpacing: DECK.tracking.tight,
            fontWeight: 600,
            maxWidth: '11ch',
            margin: 0,
          }}
        >
          {title}
        </h1>

        {subtitle ? (
          <p
            style={{
              fontFamily: DECK.font.sans,
              fontSize: DECK.fontSize.body,
              lineHeight: 1.7,
              maxWidth: '24ch',
              opacity: 0.85,
              margin: 0,
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </SlideFrame>
  );
}
