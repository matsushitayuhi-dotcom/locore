import { SlideFrame } from '../SlideFrame';
import { DECK } from '@/lib/deck/tokens';
import { Logo } from '@/components/Logo';

/**
 * クロージング / CTA スライド（"応募する" の入口）。
 */
type Props = {
  kicker?: string;
  title: string;
  /** 応募 URL（短く） */
  ctaText?: string;
  ctaUrl?: string;
  /** 補足（応募期限、選考方法など） */
  hint?: string;
  pageNumber?: number;
};

export function SlideCTA({
  kicker = 'Apply',
  title,
  ctaText = '応募する',
  ctaUrl = 'locore.app/founders',
  hint,
  pageNumber,
}: Props) {
  return (
    <SlideFrame variant="stamp" pageNumber={pageNumber} pageLabel="Founders">
      <div className="flex flex-col items-center text-center" style={{ gap: DECK.space.section }}>
        <Logo variant="icon" height={96} />

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

        <h2
          style={{
            fontFamily: DECK.font.serif,
            fontSize: DECK.fontSize.h1,
            lineHeight: 1.2,
            letterSpacing: DECK.tracking.tight,
            fontWeight: 600,
            margin: 0,
            maxWidth: '14ch',
          }}
        >
          {title}
        </h2>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px 40px',
            backgroundColor: DECK.color.cream,
            color: DECK.color.terracotta,
            borderRadius: DECK.radius.chip,
            fontFamily: DECK.font.sans,
            fontSize: DECK.fontSize.h3,
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          {ctaText}
        </div>

        <p
          style={{
            fontFamily: DECK.font.mono,
            fontSize: DECK.fontSize.body,
            opacity: 0.85,
            margin: 0,
          }}
        >
          {ctaUrl}
        </p>

        {hint ? (
          <p
            style={{
              fontFamily: DECK.font.sans,
              fontSize: DECK.fontSize.foot,
              lineHeight: 1.6,
              opacity: 0.75,
              maxWidth: '28ch',
              margin: 0,
            }}
          >
            {hint}
          </p>
        ) : null}
      </div>
    </SlideFrame>
  );
}
