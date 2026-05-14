import { SlideFrame } from '../SlideFrame';
import { DECK } from '@/lib/deck/tokens';

/**
 * 標準コンテンツスライド。
 * アイブロウ → ヘッドライン → 本文（段落 1〜3 つ）。
 */
type Props = {
  kicker?: string;
  title: string;
  body?: string | string[];
  pageNumber?: number;
};

export function SlideHeadline({ kicker, title, body, pageNumber }: Props) {
  const paragraphs = Array.isArray(body) ? body : body ? [body] : [];
  return (
    <SlideFrame variant="cream" pageNumber={pageNumber} center={false}>
      <div className="flex h-full flex-col justify-center" style={{ gap: DECK.space.section }}>
        {kicker ? (
          <p
            style={{
              fontFamily: DECK.font.sans,
              fontSize: DECK.fontSize.kicker,
              letterSpacing: DECK.tracking.kicker,
              textTransform: 'uppercase',
              color: DECK.color.terracotta,
              margin: 0,
            }}
          >
            {kicker}
          </p>
        ) : null}

        <h2
          style={{
            fontFamily: DECK.font.serif,
            fontSize: DECK.fontSize.h2,
            lineHeight: 1.25,
            letterSpacing: DECK.tracking.tight,
            fontWeight: 600,
            color: DECK.color.ink,
            margin: 0,
          }}
        >
          {title}
        </h2>

        {paragraphs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: DECK.space.gap }}>
            {paragraphs.map((p, i) => (
              <p
                key={i}
                style={{
                  fontFamily: DECK.font.sans,
                  fontSize: DECK.fontSize.body,
                  lineHeight: 1.85,
                  color: DECK.color.inkMuted,
                  margin: 0,
                }}
              >
                {p}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </SlideFrame>
  );
}
