import { SlideFrame } from '../SlideFrame';
import { DECK } from '@/lib/deck/tokens';

/**
 * 章区切りスライド。
 * 章番号（大）+ 章タイトル + 一行説明。
 */
type Props = {
  chapter: number | string;
  title: string;
  oneLiner?: string;
  pageNumber?: number;
};

export function SlideSection({ chapter, title, oneLiner, pageNumber }: Props) {
  return (
    <SlideFrame variant="cream" pageNumber={pageNumber} center={false}>
      <div
        className="flex h-full flex-col"
        style={{ gap: DECK.space.section, justifyContent: 'space-between' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: DECK.space.gap }}>
          <p
            style={{
              fontFamily: DECK.font.sans,
              fontSize: DECK.fontSize.kicker,
              letterSpacing: DECK.tracking.kicker,
              textTransform: 'uppercase',
              color: DECK.color.terracotta,
            }}
          >
            Chapter
          </p>
          <p
            style={{
              fontFamily: DECK.font.serif,
              fontSize: '220px',
              lineHeight: 0.9,
              letterSpacing: DECK.tracking.tight,
              fontWeight: 600,
              color: DECK.color.terracotta,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {String(chapter).padStart(2, '0')}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: DECK.space.gap }}>
          <h2
            style={{
              fontFamily: DECK.font.serif,
              fontSize: DECK.fontSize.h1,
              lineHeight: 1.2,
              letterSpacing: DECK.tracking.tight,
              fontWeight: 600,
              color: DECK.color.ink,
              maxWidth: '14ch',
              margin: 0,
            }}
          >
            {title}
          </h2>
          {oneLiner ? (
            <p
              style={{
                fontFamily: DECK.font.sans,
                fontSize: DECK.fontSize.body,
                lineHeight: 1.7,
                color: DECK.color.inkMuted,
                maxWidth: '28ch',
                margin: 0,
              }}
            >
              {oneLiner}
            </p>
          ) : null}
        </div>
      </div>
    </SlideFrame>
  );
}
