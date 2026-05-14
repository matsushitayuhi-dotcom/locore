import { SlideFrame } from '../SlideFrame';
import { DECK } from '@/lib/deck/tokens';

/**
 * 3〜5 項目を縦に並べるリストスライド。
 * 各項目: 番号 (任意) + 見出し + 短い説明。
 */
type Item = {
  title: string;
  description?: string;
};

type Props = {
  kicker?: string;
  title: string;
  items: Item[];
  /** "01 02 03" 風の連番を見出し前に振るか */
  numbered?: boolean;
  pageNumber?: number;
};

export function SlideBulletList({
  kicker,
  title,
  items,
  numbered = true,
  pageNumber,
}: Props) {
  return (
    <SlideFrame variant="cream" pageNumber={pageNumber} center={false}>
      <div className="flex h-full flex-col justify-center" style={{ gap: DECK.space.section }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: DECK.space.inline }}>
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
        </div>

        <ol
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 32,
            margin: 0,
            padding: 0,
            listStyle: 'none',
          }}
        >
          {items.map((it, i) => (
            <li
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: numbered ? '52px 1fr' : '12px 1fr',
                gap: DECK.space.gap,
                alignItems: 'baseline',
              }}
            >
              {numbered ? (
                <span
                  style={{
                    fontFamily: DECK.font.serif,
                    fontSize: DECK.fontSize.h3,
                    color: DECK.color.terracotta,
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 600,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
              ) : (
                <span
                  aria-hidden
                  style={{
                    width: 8,
                    height: 8,
                    backgroundColor: DECK.color.terracotta,
                    borderRadius: 999,
                    marginTop: 14,
                    justifySelf: 'center',
                  }}
                />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <p
                  style={{
                    fontFamily: DECK.font.serif,
                    fontSize: DECK.fontSize.h3,
                    lineHeight: 1.35,
                    color: DECK.color.ink,
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  {it.title}
                </p>
                {it.description ? (
                  <p
                    style={{
                      fontFamily: DECK.font.sans,
                      fontSize: DECK.fontSize.body,
                      lineHeight: 1.7,
                      color: DECK.color.inkMuted,
                      margin: 0,
                    }}
                  >
                    {it.description}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </SlideFrame>
  );
}
