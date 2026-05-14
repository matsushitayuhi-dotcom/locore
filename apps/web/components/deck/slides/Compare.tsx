import { SlideFrame } from '../SlideFrame';
import { DECK } from '@/lib/deck/tokens';

/**
 * "他社 vs Locore" のような 2 軸比較スライド。
 * 縦長スライドでは上下に積む（左右に並べると狭すぎるため）。
 */
type Column = {
  label: string;
  title: string;
  bullets: string[];
};

type Props = {
  kicker?: string;
  title: string;
  left: Column;
  right: Column;
  /** 右側を強調表示するか（Locore 側を立てたいとき） */
  emphasizeRight?: boolean;
  pageNumber?: number;
};

export function SlideCompare({
  kicker,
  title,
  left,
  right,
  emphasizeRight = true,
  pageNumber,
}: Props) {
  return (
    <SlideFrame variant="cream" pageNumber={pageNumber} center={false}>
      <div className="flex h-full flex-col justify-center" style={{ gap: 40 }}>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <ComparePane column={left} emphasize={false} />
          <ComparePane column={right} emphasize={emphasizeRight} />
        </div>
      </div>
    </SlideFrame>
  );
}

function ComparePane({
  column,
  emphasize,
}: {
  column: Column;
  emphasize: boolean;
}) {
  return (
    <div
      style={{
        padding: 28,
        borderRadius: DECK.radius.card,
        backgroundColor: emphasize ? DECK.color.terracotta : DECK.color.sand,
        color: emphasize ? DECK.color.cream : DECK.color.ink,
      }}
    >
      <p
        style={{
          fontFamily: DECK.font.sans,
          fontSize: DECK.fontSize.kicker,
          letterSpacing: DECK.tracking.kicker,
          textTransform: 'uppercase',
          opacity: emphasize ? 0.85 : 0.7,
          margin: 0,
        }}
      >
        {column.label}
      </p>
      <p
        style={{
          fontFamily: DECK.font.serif,
          fontSize: DECK.fontSize.h3,
          lineHeight: 1.3,
          fontWeight: 600,
          marginTop: 6,
          marginBottom: 16,
        }}
      >
        {column.title}
      </p>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {column.bullets.map((b, i) => (
          <li
            key={i}
            style={{
              fontFamily: DECK.font.sans,
              fontSize: DECK.fontSize.body,
              lineHeight: 1.6,
              opacity: emphasize ? 0.95 : 0.8,
              paddingLeft: 24,
              position: 'relative',
            }}
          >
            <span
              aria-hidden
              style={{
                position: 'absolute',
                left: 0,
                top: '0.65em',
                width: 12,
                height: 2,
                backgroundColor: 'currentColor',
                opacity: 0.6,
              }}
            />
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}
