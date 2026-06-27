'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Article, ArticleType } from '@/lib/mock';

/**
 * 記事一覧のデフォルトレイアウト（フルスクリーン Hero + 国/カテゴリ/検索フィルタ）。
 *
 * - 最上部はフルスクリーンの Hero（大見出し＋検索＋国フィルタ＋詳細設定）
 * - 記事タイプの選択は SUUMO 方式で「詳細設定」パネルに格納（重複表示しない）
 * - カード表示（既定）/ リスト表示をボタンで切替
 * - 検索すると小さいカードのグリッドで結果表示
 *
 * フォントはサンセリフ（Noto Sans JP）＋モノ（JetBrains Mono）のみ。明朝は使わない。
 */

type Country = { slug: string; code: string; nameJa: string; emoji: string };

type Props = {
  articles: Article[];
  countries: Country[];
  initialCountry?: string;
  initialCat?: 'all' | ArticleType;
  moreHref?: string;
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

const CSS = `@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Noto+Sans+JP:wght@400;500;700;900&display=swap');
.aj{--card:#FFFFFF;--bg2:#ECECE4;--ink:#111111;--mu:rgba(17,17,17,.56);--mu2:rgba(17,17,17,.34);--line:#E4E4DC;--lime:#A8E01C;--lime-soft:rgba(168,224,28,.16);--lime-d:#5E8B0E;--lime-l:#E3F7B8;--mono:'JetBrains Mono',ui-monospace,monospace;--jp:'Noto Sans JP',system-ui,sans-serif;--ease:cubic-bezier(.22,1,.36,1);position:relative;font-family:var(--jp);color:var(--ink);line-height:1.6}
.aj *{box-sizing:border-box}
.aj a{color:inherit;text-decoration:none}
.aj img{display:block;max-width:100%}
.aj .wrap{max-width:1200px;margin:0 auto;padding:0 26px}

/* HERO */
.aj-hero{position:relative;min-height:calc(100svh - 56px);display:flex;flex-direction:column;justify-content:center;overflow:hidden;padding:56px 0 40px}
.aj-blob{position:absolute;border-radius:50%;filter:blur(70px);z-index:0;pointer-events:none}
.aj-b1{width:520px;height:520px;background:var(--lime);opacity:.22;top:-120px;right:-100px;animation:ajfloat 16s var(--ease) infinite}
.aj-b2{width:380px;height:380px;background:var(--lime-l);opacity:.7;bottom:40px;left:-120px;animation:ajfloat 22s var(--ease) infinite reverse}
.aj-b3{width:300px;height:300px;background:var(--lime);opacity:.10;top:40%;left:44%;animation:ajfloat 19s var(--ease) infinite}
@keyframes ajfloat{0%,100%{transform:translate(0,0)}50%{transform:translate(28px,-32px)}}
.aj-hero .inner{position:relative;z-index:2;width:100%}
.aj-eyebrow{font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.26em;text-transform:uppercase;color:var(--lime-d);display:inline-flex;align-items:center;gap:11px}
.aj-eyebrow::before{content:"";width:26px;height:1.5px;background:var(--lime-d)}
.aj-hero h1{font-weight:900;letter-spacing:-.03em;line-height:1.0;font-size:clamp(40px,8.4vw,104px);margin-top:22px}
.aj-hero h1 em{font-style:normal;color:var(--lime-d)}
.aj-hero .sub{margin-top:22px;max-width:540px;font-size:15px;line-height:1.95;color:var(--mu)}
.aj-controls{margin-top:34px;max-width:780px}
.aj-srow{display:flex;gap:10px;align-items:stretch}
.aj-country{position:relative;flex:none}
.aj-country select{appearance:none;width:100%;font-family:var(--mono);font-size:13.5px;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:14px;height:56px;padding:0 40px 0 44px;cursor:pointer;transition:border-color .25s}
.aj-country select:hover{border-color:var(--lime)}
.aj-country .g{position:absolute;left:16px;top:50%;transform:translateY(-50%);width:18px;height:18px;color:var(--mu);pointer-events:none}
.aj-country .c{position:absolute;right:15px;top:50%;transform:translateY(-50%);width:14px;height:14px;color:var(--mu);pointer-events:none}
.aj-sbox{flex:1;min-width:0;display:flex;align-items:center;gap:12px;height:56px;padding:0 18px;border-radius:14px;background:var(--card);border:1px solid var(--line);box-shadow:0 8px 26px rgba(17,17,17,.06);transition:border-color .25s,box-shadow .25s}
.aj-sbox:focus-within{border-color:var(--lime);box-shadow:0 8px 30px rgba(168,224,28,.18)}
.aj-sbox svg{width:19px;height:19px;color:var(--mu);flex:none}
.aj-sbox input{flex:1;min-width:0;border:none;outline:none;background:transparent;font-family:var(--jp);font-size:15px;color:var(--ink)}
.aj-sbox input::placeholder{color:var(--mu2)}
.aj-sbox .x{flex:none;border:none;background:var(--bg2);color:var(--mu);width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:12px}
.aj-adv-btn{flex:none;display:inline-flex;align-items:center;justify-content:center;gap:9px;height:56px;padding:0 18px;border-radius:14px;background:var(--card);border:1px solid var(--line);font-family:var(--mono);font-size:13px;color:var(--ink);cursor:pointer;transition:border-color .2s,background .2s}
.aj-adv-btn:hover{border-color:var(--lime)}
.aj-adv-btn.on{border-color:var(--lime);background:var(--lime-soft)}
.aj-adv-btn .badge{background:var(--lime);color:#0b0c09;font-size:10px;font-weight:600;border-radius:999px;padding:1px 7px}
.aj-adv-btn .cv{width:13px;height:13px;transition:transform .25s}
.aj-adv-btn.on .cv{transform:rotate(180deg)}
.aj-adv{margin-top:12px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 18px 20px}
.aj-adv .lab{font-family:var(--mono);font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--mu2);margin-bottom:12px}
.aj-cats{display:flex;gap:8px;flex-wrap:wrap}
.aj-cat{font-family:var(--mono);font-size:12.5px;font-weight:500;padding:9px 15px;border-radius:999px;border:1px solid var(--line);background:var(--card);cursor:pointer;transition:all .2s}
.aj-cat:hover{border-color:var(--lime)}
.aj-cat.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.aj-cat.on.all{background:var(--lime);color:#0b0c09;border-color:var(--lime)}
.aj-cat .n{opacity:.5;margin-left:4px}
.aj-scroll{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);z-index:2;font-family:var(--mono);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--mu2);display:flex;flex-direction:column;align-items:center;gap:8px}
.aj-scroll .ln{width:1px;height:30px;background:linear-gradient(var(--lime),transparent)}
@media(max-width:720px){
  .aj-hero{min-height:calc(100svh - 56px);justify-content:center;padding:40px 0}
  .aj-hero h1{font-size:clamp(31px,8.8vw,46px);line-height:1.12}
  .aj-hero .sub{margin-top:18px}
  .aj-controls{margin-top:30px}
  .aj-srow{flex-direction:column}
  .aj-country,.aj-adv-btn{width:100%}
  .aj-country select,.aj-sbox{height:52px}
  .aj-scroll{display:none}
}

/* FEED */
.aj-feedwrap{position:relative;padding:56px 0 90px}
.aj-rhead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:24px}
.aj-count{font-family:var(--mono);font-size:13px;color:var(--mu)}
.aj-count b{color:var(--ink);font-weight:600}
.aj-view{display:flex;gap:4px;background:var(--bg2);border-radius:10px;padding:4px}
.aj-view button{width:36px;height:32px;border:none;background:transparent;border-radius:7px;color:var(--mu);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.2s}
.aj-view button svg{width:17px;height:17px}
.aj-view button.on{background:var(--card);color:var(--ink);box-shadow:0 1px 3px rgba(17,17,17,.12)}

.aj-feed{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}
@media(max-width:680px){.aj-feed{grid-template-columns:1fr;gap:16px}}
.aj-post{position:relative;display:block;border-radius:20px;overflow:hidden;border:1px solid var(--line);background:var(--card);box-shadow:0 14px 38px rgba(17,17,17,.10);transition:transform .45s var(--ease),border-color .45s,box-shadow .45s}
.aj-post:hover{transform:translateY(-4px);border-color:rgba(168,224,28,.5);box-shadow:0 22px 50px rgba(17,17,17,.14)}
.aj-post.lead{grid-column:1 / -1;box-shadow:0 0 0 1.5px rgba(168,224,28,.5),0 22px 54px rgba(17,17,17,.13)}
.aj-cov{position:relative;aspect-ratio:16/11;overflow:hidden;background:var(--bg2)}
.aj-post.lead .aj-cov{aspect-ratio:21/9}
@media(max-width:680px){.aj-cov,.aj-post.lead .aj-cov{aspect-ratio:4/3}}
.aj-cov img{width:100%;height:100%;object-fit:cover;transition:transform 1.1s var(--ease)}
.aj-post:hover .aj-cov img{transform:scale(1.05)}
.aj-cov::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(6,8,4,.94) 0%,rgba(6,8,4,.78) 22%,rgba(6,8,4,.34) 46%,rgba(6,8,4,.04) 70%,transparent 100%)}
.aj-tags{position:absolute;top:16px;left:16px;z-index:3;display:flex;gap:7px;flex-wrap:wrap}
.aj-tags span{font-family:var(--mono);font-size:10px;letter-spacing:.04em;color:#F4F4EF;background:rgba(15,17,10,.5);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(8px);padding:5px 10px;border-radius:999px}
.aj-tags .pick{background:var(--lime);color:#0b0c09;border-color:var(--lime);font-weight:600}
.aj-body{position:absolute;inset:auto 0 0 0;z-index:3;padding:20px;display:flex;align-items:flex-end;justify-content:space-between;gap:16px}
.aj-h{flex:1;min-width:0}
.aj-body h2{font-weight:700;letter-spacing:-.01em;line-height:1.22;font-size:18px;color:#fff;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.aj-post.lead .aj-body h2{font-size:clamp(22px,3vw,34px)}
.aj-who{margin-top:11px;display:flex;align-items:center;gap:9px;font-family:var(--mono);font-size:11.5px;color:rgba(255,255,255,.82);flex-wrap:wrap}
.aj-who img{width:24px;height:24px;border-radius:50%;object-fit:cover;border:1px solid rgba(255,255,255,.25)}
.aj-who b{color:#fff;font-weight:500}
.aj-who .tier{color:var(--lime)}
.aj-who .sep{width:3px;height:3px;border-radius:50%;background:rgba(255,255,255,.4)}
.aj-go{flex:none;width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--lime);color:#0b0c09;box-shadow:0 8px 22px rgba(168,224,28,.35);transition:transform .3s var(--ease)}
.aj-go svg{width:18px;height:18px}
.aj-post:hover .aj-go{transform:rotate(-12deg) scale(1.06)}

/* LIST view */
.aj-list{display:flex;flex-direction:column}
.aj-lrow{display:flex;gap:16px;align-items:center;padding:16px 6px;border-bottom:1px solid var(--line);transition:padding .3s var(--ease)}
.aj-lrow:first-child{border-top:1px solid var(--line)}
.aj-lrow:hover{padding-left:14px}
.aj-lthumb{width:128px;flex:none;aspect-ratio:16/11;border-radius:10px;overflow:hidden;background:var(--bg2)}
.aj-lthumb img{width:100%;height:100%;object-fit:cover}
.aj-lbody{flex:1;min-width:0}
.aj-lcat{font-family:var(--mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--lime-d);font-weight:600}
.aj-lrow h3{font-size:16px;font-weight:700;line-height:1.34;margin-top:5px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.aj-lmeta{margin-top:7px;font-family:var(--mono);font-size:11.5px;color:var(--mu);display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.aj-lmeta .tier{color:var(--lime-d)}
.aj-lgo{flex:none;color:var(--lime-d)}
.aj-lgo svg{width:18px;height:18px}
@media(max-width:560px){.aj-lthumb{width:100px}.aj-lrow h3{font-size:14px}}

.aj-results{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
@media(max-width:900px){.aj-results{grid-template-columns:repeat(2,1fr)}}
@media(max-width:540px){.aj-results{grid-template-columns:1fr}}
.aj-rcard{display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden;box-shadow:0 8px 22px rgba(17,17,17,.07);transition:transform .3s var(--ease),border-color .3s}
.aj-rcard:hover{transform:translateY(-3px);border-color:var(--lime)}
.aj-rcov{aspect-ratio:16/10;overflow:hidden;background:var(--bg2)}
.aj-rcov img{width:100%;height:100%;object-fit:cover}
.aj-rb{padding:12px 14px 14px;display:flex;flex-direction:column;gap:6px}
.aj-rcat{font-family:var(--mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--lime-d);font-weight:600}
.aj-rb h3{font-size:14px;font-weight:700;line-height:1.34}
.aj-rmeta{font-family:var(--mono);font-size:11px;color:var(--mu)}
.aj-nores{padding:60px 0;text-align:center;font-size:13px;color:var(--mu)}
.aj-end{text-align:center;padding:44px 0 0}
.aj-more{display:inline-flex;align-items:center;gap:9px;font-family:var(--mono);font-size:13px;color:var(--ink);border:1px solid var(--line);padding:14px 30px;border-radius:999px;transition:.25s}
.aj-more:hover{border-color:var(--lime);color:var(--lime-d);background:var(--lime-soft)}
`;

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
        {lead ? <span className="pick">Editor’s Pick</span> : null}
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

function ListRow({ a }: { a: Article }) {
  const date = a.publishedAt ? md(a.publishedAt) : '';
  return (
    <Link className="aj-lrow" href={`/articles/${a.id}`}>
      <div className="aj-lthumb">
        {a.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.coverImageUrl} alt="" loading="lazy" />
        ) : null}
      </div>
      <div className="aj-lbody">
        <div className="aj-lcat">{TYPE_LABEL[a.articleType] ?? a.articleType}</div>
        <h3>{a.title}</h3>
        <div className="aj-lmeta">
          {a.area ? <span>{a.area}</span> : null}
          <span>{a.writerName ?? '匿名'}</span>
          {a.writerTier ? <span className="tier">{TIER_LABEL[a.writerTier]}</span> : null}
          {date ? <span>{date}</span> : null}
        </div>
      </div>
      <span className="aj-lgo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}

export function ArticleJournal({
  articles,
  countries,
  initialCountry = 'all',
  initialCat = 'all',
  moreHref,
}: Props) {
  const [q, setQ] = useState('');
  const [country, setCountry] = useState(initialCountry);
  const [cat, setCat] = useState<'all' | ArticleType>(initialCat);
  const [advOpen, setAdvOpen] = useState(false);
  const [view, setView] = useState<'card' | 'list'>('card');

  const byCountry = useMemo(
    () =>
      country === 'all'
        ? articles
        : articles.filter((a) => a.countryCode === country),
    [articles, country],
  );
  const byCat = useMemo(
    () => (cat === 'all' ? byCountry : byCountry.filter((a) => a.articleType === cat)),
    [byCountry, cat],
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

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: byCountry.length };
    for (const a of byCountry) c[a.articleType] = (c[a.articleType] ?? 0) + 1;
    return c;
  }, [byCountry]);

  const searching = query.length > 0;
  const shown = searching ? results : byCat;
  const lead = byCat[0];
  const rest = byCat.slice(1);
  const advCount = cat !== 'all' ? 1 : 0;

  return (
    <div className="aj">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* HERO */}
      <header className="aj-hero">
        <div className="aj-blob aj-b1" />
        <div className="aj-blob aj-b2" />
        <div className="aj-blob aj-b3" />
        <div className="wrap inner">
          <div className="aj-eyebrow">Journal — 在外邦人がつくる、街の物語</div>
          <h1>
            住む人が見ている、
            <br />
            街の<em>素顔</em>。
          </h1>
          <p className="sub">
            ガイドブックには載らない一次情報。路地裏のパン屋、蚤の市の歩き方、子連れで行ける日常の場所。
            現地で暮らす書き手が、短く、深く綴る記録。
          </p>

          <div className="aj-controls">
            <div className="aj-srow">
              <div className="aj-country">
                <svg className="g" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3.3 12h17.4M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
                </svg>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  aria-label="国で絞り込む"
                >
                  <option value="all">すべての国</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.emoji} {c.nameJa}
                    </option>
                  ))}
                </select>
                <svg className="c" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
              <div className="aj-sbox">
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
                  <button className="x" onClick={() => setQ('')} aria-label="クリア">
                    ✕
                  </button>
                ) : null}
              </div>
              <button
                className={`aj-adv-btn${advOpen ? ' on' : ''}`}
                onClick={() => setAdvOpen((v) => !v)}
                aria-expanded={advOpen}
              >
                詳細設定
                {advCount > 0 ? <span className="badge">{advCount}</span> : null}
                <svg className="cv" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>

            {advOpen ? (
              <div className="aj-adv">
                <div className="lab">記事タイプ</div>
                <div className="aj-cats">
                  {CATS.map((c) => (
                    <button
                      key={c.id}
                      className={`aj-cat${cat === c.id ? ' on' : ''}${c.id === 'all' ? ' all' : ''}`}
                      onClick={() => setCat(c.id)}
                    >
                      {c.label}
                      <span className="n">{counts[c.id] ?? 0}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div className="aj-scroll">
          Scroll
          <span className="ln" />
        </div>
      </header>

      {/* FEED */}
      <section className="aj-feedwrap">
        <div className="wrap">
          <div className="aj-rhead">
            <span className="aj-count">
              全 <b>{shown.length}</b> 件
              {cat !== 'all' ? ` · ${TYPE_LABEL[cat]}` : ''}
            </span>
            {!searching ? (
              <div className="aj-view" role="group" aria-label="表示切替">
                <button
                  className={view === 'card' ? 'on' : ''}
                  onClick={() => setView('card')}
                  aria-label="カード表示"
                  aria-pressed={view === 'card'}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="3" width="8" height="8" rx="1.5" />
                    <rect x="13" y="3" width="8" height="8" rx="1.5" />
                    <rect x="3" y="13" width="8" height="8" rx="1.5" />
                    <rect x="13" y="13" width="8" height="8" rx="1.5" />
                  </svg>
                </button>
                <button
                  className={view === 'list' ? 'on' : ''}
                  onClick={() => setView('list')}
                  aria-label="リスト表示"
                  aria-pressed={view === 'list'}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
                  </svg>
                </button>
              </div>
            ) : null}
          </div>

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
                      <div className="aj-rcat">{TYPE_LABEL[a.articleType] ?? a.articleType}</div>
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
            <p className="aj-nores">この条件の記事はまだありません。</p>
          ) : view === 'list' ? (
            <div className="aj-list">
              {byCat.map((a) => (
                <ListRow key={a.id} a={a} />
              ))}
            </div>
          ) : (
            <div className="aj-feed">
              {lead ? <BigCard a={lead} lead /> : null}
              {rest.map((a) => (
                <BigCard key={a.id} a={a} />
              ))}
            </div>
          )}

          {!searching && moreHref ? (
            <div className="aj-end">
              <Link className="aj-more" href={moreHref}>
                もっと読む
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
