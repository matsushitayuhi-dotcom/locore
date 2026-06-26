'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Article, ArticleType } from '@/lib/mock';

/**
 * 記事一覧のデフォルトレイアウト（ポートフォリオ風 split layout）。
 *
 * - 上部に検索窓（入力すると小さいカードのグリッドで結果表示）
 * - 左：固定のイントロ・レール（ステートメント / カテゴリ＝ナビ）
 * - 右：大きな没入カードを縦積み（グリッドではない）
 *
 * 配色はサイトのライム＋クリーム。フォントは LandingClient と同様に
 * スコープ付き CSS（.aj 配下）で @import して読み込む。
 */

type Props = {
  articles: Article[];
  /** 「もっと読む」リンク先。未指定ならボタンを出さない（全件表示済みのページ用） */
  moreHref?: string;
  /** 初期カテゴリ（?type= から渡す） */
  initialCat?: 'all' | ArticleType;
};

const TYPE_LABEL: Record<string, string> = {
  spot_guide: 'スポット紹介',
  itinerary: '旅程プラン',
  expat_info: 'お役立ち情報',
};

const TIER_LABEL: Record<string, string> = {
  S: '駐在員 S',
  A: '駐在員 A',
  B: '駐在員 B',
};

const CATS: { id: 'all' | ArticleType; label: string }[] = [
  { id: 'all', label: 'すべて' },
  { id: 'spot_guide', label: 'スポット紹介' },
  { id: 'itinerary', label: '旅程プラン' },
  { id: 'expat_info', label: 'お役立ち情報' },
];

function md(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+JP:wght@400;500;700;900&display=swap');
.aj{--card:#FFFFFF;--bg2:#ECECE4;--ink:#111111;--mu:rgba(17,17,17,.56);--mu2:rgba(17,17,17,.34);--line:#E4E4DC;--lime:#A8E01C;--lime-soft:rgba(168,224,28,.16);--lime-d:#5E8B0E;--mono:'JetBrains Mono',ui-monospace,monospace;--serif:'Instrument Serif',serif;--jp:'Noto Sans JP',system-ui,sans-serif;--ease:cubic-bezier(.22,1,.36,1);position:relative;font-family:var(--jp);color:var(--ink);line-height:1.6}
.aj *{box-sizing:border-box}
.aj::before{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;background:radial-gradient(820px 560px at 82% -4%,rgba(168,224,28,.20),transparent 62%),radial-gradient(620px 460px at -6% 16%,rgba(168,224,28,.10),transparent 58%)}
.aj a{color:inherit;text-decoration:none}
.aj img{display:block;max-width:100%}

.aj-search{position:relative;z-index:5;padding:6px 0 0}
.aj-searchwrap{display:flex;align-items:center;gap:12px;height:56px;padding:0 18px;border-radius:16px;background:var(--card);border:1px solid var(--line);box-shadow:0 8px 26px rgba(17,17,17,.06);transition:border-color .25s,box-shadow .25s}
.aj-searchwrap:focus-within{border-color:var(--lime);box-shadow:0 8px 30px rgba(168,224,28,.18)}
.aj-searchwrap svg{width:19px;height:19px;color:var(--mu);flex:none}
.aj-searchwrap input{flex:1;min-width:0;border:none;outline:none;background:transparent;font-family:var(--jp);font-size:15px;color:var(--ink)}
.aj-searchwrap input::placeholder{color:var(--mu2)}
.aj-clear{flex:none;border:none;background:var(--bg2);color:var(--mu);width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:12px;line-height:1}
.aj-clear:hover{color:var(--ink)}

.aj-shell{position:relative;z-index:2;display:grid;grid-template-columns:minmax(300px,.86fr) 1.6fr;gap:56px;align-items:start;margin-top:22px}
@media(max-width:960px){.aj-shell{grid-template-columns:1fr;gap:6px}}

.aj-side{position:sticky;top:64px;display:flex;flex-direction:column;padding:8px 0 30px}
@media(max-width:960px){.aj-side{position:static;padding:30px 0 16px}}
.aj-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
.aj-brand{font-family:var(--serif);font-size:28px;letter-spacing:.01em;display:flex;align-items:center;gap:9px}
.aj-dot{width:8px;height:8px;border-radius:50%;background:var(--lime);box-shadow:0 0 14px var(--lime)}
.aj-mark{width:90px;height:90px;flex:none;overflow:visible;margin-top:-4px}
.aj-mark .a{transform-box:fill-box;transform-origin:center;animation:ajspin 24s linear infinite}
.aj-mark .b{transform-box:fill-box;transform-origin:center;animation:ajspin 55s linear infinite reverse}
@keyframes ajspin{to{transform:rotate(360deg)}}
@media(max-width:960px){.aj-mark{width:66px;height:66px}}
.aj-statement{font-weight:900;letter-spacing:-.02em;line-height:1.08;font-size:clamp(32px,3.4vw,48px);margin-top:42px}
@media(max-width:960px){.aj-statement{margin-top:26px}}
.aj-statement em{font-family:var(--serif);font-style:italic;font-weight:400;color:var(--lime-d)}
.aj-intro{margin-top:20px;max-width:380px;font-size:14px;line-height:1.95;color:var(--mu)}
.aj-write{margin-top:24px;display:inline-flex;align-items:center;gap:10px;align-self:flex-start;font-family:var(--mono);font-size:12.5px;border:1px solid var(--line);padding:12px 20px;border-radius:999px;transition:.25s}
.aj-write:hover{border-color:var(--lime);color:var(--lime-d)}
.aj-write svg{width:14px;height:14px;transition:transform .25s var(--ease)}
.aj-write:hover svg{transform:translateX(4px)}
.aj-filt{margin-top:38px}
.aj-filt .lab{font-family:var(--mono);font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--mu2)}
.aj-filt ul{list-style:none;margin:14px 0 0;padding:0;display:flex;flex-direction:column;gap:2px}
.aj-filt button{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:none;border:none;cursor:pointer;padding:9px 0;font-family:var(--jp);font-size:18px;font-weight:700;color:var(--mu);transition:color .25s,padding .3s var(--ease)}
.aj-filt button .cnt{font-family:var(--mono);font-size:11px;font-weight:500;color:var(--mu2)}
.aj-filt button:hover{color:var(--ink);padding-left:8px}
.aj-filt button.on{color:var(--ink)}
.aj-filt button.on::before{content:"";width:18px;height:2px;background:var(--lime);border-radius:2px}
@media(max-width:960px){
  .aj-filt ul{flex-direction:row;flex-wrap:wrap;gap:8px}
  .aj-filt button{width:auto;font-size:13px;font-family:var(--mono);font-weight:500;border:1px solid var(--line);border-radius:999px;padding:8px 14px}
  .aj-filt button:hover{padding-left:14px}
  .aj-filt button.on{background:var(--lime);color:#0b0c09;border-color:var(--lime)}
  .aj-filt button.on::before{display:none}
}

.aj-feed{padding:0 0 20px;display:flex;flex-direction:column;gap:22px}

.aj-post{position:relative;display:block;border-radius:22px;overflow:hidden;border:1px solid var(--line);background:var(--card);box-shadow:0 16px 40px rgba(17,17,17,.10);transition:transform .5s var(--ease),border-color .5s,box-shadow .5s}
.aj-post:hover{transform:translateY(-4px);border-color:rgba(168,224,28,.5);box-shadow:0 24px 54px rgba(17,17,17,.14)}
.aj-post.lead{box-shadow:0 0 0 1.5px rgba(168,224,28,.55),0 22px 56px rgba(17,17,17,.14)}
.aj-cov{position:relative;aspect-ratio:16/11;overflow:hidden;background:var(--bg2)}
.aj-post.lead .aj-cov{aspect-ratio:16/10}
.aj-cov img{width:100%;height:100%;object-fit:cover;transition:transform 1.2s var(--ease);filter:saturate(.95)}
.aj-post:hover .aj-cov img{transform:scale(1.05)}
.aj-cov::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,9,6,.36) 0%,rgba(8,9,6,0) 30%,rgba(8,9,6,.18) 55%,rgba(8,9,6,.9) 100%)}
.aj-tags{position:absolute;top:18px;left:18px;z-index:3;display:flex;gap:8px;flex-wrap:wrap}
.aj-tags span{font-family:var(--mono);font-size:10.5px;letter-spacing:.05em;color:#F4F4EF;background:rgba(15,17,10,.5);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(8px);padding:6px 11px;border-radius:999px}
.aj-tags .pick{background:var(--lime);color:#0b0c09;border-color:var(--lime);font-weight:600}
.aj-body{position:absolute;inset:auto 0 0 0;z-index:3;padding:24px;display:flex;align-items:flex-end;justify-content:space-between;gap:18px}
.aj-h{flex:1;min-width:0}
.aj-body h2{font-weight:700;letter-spacing:-.01em;line-height:1.18;font-size:clamp(20px,2.4vw,29px);color:#fff}
.aj-post.lead .aj-body h2{font-size:clamp(25px,3.2vw,40px)}
.aj-who{margin-top:14px;display:flex;align-items:center;gap:10px;font-family:var(--mono);font-size:12px;color:rgba(255,255,255,.82);flex-wrap:wrap}
.aj-who img{width:28px;height:28px;border-radius:50%;object-fit:cover;border:1px solid rgba(255,255,255,.25)}
.aj-who b{color:#fff;font-weight:500}
.aj-who .tier{color:var(--lime)}
.aj-who .sep{width:3px;height:3px;border-radius:50%;background:rgba(255,255,255,.4)}
.aj-go{flex:none;width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--lime);color:#0b0c09;transition:transform .3s var(--ease);box-shadow:0 8px 24px rgba(168,224,28,.35)}
.aj-go svg{width:19px;height:19px}
.aj-post:hover .aj-go{transform:rotate(-12deg) scale(1.06)}
@media(max-width:520px){.aj-body{flex-direction:column;align-items:flex-start;gap:14px}.aj-go{align-self:flex-end}}

.aj-results{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
@media(max-width:520px){.aj-results{grid-template-columns:1fr}}
.aj-rcard{display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:15px;overflow:hidden;box-shadow:0 8px 24px rgba(17,17,17,.07);transition:transform .3s var(--ease),border-color .3s,box-shadow .3s}
.aj-rcard:hover{transform:translateY(-3px);border-color:var(--lime);box-shadow:0 16px 36px rgba(17,17,17,.12)}
.aj-rcov{aspect-ratio:16/10;overflow:hidden;background:var(--bg2)}
.aj-rcov img{width:100%;height:100%;object-fit:cover;transition:transform .6s var(--ease)}
.aj-rcard:hover .aj-rcov img{transform:scale(1.06)}
.aj-rb{padding:13px 15px 15px;display:flex;flex-direction:column;gap:7px}
.aj-rcat{font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--lime-d);font-weight:600}
.aj-rb h3{font-size:14.5px;font-weight:700;line-height:1.36;letter-spacing:-.01em}
.aj-rmeta{font-family:var(--mono);font-size:11px;color:var(--mu)}
.aj-nores{padding:50px 0;text-align:center;font-size:13px;color:var(--mu)}

.aj-end{text-align:center;padding:30px 0 20px}
.aj-more{display:inline-flex;align-items:center;gap:9px;font-family:var(--mono);font-size:13px;color:var(--ink);border:1px solid var(--line);padding:14px 30px;border-radius:999px;transition:.25s}
.aj-more:hover{border-color:var(--lime);color:var(--lime-d);background:var(--lime-soft)}
`;

export function ArticleJournal({ articles, moreHref, initialCat = 'all' }: Props) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<'all' | ArticleType>(initialCat);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: articles.length };
    for (const a of articles) c[a.articleType] = (c[a.articleType] ?? 0) + 1;
    return c;
  }, [articles]);

  const byCat = useMemo(
    () => (cat === 'all' ? articles : articles.filter((a) => a.articleType === cat)),
    [articles, cat],
  );

  const query = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (!query) return [];
    return byCat.filter((a) =>
      `${a.title} ${a.area ?? ''} ${TYPE_LABEL[a.articleType] ?? ''}`
        .toLowerCase()
        .includes(query),
    );
  }, [byCat, query]);

  const searching = query.length > 0;
  const lead = byCat[0];
  const rest = byCat.slice(1);

  return (
    <div className="aj">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* SEARCH */}
      <div className="aj-search">
        <div className="aj-searchwrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="記事を検索 — 例: 蚤の市、子連れ、リヨン"
            autoComplete="off"
            aria-label="記事を検索"
          />
          {q ? (
            <button className="aj-clear" onClick={() => setQ('')} aria-label="クリア">
              ✕
            </button>
          ) : null}
        </div>
      </div>

      <div className="aj-shell">
        {/* LEFT RAIL */}
        <aside className="aj-side">
          <div className="aj-top">
            <div className="aj-brand">
              Locore<span className="aj-dot" />
            </div>
            <svg className="aj-mark" viewBox="0 0 120 120" aria-hidden="true">
              <g className="b">
                <circle cx="60" cy="60" r="47" fill="none" stroke="#A8E01C" strokeOpacity=".32" strokeWidth="1" strokeDasharray="1.5 9" strokeLinecap="round" />
              </g>
              <g className="b" style={{ animationDuration: '95s' }}>
                <circle cx="60" cy="60" r="34" fill="none" stroke="#A8E01C" strokeOpacity=".16" strokeWidth="1" />
              </g>
              <g className="a">
                <path d="M60 21 C62.6 49, 71 57.4, 99 60 C71 62.6, 62.6 71, 60 99 C57.4 71, 49 62.6, 21 60 C49 57.4, 57.4 49, 60 21 Z" fill="#A8E01C" fillOpacity=".92" />
              </g>
              <circle cx="60" cy="60" r="3.4" fill="#F4F4EF" />
            </svg>
          </div>

          <h2 className="aj-statement">
            住む人が見ている、
            <br />
            街の<em>素顔</em>。
          </h2>
          <p className="aj-intro">
            ガイドブックには載らない一次情報。路地裏のパン屋、蚤の市の歩き方、子連れで行ける日常の場所。
            現地で暮らす書き手が、短く、深く綴る記録。
          </p>
          <Link className="aj-write" href="/writer/articles/new">
            記事を書く
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>

          <nav className="aj-filt">
            <div className="lab">Categories</div>
            <ul>
              {CATS.map((c) => (
                <li key={c.id}>
                  <button
                    className={cat === c.id ? 'on' : ''}
                    onClick={() => setCat(c.id)}
                  >
                    {c.label} <span className="cnt">{counts[c.id] ?? 0}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* RIGHT */}
        <main className="aj-feed">
          {searching ? (
            results.length > 0 ? (
              <div className="aj-results">
                {results.map((a) => (
                  <Link key={a.id} className="aj-rcard" href={`/articles/${a.id}`}>
                    <div className="aj-rcov">
                      {a.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.coverImageUrl} alt="" loading="lazy" />
                      ) : null}
                    </div>
                    <div className="aj-rb">
                      <div className="aj-rcat">
                        {TYPE_LABEL[a.articleType] ?? a.articleType}
                      </div>
                      <h3>{a.title}</h3>
                      <div className="aj-rmeta">{a.area || '—'}</div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="aj-nores">
                「{q}」に一致する記事が見つかりませんでした。別のキーワードでお試しください。
              </p>
            )
          ) : byCat.length === 0 ? (
            <p className="aj-nores">このカテゴリの記事はまだありません。</p>
          ) : (
            <>
              {lead ? <BigCard a={lead} lead /> : null}
              {rest.map((a) => (
                <BigCard key={a.id} a={a} />
              ))}
            </>
          )}
        </main>

        {!searching && moreHref ? (
          <div className="aj-end" style={{ gridColumn: '1 / -1' }}>
            <Link className="aj-more" href={moreHref}>
              もっと読む
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BigCard({ a, lead = false }: { a: Article; lead?: boolean }) {
  const date = a.publishedAt ? md(a.publishedAt) : '';
  return (
    <Link className={`aj-post${lead ? ' lead' : ''}`} href={`/articles/${a.id}`}>
      <div className="aj-cov">
        {a.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.coverImageUrl} alt="" loading="lazy" />
        ) : null}
      </div>
      <div className="aj-tags">
        {lead ? <span className="pick">Editor's Pick</span> : null}
        <span>{TYPE_LABEL[a.articleType] ?? a.articleType}</span>
        {a.area ? <span>{a.area}</span> : null}
      </div>
      <div className="aj-body">
        <div className="aj-h">
          <h2>{a.title}</h2>
          <div className="aj-who">
            {a.writerAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.writerAvatarUrl} alt="" />
            ) : null}
            <b>{a.writerName ?? '匿名'}</b>
            {a.writerTier ? <span className="tier">{TIER_LABEL[a.writerTier]}</span> : null}
            {date ? (
              <>
                <span className="sep" />
                {date}
              </>
            ) : null}
          </div>
        </div>
        <span className="aj-go">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
