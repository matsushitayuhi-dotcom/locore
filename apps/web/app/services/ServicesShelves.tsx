'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { FeaturedService } from '@/lib/services/featured';
import { tagLabel } from '@/lib/services/tagLabels';

/**
 * /services — 承認済みモック (locore-mockups/services.html) の Airbnb 風デザインを
 * 本番の実データ (FeaturedService) で再現するクライアントコンポーネント。
 *
 * 旧 ServicesBrowser (フィルタ + グリッド) を置き換える。データ取得・国フィルタの
 * 扱いはサーバページ側 (page.tsx) を踏襲し、ここでは全件を受け取って
 *   - 棚分け (新着 / 人気 / カテゴリ別)
 *   - 「もっと見る」/ チップ → 縦リスト表示
 * をクライアント側で行う。
 *
 * 【棚分けロジック】
 *   - 新着  : createdAt の新しい順 (createdAt 欠落レコードは末尾)
 *   - 人気  : サーバが返した順序 (position 昇順 → createdAt 降順 = 出品者が並べた
 *             おすすめ順) をそのまま使う
 *   - カテゴリ別: category 値でグルーピング (出現件数の多い順に最大4棚)
 *
 * 【正直さの方針】
 *   - 実データに評価 / レビュー数が無いため、★やレビュー件数は一切表示しない
 *     (モックのダミー評価は本番に出さない)
 *   - 画像は coverImageUrl の1枚が基本。複数無ければ矢印・ドットを出さず1枚表示。
 *     将来ギャラリー対応した時に複数表示できるよう images: string[] で扱う。
 *   - ♡保存は本番に保存機構がまだ無いため見た目だけのトグル (偽の永続化はしない)。
 */

const COUNTRY_LABEL: Record<string, string> = { fr: 'フランス' };

/** 棚 / リストの最大表示件数 */
const ROW_MAX = 10;
const LIST_MAX = 60;
/** カテゴリ別に作る棚の最大数 */
const CATEGORY_SHELF_MAX = 4;

type Shelf = {
  /** リスト遷移時のキー兼識別子 */
  key: string;
  title: string;
  sub: string;
  items: FeaturedService[];
};

/** coverImageUrl を配列に正規化 (将来ギャラリー対応で複数になっても扱える) */
function imagesOf(s: FeaturedService): string[] {
  return s.coverImageUrl ? [s.coverImageUrl] : [];
}

/** 価格表示。0 or null は「無料」/「応相談」。単位 (/人 等) は出さない方針。 */
function priceLabel(s: FeaturedService): string {
  if (s.priceJpy == null) return '応相談';
  if (s.priceJpy === 0) return '無料';
  return '¥' + s.priceJpy.toLocaleString('ja-JP');
}

/** メタ行: カテゴリ(ライム) ・ 都市 ・ 単位(あれば)。無い要素は省く。 */
function metaParts(s: FeaturedService): { cat: string | null; rest: string[] } {
  const cat = s.category ? tagLabel(s.category) : null;
  const rest: string[] = [];
  if (s.cityNameJa) rest.push(s.cityNameJa);
  if (s.priceUnit) rest.push(s.priceUnit);
  return { cat, rest };
}

export function ServicesShelves({
  services,
  initialCountry,
}: {
  services: FeaturedService[];
  initialCountry?: string;
}) {
  const sp = useSearchParams();
  const router = useRouter();

  // 国フィルタ: 初期値はサーバ props、以降は URL から1度だけ復元 (ディープリンク)。
  const [country, setCountry] = useState<string | undefined>(initialCountry);
  // 開いているリスト (棚キー or 'cat:xxx')。null なら棚表示。
  const [openKey, setOpenKey] = useState<string | null>(null);
  // ♡保存 (見た目のみ。永続化しない)
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const c = new URLSearchParams(sp.toString()).get('country')?.trim();
    if (c) setCountry(c);
    // 初回のみ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 国フィルタ済みサービス
  const scoped = useMemo(
    () =>
      country
        ? services.filter((s) => s.countryCode === country)
        : services,
    [services, country],
  );

  // 棚分け
  const shelves = useMemo<Shelf[]>(() => {
    if (scoped.length === 0) return [];

    // 新着: createdAt 降順 (欠落は末尾)
    const byNew = [...scoped].sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : -Infinity;
      const tb = b.createdAt ? Date.parse(b.createdAt) : -Infinity;
      return tb - ta;
    });

    // カテゴリ別: 出現件数の多い順
    const byCat = new Map<string, FeaturedService[]>();
    for (const s of scoped) {
      if (!s.category) continue;
      const arr = byCat.get(s.category) ?? [];
      arr.push(s);
      byCat.set(s.category, arr);
    }
    const catShelves = [...byCat.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, CATEGORY_SHELF_MAX)
      .map(([cat, items]) => ({
        key: 'cat:' + cat,
        title: tagLabel(cat),
        sub: 'Category',
        items: items.slice(0, ROW_MAX),
      }));

    const out: Shelf[] = [
      { key: 'new', title: '新着のサービス', sub: 'New', items: byNew.slice(0, ROW_MAX) },
      // 人気 = サーバが返した position/featured 順をそのまま
      { key: 'popular', title: '人気のサービス', sub: 'Popular', items: scoped.slice(0, ROW_MAX) },
      ...catShelves,
    ];
    // items が空の棚は出さない
    return out.filter((s) => s.items.length > 0);
  }, [scoped]);

  // カテゴリチップ (件数多い順)
  const chips = useMemo(() => {
    const count = new Map<string, number>();
    for (const s of scoped) {
      if (!s.category) continue;
      count.set(s.category, (count.get(s.category) ?? 0) + 1);
    }
    return [...count.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => ({ key: 'cat:' + cat, label: tagLabel(cat) }));
  }, [scoped]);

  // 開いているリストの中身
  const openList = useMemo(() => {
    if (!openKey) return null;
    if (openKey === 'new') {
      const items = [...scoped].sort((a, b) => {
        const ta = a.createdAt ? Date.parse(a.createdAt) : -Infinity;
        const tb = b.createdAt ? Date.parse(b.createdAt) : -Infinity;
        return tb - ta;
      });
      return { title: '新着のサービス', items: items.slice(0, LIST_MAX), total: items.length };
    }
    if (openKey === 'popular') {
      return { title: '人気のサービス', items: scoped.slice(0, LIST_MAX), total: scoped.length };
    }
    if (openKey.startsWith('cat:')) {
      const cat = openKey.slice(4);
      const items = scoped.filter((s) => s.category === cat);
      return { title: tagLabel(cat) + 'のサービス', items: items.slice(0, LIST_MAX), total: items.length };
    }
    return null;
  }, [openKey, scoped]);

  const toggleSave = (id: string) =>
    setSaved((m) => ({ ...m, [id]: !m[id] }));

  const open = (key: string) => {
    setOpenKey(key);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  };
  const close = () => setOpenKey(null);

  const clearCountry = () => {
    setCountry(undefined);
    const p = new URLSearchParams(sp.toString());
    p.delete('country');
    const qs = p.toString();
    router.replace(qs ? `/services?${qs}` : '/services', { scroll: false });
  };

  return (
    <div className="svc-root">
      <h1 className="sr-only">サービスを探す</h1>

      {/* 国フィルタのバッジ (既存挙動踏襲) */}
      {country ? (
        <div className="svc-countrybar">
          <span className="svc-countrybadge">
            📍 {COUNTRY_LABEL[country] ?? country} のサービス
            <button type="button" onClick={clearCountry} aria-label="国フィルタを解除">
              ✕
            </button>
          </span>
        </div>
      ) : null}

      {/* カテゴリ クイックチップ行 (横スクロール) */}
      {chips.length > 0 && !openKey ? (
        <div className="cats">
          <div className="catsin">
            <button
              type="button"
              className={'chip' + (openKey === null ? ' on' : '')}
              onClick={close}
            >
              すべて
            </button>
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                className="chip"
                onClick={() => open(c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* 棚 (横スクロール) */}
      {!openKey ? (
        scoped.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="shelves">
            {shelves.map((shelf) => (
              <section className="shelf" key={shelf.key}>
                <div className="shead">
                  <h2>{shelf.title}</h2>
                  <span className="sub">{shelf.sub}</span>
                  <button
                    type="button"
                    className="seeall"
                    onClick={() => open(shelf.key)}
                  >
                    すべて見る <ArrowSvg />
                  </button>
                </div>
                <div className="row">
                  {shelf.items.map((s) => (
                    <Card
                      key={shelf.key + ':' + s.id}
                      service={s}
                      saved={!!saved[s.id]}
                      onSave={() => toggleSave(s.id)}
                    />
                  ))}
                  <button
                    type="button"
                    className="more"
                    onClick={() => open(shelf.key)}
                  >
                    <span className="circ">
                      <ArrowSvg />
                    </span>
                    <b>もっと見る</b>
                  </button>
                </div>
              </section>
            ))}
          </div>
        )
      ) : null}

      {/* リスト表示 */}
      {openKey && openList ? (
        <div className="list">
          <button type="button" className="back" onClick={close}>
            <BackSvg />
            もどる
          </button>
          <h2 className="lhead">
            {openList.title}
            <span className="count">
              {openList.total.toLocaleString('ja-JP')}件
            </span>
          </h2>
          {openList.items.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="lrows">
              {openList.items.map((s) => (
                <ListRow
                  key={s.id}
                  service={s}
                  saved={!!saved[s.id]}
                  onSave={() => toggleSave(s.id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      <ScopedStyle />
    </div>
  );
}

/* ====================== カード (画像カルーセル付き) ====================== */

function Card({
  service: s,
  saved,
  onSave,
}: {
  service: FeaturedService;
  saved: boolean;
  onSave: () => void;
}) {
  const images = imagesOf(s);
  const [idx, setIdx] = useState(0);
  const multi = images.length > 1;
  const { cat, rest } = metaParts(s);

  const go = (delta: number) => {
    setIdx((i) => Math.min(Math.max(i + delta, 0), images.length - 1));
  };

  return (
    <a className="card" href={`/services/${s.id}`}>
      <div className="ph">
        {images.length > 0 ? (
          <div
            className="track"
            style={{ transform: `translateX(-${idx * 100}%)` }}
          >
            {images.map((u, k) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={k} src={u} loading="lazy" alt="" />
            ))}
          </div>
        ) : (
          <div className="phph" aria-hidden>
            <ImageSvg />
          </div>
        )}

        {multi && idx > 0 ? (
          <button
            type="button"
            className="navbtn prev"
            aria-label="前の写真"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              go(-1);
            }}
          >
            <ChevSvg dir="l" />
          </button>
        ) : null}
        {multi && idx < images.length - 1 ? (
          <button
            type="button"
            className="navbtn next"
            aria-label="次の写真"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              go(1);
            }}
          >
            <ChevSvg dir="r" />
          </button>
        ) : null}

        <button
          type="button"
          className={'heart' + (saved ? ' on' : '')}
          aria-label="保存"
          aria-pressed={saved}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSave();
          }}
        >
          <HeartSvg />
        </button>

        {multi ? (
          <div className="dots">
            {images.map((_, k) => (
              <i key={k} className={k === idx ? 'on' : ''} />
            ))}
          </div>
        ) : null}
      </div>

      <div className="cbody">
        <div className="title">{s.title}</div>
        {(cat || rest.length > 0) && (
          <div className="meta">
            {cat ? <span className="mcat">{cat}</span> : null}
            {cat && rest.length > 0 ? ' ・ ' : ''}
            {rest.join(' ・ ')}
          </div>
        )}
        <div className="price">
          <b>{priceLabel(s)}</b>
        </div>
      </div>
    </a>
  );
}

/* ====================== 横長リスト行 ====================== */

function ListRow({
  service: s,
  saved,
  onSave,
}: {
  service: FeaturedService;
  saved: boolean;
  onSave: () => void;
}) {
  const { cat, rest } = metaParts(s);
  return (
    <a className="lrow" href={`/services/${s.id}`}>
      <div className="lph">
        {s.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.coverImageUrl} alt="" loading="lazy" />
        ) : (
          <div className="phph" aria-hidden>
            <ImageSvg />
          </div>
        )}
        <button
          type="button"
          className={'heart' + (saved ? ' on' : '')}
          aria-label="保存"
          aria-pressed={saved}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSave();
          }}
        >
          <HeartSvg />
        </button>
      </div>
      <div className="lbody">
        <h3>{s.title}</h3>
        {(cat || rest.length > 0) && (
          <div className="lmeta-top">
            {cat ? <span className="mcat">{cat}</span> : null}
            {cat && rest.length > 0 ? ' ・ ' : ''}
            {rest.join(' ・ ')}
          </div>
        )}
        {s.description ? <p className="ldesc">{s.description}</p> : null}
        <div className="lfoot">
          <span className="lprice">
            <b>{priceLabel(s)}</b>
          </span>
        </div>
      </div>
    </a>
  );
}

/* ====================== 空状態 ====================== */

function EmptyState() {
  return (
    <section className="svc-empty">
      <h2>該当するサービスがありません</h2>
      <p>
        まだ登録されているサービスは少数です。国フィルタを外すか、
        ユーザーのプロフィールから直接相談することもできます。
      </p>
      <a href="/users" className="svc-empty-btn">
        ユーザーを見る
      </a>
    </section>
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
function BackSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="11 18 5 12 11 6" />
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
function HeartSvg() {
  return (
    <svg viewBox="0 0 24 24">
      <path
        d="M12 21s-7.5-4.7-10-9.3C.6 8.9 2 5.5 5.2 5.5c2 0 3.3 1.2 3.8 2.3C9.5 6.7 10.8 5.5 12.8 5.5 16 5.5 17.4 8.9 16 11.7 13.5 16.3 12 21 12 21z"
        transform="translate(0 -1)"
      />
    </svg>
  );
}
function ImageSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

/* ====================== scoped CSS (承認済みモック再現) ====================== */

function ScopedStyle() {
  return (
    <style jsx global>{`
      /* モックの CSS 変数をサイトのブランドトークンへマッピング。
         ライム×クリームの配色・スケールはランディングと一致している。 */
      .svc-root {
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
      .svc-root :global(a) {
        color: inherit;
        text-decoration: none;
      }
      .svc-root :global(img) {
        display: block;
        max-width: 100%;
      }

      .svc-countrybar {
        margin: 4px 0 14px;
      }
      .svc-countrybadge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(168, 224, 28, 0.13);
        color: var(--lime-d);
        font-size: 12.5px;
        font-weight: 700;
        border-radius: 999px;
        padding: 6px 14px;
        border: 1px solid rgba(168, 224, 28, 0.4);
      }
      .svc-countrybadge button {
        border: 0;
        background: transparent;
        color: var(--lime-d);
        cursor: pointer;
        font-size: 13px;
        opacity: 0.7;
      }
      .svc-countrybadge button:hover {
        opacity: 1;
      }

      /* カテゴリ クイックチップ */
      .cats {
        margin: 0 -4px 4px;
      }
      .catsin {
        display: flex;
        gap: 10px;
        padding: 4px 4px 14px;
        overflow-x: auto;
        scrollbar-width: none;
      }
      .catsin::-webkit-scrollbar {
        display: none;
      }
      .chip {
        flex: none;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        background: var(--card);
        border: 1px solid var(--bd2);
        border-radius: 999px;
        padding: 9px 16px;
        font-size: 13px;
        font-weight: 500;
        color: var(--ink2);
        cursor: pointer;
        white-space: nowrap;
        transition: 0.14s;
        font-family: var(--jp);
      }
      .chip:hover {
        border-color: var(--ink);
      }
      .chip.on {
        background: var(--lime);
        color: #1c2a06;
        border-color: var(--lime);
        font-weight: 700;
      }

      /* 棚 */
      .shelf {
        padding: 22px 0 6px;
      }
      .shead {
        display: flex;
        align-items: baseline;
        gap: 12px;
        margin-bottom: 16px;
      }
      .shead h2 {
        font-family: var(--jp);
        font-weight: 900;
        font-size: 23px;
        letter-spacing: 0.01em;
        color: var(--ink);
      }
      .shead .sub {
        color: var(--lime-d);
        font-size: 12.5px;
        font-family: var(--mono);
        font-weight: 500;
      }
      .shead .seeall {
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
      }
      .shead .seeall :global(svg) {
        width: 15px;
        height: 15px;
      }
      .row {
        display: flex;
        gap: 18px;
        overflow-x: auto;
        scroll-snap-type: x proximity;
        padding-bottom: 10px;
        scrollbar-width: none;
      }
      .row::-webkit-scrollbar {
        display: none;
      }

      /* カード */
      .card {
        flex: none;
        width: 258px;
        scroll-snap-align: start;
        cursor: pointer;
      }
      .ph {
        position: relative;
        border-radius: 16px;
        overflow: hidden;
        aspect-ratio: 20 / 19;
        background: #e9e9e1;
      }
      .track {
        display: flex;
        height: 100%;
        transition: transform 0.35s cubic-bezier(0.2, 0.7, 0.2, 1);
      }
      .track :global(img) {
        flex: none;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .phph {
        display: grid;
        place-items: center;
        width: 100%;
        height: 100%;
        color: rgba(20, 20, 15, 0.28);
      }
      .phph :global(svg) {
        width: 34px;
        height: 34px;
      }
      .navbtn {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.94);
        border: 0;
        display: grid;
        place-items: center;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.16s;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.28);
        color: #222;
        z-index: 3;
      }
      .card:hover .navbtn {
        opacity: 1;
      }
      .navbtn:hover {
        transform: translateY(-50%) scale(1.08);
      }
      .navbtn.prev {
        left: 10px;
      }
      .navbtn.next {
        right: 10px;
      }
      .navbtn :global(svg) {
        width: 15px;
        height: 15px;
      }
      .dots {
        position: absolute;
        bottom: 10px;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        gap: 5px;
        z-index: 2;
      }
      .dots :global(i) {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transition: 0.16s;
      }
      .dots :global(i.on) {
        background: #fff;
        transform: scale(1.18);
      }
      .heart {
        position: absolute;
        top: 11px;
        right: 11px;
        width: 32px;
        height: 32px;
        border: 0;
        background: transparent;
        cursor: pointer;
        display: grid;
        place-items: center;
        z-index: 3;
      }
      .heart :global(svg) {
        width: 23px;
        height: 23px;
        fill: rgba(0, 0, 0, 0.3);
        stroke: #fff;
        stroke-width: 2;
        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
        transition: 0.15s;
      }
      .heart:hover :global(svg) {
        transform: scale(1.12);
      }
      .heart.on :global(svg) {
        fill: var(--lime);
        stroke: var(--lime);
      }

      .cbody {
        padding: 12px 2px 0;
      }
      .title {
        font-size: 16px;
        font-weight: 700;
        line-height: 1.42;
        color: var(--ink);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .meta {
        color: var(--mu);
        font-size: 12px;
        margin-top: 5px;
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .meta :global(.mcat) {
        color: var(--lime-d);
        font-weight: 700;
      }
      .price {
        margin-top: 3px;
        font-size: 12px;
        color: var(--mu);
      }
      .price :global(b) {
        font-family: var(--disp);
        font-weight: 700;
        font-size: 13px;
        color: var(--ink);
        text-decoration: underline;
        text-underline-offset: 2px;
      }

      /* もっと見るタイル */
      .more {
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
      .more:hover {
        background: rgba(168, 224, 28, 0.13);
        border-color: var(--lime);
      }
      .more .circ {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: var(--lime);
        color: #1c2a06;
        display: grid;
        place-items: center;
      }
      .more .circ :global(svg) {
        width: 22px;
        height: 22px;
      }
      .more b {
        font-size: 14px;
      }

      /* リスト */
      .list {
        padding: 8px 0 40px;
      }
      .back {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 700;
        color: var(--ink2);
        background: var(--card);
        border: 1px solid var(--bd2);
        border-radius: 999px;
        padding: 9px 16px;
        cursor: pointer;
        margin: 6px 0 6px;
        font-family: var(--jp);
      }
      .back :global(svg) {
        width: 15px;
        height: 15px;
      }
      .lhead {
        font-family: var(--jp);
        font-weight: 900;
        font-size: 26px;
        margin: 14px 0 2px;
        color: var(--ink);
      }
      .lhead .count {
        color: var(--mu);
        font-family: var(--mono);
        font-size: 13px;
        font-weight: 400;
        margin-left: 8px;
      }
      .lrows {
        margin-top: 20px;
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .lrow {
        display: flex;
        gap: 20px;
        background: var(--card);
        border: 1px solid var(--bd);
        border-radius: 18px;
        padding: 14px;
        cursor: pointer;
        transition: 0.16s;
      }
      .lrow:hover {
        border-color: var(--lime);
        box-shadow: 0 18px 40px -28px rgba(94, 139, 14, 0.45);
      }
      .lph {
        position: relative;
        flex: none;
        width: 236px;
        aspect-ratio: 4 / 3;
        border-radius: 12px;
        overflow: hidden;
        background: #e9e9e1;
      }
      .lph :global(img) {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .lbody {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .lbody h3 {
        font-size: 18px;
        font-weight: 700;
        line-height: 1.4;
        color: var(--ink);
      }
      .lbody .lmeta-top {
        color: var(--mu);
        font-size: 13px;
        margin-top: 5px;
      }
      .lbody .lmeta-top :global(.mcat) {
        color: var(--lime-d);
        font-weight: 700;
      }
      .lbody .ldesc {
        color: var(--mu);
        font-size: 13px;
        line-height: 1.75;
        margin-top: 9px;
        white-space: pre-line;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .lfoot {
        margin-top: auto;
        display: flex;
        align-items: flex-end;
        gap: 14px;
        padding-top: 12px;
      }
      .lprice {
        margin-left: auto;
        text-align: right;
      }
      .lprice :global(b) {
        font-family: var(--disp);
        font-weight: 700;
        font-size: 20px;
        color: var(--ink);
      }

      /* 空状態 */
      .svc-empty {
        margin-top: 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        border: 1px dashed var(--bd2);
        background: var(--card);
        border-radius: 18px;
        padding: 44px 24px;
        text-align: center;
      }
      .svc-empty h2 {
        font-size: 15px;
        font-weight: 700;
        color: var(--ink);
      }
      .svc-empty p {
        max-width: 460px;
        font-size: 12.5px;
        color: var(--mu);
        line-height: 1.7;
      }
      .svc-empty-btn {
        margin-top: 8px;
        border-radius: 999px;
        background: var(--lime);
        color: #1c2a06;
        padding: 9px 18px;
        font-size: 12.5px;
        font-weight: 700;
      }

      @media (max-width: 760px) {
        .shead h2 {
          font-size: 20px;
        }
        .lhead {
          font-size: 22px;
        }
        .lrow {
          flex-direction: column;
        }
        .lph {
          width: 100%;
          aspect-ratio: 16 / 9;
        }
      }
    `}</style>
  );
}
