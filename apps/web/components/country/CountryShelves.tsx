'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * CountryShelves — 各国ページ (/[country], 例 /france) を、カテゴリごとの
 * 横スクロール棚（/services の ServicesShelves と同じデザイン）で表示する
 * クライアントコンポーネント。
 *
 * 【設計の正】
 *   - 棚（横スクロール）＋カード＋「すべて見る」＋左右スライド矢印・スワイプは
 *     ServicesShelves の作り／CSS を流用。
 *   - ★CSS は `<style dangerouslySetInnerHTML>` 方式（生 <style>）。
 *     styled-jsx / :global() は初回 SSR で当たらず崩れるため使わない。
 *   - 配色はライム×クリームのブランドトークン（ServicesShelves と一致）。
 *
 * 【カード種別】
 *   - community : コミュニティ投稿（タイトル / 場所 / 種別ラベル）
 *   - article   : 記事（カバー画像 / タイトル / 著者）
 *   - service   : サービス（/services のカード相当）
 *   - news      : 新着・イベント（掲示板 / イベント。日付 or NEW バッジ + 場所）
 *
 * データ取得はサーバページ（page.tsx）が国コードで行い、ここへは表示用に
 * 正規化済みの ShelfData[] を渡す。クライアントは描画とスクロール挙動のみ担う。
 */

export type CardKind = 'community' | 'article' | 'service' | 'news';

export type ShelfCard = {
  /** 一意キー（投稿/記事/サービスの id 等） */
  id: string;
  /** 遷移先 URL（/jobs/[id], /articles/[id], /services/[id], /board/[id] 等） */
  href: string;
  title: string;
  /** カバー画像 URL（無ければプレースホルダ） */
  image: string | null;
  /** メタ1行目（場所・著者など）。任意 */
  meta?: string | null;
  /** ライム色で強調する小ラベル（種別・カテゴリ・価格など）。任意 */
  badge?: string | null;
  /** 新着・イベント棚で使う日付ラベル（例 "6/30"）。任意 */
  dateLabel?: string | null;
};

export type ShelfData = {
  /** 棚識別キー */
  key: string;
  /** カードの種別（プレースホルダ色・アイコンに使用） */
  cardKind: CardKind;
  title: string;
  /** 英字サブ見出し（"Apartments" 等） */
  sub: string;
  /** 「すべて見る」の遷移先（国フィルタ付き） */
  allHref: string;
  cards: ShelfCard[];
};

export function CountryShelves({ shelves }: { shelves: ShelfData[] }) {
  return (
    <div className="cty-root">
      {shelves.map((shelf) => (
        <section className="shelf" key={shelf.key}>
          <div className="shead">
            <h2>{shelf.title}</h2>
            <span className="sub">{shelf.sub}</span>
            <a className="seeall" href={shelf.allHref}>
              すべて見る <ArrowSvg />
            </a>
          </div>
          <ShelfRow shelf={shelf} />
        </section>
      ))}
      <ScopedStyle />
    </div>
  );
}

/* ====================== 棚の行 (左右スライド矢印つき) ====================== */

function ShelfRow({ shelf }: { shelf: ShelfData }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // スクロール位置で端を判定し、矢印の出し分けを行う。
  const sync = () => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft >= max - 2);
  };

  useEffect(() => {
    sync();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    return () => {
      el.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, [shelf.key]);

  const slide = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.9, 240);
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  return (
    <div className="rowwrap">
      {!atStart ? (
        <button
          type="button"
          className="slide prev"
          aria-label="前へ"
          onClick={() => slide(-1)}
        >
          <ChevSvg dir="l" />
        </button>
      ) : null}
      {!atEnd ? (
        <button
          type="button"
          className="slide next"
          aria-label="次へ"
          onClick={() => slide(1)}
        >
          <ChevSvg dir="r" />
        </button>
      ) : null}
      <div className="row" ref={trackRef}>
        {shelf.cards.map((c) => (
          <Card key={shelf.key + ':' + c.id} card={c} kind={shelf.cardKind} />
        ))}
        <a className="more" href={shelf.allHref}>
          <span className="circ">
            <ArrowSvg />
          </span>
          <b>もっと見る</b>
        </a>
      </div>
    </div>
  );
}

/* ====================== カード ====================== */

function Card({ card, kind }: { card: ShelfCard; kind: CardKind }) {
  return (
    <a className="card" href={card.href}>
      <div className="ph">
        {card.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.image} loading="lazy" alt="" />
        ) : (
          <Placeholder kind={kind} />
        )}
        {card.dateLabel ? (
          <span className="datechip">{card.dateLabel}</span>
        ) : null}
      </div>
      <div className="cbody">
        <div className="title">{card.title}</div>
        {(card.badge || card.meta) && (
          <div className="meta">
            {card.badge ? <span className="mcat">{card.badge}</span> : null}
            {card.badge && card.meta ? ' ・ ' : ''}
            {card.meta ?? ''}
          </div>
        )}
      </div>
    </a>
  );
}

/* ====================== プレースホルダ ====================== */

function placeholderTint(kind: CardKind): string {
  switch (kind) {
    case 'news':
      return 'ph-t5';
    case 'community':
      return 'ph-t2';
    case 'article':
      return 'ph-t3';
    case 'service':
      return 'ph-t1';
    default:
      return 'ph-t0';
  }
}

/**
 * 画像なしのプレースホルダ。ライム×クリームの淡いグラデ地に、種別アイコンと
 * 控えめな「Locore」ワードマークを置く。
 */
function Placeholder({ kind }: { kind: CardKind }) {
  return (
    <div className={'phph ' + placeholderTint(kind)} aria-hidden>
      <span className="phph-ico">
        <KindIcon kind={kind} />
      </span>
      <span className="phph-mark">Locore</span>
    </div>
  );
}

/* ====================== SVG アイコン ====================== */

function ArrowSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="13 6 19 12 13 18" />
    </svg>
  );
}
function ChevSvg({ dir }: { dir: 'l' | 'r' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      {dir === 'l' ? (
        <polyline points="15 6 9 12 15 18" />
      ) : (
        <polyline points="9 6 15 12 9 18" />
      )}
    </svg>
  );
}

/** 種別ごとの線アイコン（プレースホルダ中央に描く）。 */
function KindIcon({ kind }: { kind: CardKind }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (kind) {
    case 'news': // 新着・イベント → カレンダー
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
          <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" />
          <line x1="8" y1="3" x2="8" y2="6.5" />
          <line x1="16" y1="3" x2="16" y2="6.5" />
        </svg>
      );
    case 'article': // 記事 → 新聞
      return (
        <svg {...common}>
          <path d="M4 5h12v14H5a1 1 0 0 1-1-1z" />
          <path d="M16 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-3" />
          <line x1="7" y1="9" x2="13" y2="9" />
          <line x1="7" y1="12.5" x2="13" y2="12.5" />
          <line x1="7" y1="16" x2="11" y2="16" />
        </svg>
      );
    case 'service': // サービス → 羅針盤
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <polygon points="15.5 8.5 11 11 8.5 15.5 13 13" />
        </svg>
      );
    case 'community': // コミュニティ → 二人
    default:
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
          <path d="M16 6.2a3 3 0 0 1 0 5.6" />
          <path d="M16.5 14.4A5.5 5.5 0 0 1 20.5 19" />
        </svg>
      );
  }
}

/* ====================== scoped CSS (ServicesShelves 流用) ====================== */

function ScopedStyle() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      .cty-root {
        --bg: #f4f4ef;
        --card: #fff;
        --lime: #a8e01c;
        --lime-d: #5e8b0e;
        --ink: #14140f;
        --ink2: #3a3a34;
        --mu: #7a7a72;
        --bd: #e6e6de;
        --bd2: #d8d8cf;
        --disp: var(--font-sans-jp), sans-serif;
        --jp: var(--font-sans-jp), sans-serif;
        --mono: var(--font-mono), monospace;
        color: var(--ink);
        font-family: var(--jp);
      }
      .cty-root a {
        color: inherit;
        text-decoration: none;
      }
      .cty-root img {
        display: block;
        max-width: 100%;
      }

      /* 棚 */
      .cty-root .shelf {
        padding: 22px 0 6px;
      }
      .cty-root .shead {
        display: flex;
        align-items: baseline;
        gap: 12px;
        margin-bottom: 16px;
      }
      .cty-root .shead h2 {
        font-family: var(--jp);
        font-weight: 900;
        font-size: 23px;
        letter-spacing: 0.01em;
        color: var(--ink);
      }
      .cty-root .shead .sub {
        color: var(--lime-d);
        font-size: 12.5px;
        font-family: var(--mono);
        font-weight: 500;
      }
      .cty-root .shead .seeall {
        margin-left: auto;
        font-size: 13px;
        font-weight: 700;
        color: var(--lime-d);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: transparent;
        border: 0;
        font-family: var(--jp);
        white-space: nowrap;
      }
      .cty-root .shead .seeall svg {
        width: 15px;
        height: 15px;
      }

      /* 棚の行ラッパ (左右スライド矢印の位置基準) */
      .cty-root .rowwrap {
        position: relative;
      }
      .cty-root .row {
        display: flex;
        gap: 18px;
        overflow-x: auto;
        scroll-snap-type: x proximity;
        scroll-behavior: smooth;
        padding-bottom: 10px;
        scrollbar-width: none;
      }
      .cty-root .row::-webkit-scrollbar {
        display: none;
      }
      /* 棚スライド矢印 */
      .cty-root .slide {
        position: absolute;
        top: calc(50% - 24px);
        transform: translateY(-50%);
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.96);
        border: 1px solid var(--bd);
        display: grid;
        place-items: center;
        cursor: pointer;
        color: var(--ink);
        box-shadow: 0 6px 18px -6px rgba(20, 20, 15, 0.4);
        z-index: 6;
        transition: transform 0.14s, opacity 0.16s;
        opacity: 0;
      }
      .cty-root .rowwrap:hover .slide {
        opacity: 1;
      }
      .cty-root .slide:hover {
        transform: translateY(-50%) scale(1.08);
      }
      .cty-root .slide svg {
        width: 18px;
        height: 18px;
      }
      .cty-root .slide.prev {
        left: -8px;
      }
      .cty-root .slide.next {
        right: -8px;
      }
      @media (hover: none) {
        .cty-root .slide {
          opacity: 1;
        }
      }

      /* カード */
      .cty-root .card {
        flex: none;
        width: 258px;
        scroll-snap-align: start;
        cursor: pointer;
      }
      .cty-root .ph {
        position: relative;
        border-radius: 16px;
        overflow: hidden;
        aspect-ratio: 20 / 19;
        background: #e9e9e1;
      }
      .cty-root .ph > img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      /* 日付チップ (新着・イベント棚) */
      .cty-root .datechip {
        position: absolute;
        top: 11px;
        left: 11px;
        z-index: 3;
        display: inline-flex;
        align-items: center;
        padding: 4px 10px;
        border-radius: 999px;
        background: var(--lime);
        color: #1c2a06;
        font-family: var(--mono);
        font-weight: 700;
        font-size: 12px;
        box-shadow: 0 2px 6px rgba(20, 20, 15, 0.25);
      }
      /* 画像なしプレースホルダ (ブランド配色) */
      .cty-root .phph {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background:
          radial-gradient(
            120% 120% at 50% 18%,
            rgba(168, 224, 28, 0.22),
            rgba(168, 224, 28, 0.06) 55%,
            rgba(251, 251, 248, 0.9)
          ),
          #f3f5e9;
        color: var(--lime-d);
      }
      .cty-root .phph-ico {
        display: grid;
        place-items: center;
        width: 54px;
        height: 54px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.7);
        border: 1px solid rgba(168, 224, 28, 0.45);
        color: var(--lime-d);
      }
      .cty-root .phph-ico svg {
        width: 26px;
        height: 26px;
      }
      .cty-root .phph-mark {
        font-family: var(--disp);
        font-weight: 700;
        font-size: 11px;
        letter-spacing: 0.06em;
        color: rgba(94, 139, 14, 0.7);
      }
      .cty-root .phph.ph-t0 {
      }
      .cty-root .phph.ph-t1 {
        background:
          radial-gradient(120% 120% at 50% 18%, rgba(168, 224, 28, 0.26), rgba(251, 251, 248, 0.92) 60%),
          #f1f5e4;
      }
      .cty-root .phph.ph-t2 {
        background:
          radial-gradient(120% 120% at 50% 18%, rgba(205, 240, 136, 0.4), rgba(251, 251, 248, 0.92) 60%),
          #eef3e6;
      }
      .cty-root .phph.ph-t3 {
        background:
          radial-gradient(120% 120% at 50% 18%, rgba(168, 224, 28, 0.18), rgba(227, 247, 184, 0.5) 60%),
          #f4f6ea;
      }
      .cty-root .phph.ph-t5 {
        background:
          radial-gradient(120% 120% at 50% 18%, rgba(168, 224, 28, 0.3), rgba(244, 244, 239, 0.95) 62%),
          #eef3e3;
      }

      .cty-root .cbody {
        padding: 12px 2px 0;
      }
      .cty-root .title {
        font-size: 16px;
        font-weight: 700;
        line-height: 1.42;
        color: var(--ink);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .cty-root .meta {
        color: var(--mu);
        font-size: 12px;
        margin-top: 5px;
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .cty-root .meta .mcat {
        color: var(--lime-d);
        font-weight: 700;
      }

      /* もっと見るタイル */
      .cty-root .more {
        flex: none;
        width: 172px;
        scroll-snap-align: start;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border-radius: 16px;
        border: 1px dashed var(--bd2);
        background: rgba(168, 224, 28, 0.06);
        color: var(--lime-d);
        cursor: pointer;
        gap: 12px;
        transition: 0.16s;
        align-self: stretch;
        margin-bottom: 34px;
        font-family: var(--jp);
      }
      .cty-root .more:hover {
        background: rgba(168, 224, 28, 0.13);
        border-color: var(--lime);
      }
      .cty-root .more .circ {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: var(--lime);
        color: #1c2a06;
        display: grid;
        place-items: center;
      }
      .cty-root .more .circ svg {
        width: 22px;
        height: 22px;
      }
      .cty-root .more b {
        font-size: 14px;
      }

      @media (max-width: 760px) {
        .cty-root .shead h2 {
          font-size: 20px;
        }
      }

      /* ===== モバイル: Airbnb 風コンパクト配置 ===== */
      @media (max-width: 640px) {
        .cty-root .row {
          gap: 12px;
          scroll-snap-type: x mandatory;
        }
        .cty-root .card {
          width: 43vw;
          max-width: 210px;
          scroll-snap-align: start;
        }
        .cty-root .ph {
          aspect-ratio: 1 / 1;
          border-radius: 13px;
        }
        .cty-root .cbody {
          padding: 8px 1px 0;
        }
        .cty-root .title {
          font-size: 13.5px;
          line-height: 1.34;
        }
        .cty-root .meta {
          font-size: 11px;
          margin-top: 3px;
        }
        .cty-root .more {
          width: 120px;
          gap: 8px;
          margin-bottom: 22px;
        }
        .cty-root .more .circ {
          width: 38px;
          height: 38px;
        }
        .cty-root .more b {
          font-size: 12.5px;
        }
        .cty-root .shelf {
          padding: 12px 0 2px;
        }
        .cty-root .shead {
          margin-bottom: 10px;
          gap: 8px;
        }
        .cty-root .shead h2 {
          font-size: 17px;
        }
        .cty-root .shead .sub {
          font-size: 11px;
        }
        .cty-root .shead .seeall {
          font-size: 12px;
        }
        .cty-root .slide {
          display: none;
        }
        .cty-root .phph-ico {
          width: 44px;
          height: 44px;
        }
        .cty-root .phph-ico svg {
          width: 22px;
          height: 22px;
        }
        .cty-root .phph-mark {
          font-size: 10px;
        }
      }
    ` }} />
  );
}
