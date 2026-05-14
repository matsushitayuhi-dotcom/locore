import { SlideFrame } from '../SlideFrame';
import { DECK } from '@/lib/deck/tokens';

/**
 * 大きな数字 1 つでインパクトを出すスライド。
 * "50 人" "1 年以上" のような単一メトリクス。
 */
type Props = {
  kicker?: string;
  /** 主役の数字 / 値 */
  value: string;
  /** 単位（小さく数字の右下に） */
  unit?: string;
  /** 数字の下のラベル */
  label: string;
  /** 補足の説明文（任意、複数行可） */
  caption?: string;
  pageNumber?: number;
};

export function SlideStat({ kicker, value, unit, label, caption, pageNumber }: Props) {
  return (
    <SlideFrame variant="cream" pageNumber={pageNumber}>
      <div
        className="flex flex-col items-center text-center"
        style={{ gap: DECK.space.section }}
      >
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

        <p
          style={{
            fontFamily: DECK.font.serif,
            fontSize: DECK.fontSize.statBig,
            lineHeight: 0.9,
            letterSpacing: DECK.tracking.tight,
            fontWeight: 600,
            color: DECK.color.terracotta,
            margin: 0,
            fontVariantNumeric: 'tabular-nums',
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: 20,
          }}
        >
          <span>{value}</span>
          {unit ? (
            <span
              style={{
                fontSize: DECK.fontSize.h2,
                fontFamily: DECK.font.sans,
                color: DECK.color.coffee,
                fontWeight: 500,
              }}
            >
              {unit}
            </span>
          ) : null}
        </p>

        <p
          style={{
            fontFamily: DECK.font.serif,
            fontSize: DECK.fontSize.h3,
            lineHeight: 1.4,
            color: DECK.color.ink,
            margin: 0,
            maxWidth: '16ch',
          }}
        >
          {label}
        </p>

        {caption ? (
          <p
            style={{
              fontFamily: DECK.font.sans,
              fontSize: DECK.fontSize.body,
              lineHeight: 1.8,
              color: DECK.color.inkMuted,
              maxWidth: '24ch',
              margin: 0,
            }}
          >
            {caption}
          </p>
        ) : null}
      </div>
    </SlideFrame>
  );
}
