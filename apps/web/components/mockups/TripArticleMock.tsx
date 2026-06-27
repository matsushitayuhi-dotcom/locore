'use client';

import { useEffect, useRef } from 'react';
import {
  AUTHOR,
  AUTHOR_AVATAR,
  HERO_PHOTO,
  placeMapUrl,
  RELATED,
  routeEmbedUrl,
  STOPS,
  TIPS,
  TRIP,
} from './tripData';

/**
 * 旅程系（イチネラリー）ブログ記事ページのモックアップ案 A（タイムライン主役）。
 *
 * - ランディング (LandingClient) と同じ世界観: フルブリードのダークヒーロー
 *   ＋ ライムの network canvas ＋ Space Grotesk / JetBrains Mono / Noto Sans JP。
 * - データ/ブロックモデルは tripData.ts に集約（B/C 案と共有）。本番の型には依存しない。
 * - scoped CSS（`.tj-` 接頭辞）＋ `useEffect` で network / reveal / scroll を駆動。
 * - グローバルの h1-h6 色上書き対策として、見出しは color を明示する。
 *
 * プレビュー: /mockup/trip-article
 */

/* ============================ CSS（scoped .tj-） ============================ */

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700;800;900&display=swap');

/* フルブリード（width:100vw）の数px はみ出し対策。100vw は縦スクロールバー幅を
   含むため、full-bleed セクションが内容幅より少し広くなり横スクロールが出る。
   ルートで overflow-x:clip して、その僅かなはみ出しを切り落とす。 */
.tj{--bg:#F4F4EF;--bg2:#ECECE4;--white:#fff;--ink:#111;--ink2:#2a2a28;--mu:#6E6E6E;--bd:#E7E7E0;--bd2:#D8D8CF;--lime:#A8E01C;--lime-d:#5E8B0E;--lime-l:#E3F7B8;--glow:rgba(168,224,28,.5);--mono:'JetBrains Mono',ui-monospace,monospace;--disp:'Space Grotesk','Noto Sans JP',sans-serif;--jp:'Noto Sans JP',system-ui,sans-serif;--ease:cubic-bezier(.22,1,.36,1);position:relative;background:var(--bg);color:var(--ink);font-family:var(--jp);line-height:1.75;-webkit-font-smoothing:antialiased;overflow-x:clip}
.tj *{box-sizing:border-box;margin:0;padding:0}
.tj a{color:inherit;text-decoration:none}
.tj img{display:block;max-width:100%}
.tj-wrap{max-width:760px;margin:0 auto;padding:0 24px}
.tj-wide{max-width:1180px;margin:0 auto;padding:0 24px}
.tj-kicker{font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--lime)}
.tj-kicker.dk{color:var(--lime-d)}

/* ===== HERO（フルブリード・100vh）===== */
.tj-hero{position:relative;width:100vw;left:50%;transform:translateX(-50%);min-height:100svh;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;color:#fff;background:#080a10}
.tj-hbg{position:absolute;inset:0;z-index:0;background-size:cover;background-position:center;animation:tjken 24s var(--ease) infinite alternate}
@keyframes tjken{from{transform:scale(1.06)}to{transform:scale(1.16)}}
.tj-hnet{position:absolute;inset:0;z-index:1;width:100%;height:100%}
.tj-hshade{position:absolute;inset:0;z-index:2;background:linear-gradient(180deg,rgba(8,10,16,.42) 0%,rgba(8,10,16,.18) 32%,rgba(8,10,16,.62) 72%,rgba(8,10,16,.95) 100%)}
.tj-hinner{position:relative;z-index:3;width:100%;max-width:1180px;margin:0 auto;padding:0 32px 64px}
.tj-hkick{display:inline-flex;align-items:center;gap:11px;font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--lime)}
.tj-hkick::before{content:"";width:30px;height:1.5px;background:var(--lime)}
.tj-hero h1{color:#fff;font-family:var(--disp);font-weight:800;letter-spacing:-.03em;line-height:1.04;font-size:clamp(38px,6.6vw,86px);margin-top:22px;max-width:17ch;text-shadow:0 2px 36px rgba(0,0,0,.5)}
.tj-hero h1 em{font-style:normal;color:var(--lime)}
.tj-hsub{margin-top:22px;max-width:560px;font-size:clamp(15px,1.7vw,18px);line-height:1.85;color:rgba(255,255,255,.84)}
.tj-hauthor{margin-top:30px;display:flex;align-items:center;gap:13px}
.tj-hauthor img{width:46px;height:46px;border-radius:50%;object-fit:cover;border:1.5px solid rgba(255,255,255,.4)}
.tj-hauthor .nm{font-weight:700;color:#fff;font-size:14.5px}
.tj-hauthor .meta{font-family:var(--mono);font-size:11.5px;color:rgba(255,255,255,.7);margin-top:2px}
.tj-hauthor .tier{color:var(--lime)}
.tj-hmeta{margin-top:30px;display:flex;flex-wrap:wrap;gap:10px}
.tj-pill{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:12.5px;font-weight:500;color:rgba(255,255,255,.92);background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(8px);padding:9px 15px;border-radius:999px}
.tj-pill b{color:var(--lime);font-weight:700}
.tj-scroll{position:absolute;left:50%;bottom:20px;transform:translateX(-50%);z-index:3;font-family:var(--mono);font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.6);display:flex;flex-direction:column;align-items:center;gap:9px;animation:tjbob 2.4s ease-in-out infinite}
@keyframes tjbob{0%,100%{transform:translate(-50%,0)}50%{transform:translate(-50%,7px)}}
.tj-scroll .ln{width:1px;height:34px;background:linear-gradient(var(--lime),transparent)}

/* ===== リード文 ===== */
.tj-lead{padding:88px 0 16px}
.tj-lead .tj-kicker{display:block;text-align:center;margin-bottom:26px}
.tj-lead p{font-family:var(--disp);font-weight:500;font-size:clamp(21px,2.7vw,30px);line-height:1.6;letter-spacing:-.012em;color:var(--ink);text-align:center}
.tj-lead p em{font-style:normal;color:var(--lime-d);background:linear-gradient(transparent 62%,var(--lime-l) 62%);padding:0 .08em}

/* ===== タイムライン（コア）===== */
.tj-tl{padding:72px 0 40px}
.tj-tlhead{text-align:center;margin-bottom:54px}
.tj-tlhead h2{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:clamp(28px,4vw,46px);letter-spacing:-.02em;margin-top:14px}
.tj-tlhead p{color:var(--mu);font-size:15px;margin-top:14px}
.tj-line{position:relative;padding-left:0}
/* 縦の幹 */
.tj-line::before{content:"";position:absolute;left:27px;top:14px;bottom:60px;width:2px;background:linear-gradient(var(--lime),var(--bd2) 92%);z-index:0}
@media(min-width:721px){.tj-line::before{left:35px}}
.tj-stop{position:relative;padding-left:74px;padding-bottom:14px}
@media(min-width:721px){.tj-stop{padding-left:92px}}
.tj-node{position:absolute;left:0;top:2px;z-index:2;width:56px;height:56px;border-radius:50%;background:var(--ink);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 8px 22px -6px rgba(0,0,0,.4),0 0 0 5px var(--bg)}
@media(min-width:721px){.tj-node{width:72px;height:72px}}
.tj-node .n{font-family:var(--mono);font-size:11px;font-weight:700;color:var(--lime);letter-spacing:.04em}
.tj-node .t{font-family:var(--disp);font-weight:700;font-size:13px;color:#fff;line-height:1;margin-top:2px}
@media(min-width:721px){.tj-node .t{font-size:15px}}
.tj-card{position:relative;background:var(--white);border:1px solid var(--bd);border-radius:20px;overflow:hidden;box-shadow:0 16px 40px -22px rgba(17,17,17,.22)}
.tj-cphoto{position:relative;aspect-ratio:16/9;overflow:hidden;background:var(--bg2)}
.tj-cphoto img{width:100%;height:100%;object-fit:cover;transition:transform 1.2s var(--ease)}
.tj-card:hover .tj-cphoto img{transform:scale(1.05)}
.tj-cphoto::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(6,8,4,.5),transparent 46%)}
.tj-ctag{position:absolute;top:14px;left:14px;z-index:2;font-family:var(--mono);font-size:10.5px;font-weight:600;letter-spacing:.04em;color:#0b0c09;background:var(--lime);padding:6px 12px;border-radius:999px}
.tj-ctime{position:absolute;bottom:13px;left:15px;z-index:2;font-family:var(--mono);font-size:12px;color:#fff;display:flex;align-items:center;gap:7px;text-shadow:0 1px 6px rgba(0,0,0,.6)}
.tj-ctime .dot{width:5px;height:5px;border-radius:50%;background:var(--lime)}
.tj-cbody{padding:22px 24px 24px}
.tj-chead{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
.tj-cbody h3{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:clamp(20px,2.4vw,26px);letter-spacing:-.015em;line-height:1.22}
.tj-maplink{flex:none;display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:11px;font-weight:600;color:var(--lime-d);background:var(--lime-l);border:1px solid rgba(168,224,28,.5);padding:7px 12px;border-radius:999px;white-space:nowrap;transition:background .2s,transform .2s}
.tj-maplink:hover{background:#d6f29a;transform:translateY(-1px)}
.tj-maplink svg{width:13px;height:13px}
.tj-cplace{margin-top:7px;font-family:var(--mono);font-size:11.5px;color:var(--mu);display:flex;align-items:center;gap:6px}
.tj-cplace svg{width:12px;height:12px;color:var(--lime-d);flex:none}
.tj-ctxt{margin-top:13px;font-size:14.5px;line-height:1.95;color:var(--ink2)}
.tj-cextras{margin-top:18px;display:flex;flex-wrap:wrap;gap:9px}
.tj-cost{display:inline-flex;align-items:center;gap:7px;font-family:var(--mono);font-size:12px;font-weight:600;color:var(--lime-d);background:var(--lime-l);border:1px solid rgba(168,224,28,.45);padding:6px 13px;border-radius:999px}
.tj-tipline{margin-top:14px;display:flex;gap:11px;align-items:flex-start;padding:12px 15px;border-radius:12px;background:var(--bg);border:1px dashed var(--bd2);font-size:12.5px;line-height:1.7;color:var(--ink2)}
.tj-tipline .ic{flex:none;color:var(--lime-d);margin-top:1px}
.tj-tipline b{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--lime-d);display:block;margin-bottom:2px}
/* コネクタ（次のスポットまで）*/
.tj-conn{position:relative;padding-left:74px;margin:6px 0 18px}
@media(min-width:721px){.tj-conn{padding-left:92px}}
.tj-conn .pill{display:inline-flex;align-items:center;gap:9px;font-family:var(--mono);font-size:12px;font-weight:500;color:var(--ink2);background:var(--white);border:1px solid var(--bd);border-radius:999px;padding:8px 16px;box-shadow:0 4px 14px -8px rgba(17,17,17,.2)}
.tj-conn .pill .ic{color:var(--lime-d)}
.tj-conn .lbl{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--mu);margin-right:2px}

/* ===== サマリースタッツ ===== */
.tj-summary{position:relative;width:100vw;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;padding:84px 0;margin-top:40px;overflow:hidden}
.tj-summary .glow{position:absolute;width:560px;height:560px;border-radius:50%;background:var(--lime);filter:blur(150px);opacity:.18;top:-220px;right:-80px}
.tj-summary .tj-wide{position:relative;z-index:2}
.tj-summary h2{color:#fff;font-family:var(--disp);font-weight:700;font-size:clamp(26px,3.6vw,42px);letter-spacing:-.02em;text-align:center}
.tj-summary .sub{text-align:center;color:rgba(255,255,255,.66);font-family:var(--mono);font-size:13px;margin-top:12px}
.tj-stats{margin-top:48px;display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.tj-stat{text-align:center;padding:30px 14px;border:1px solid rgba(255,255,255,.12);border-radius:18px;background:rgba(255,255,255,.04)}
.tj-stat .n{font-family:var(--disp);font-weight:800;font-size:clamp(30px,4vw,46px);line-height:1;color:#fff}
.tj-stat .n em{font-style:normal;color:var(--lime)}
.tj-stat .l{font-family:var(--mono);font-size:11.5px;letter-spacing:.08em;color:rgba(255,255,255,.6);margin-top:12px}

/* ===== Route Map（実 Google Maps 埋め込み）＋ tips ===== */
.tj-mapsec{padding:84px 0}
.tj-maphead{margin-bottom:24px}
.tj-maphead h2{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:clamp(24px,3.2vw,38px);letter-spacing:-.02em;margin-top:10px}
.tj-maphead p{color:var(--mu);font-size:14px;margin-top:10px}
.tj-mapgrid{display:grid;grid-template-columns:1.3fr .7fr;gap:36px;align-items:stretch}
.tj-mapframe{position:relative;border-radius:22px;overflow:hidden;border:1px solid var(--bd);min-height:420px;background:#dfe4e8;box-shadow:0 18px 44px -26px rgba(17,17,17,.3)}
.tj-mapframe iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block}
.tj-mapbadge{position:absolute;top:14px;left:14px;z-index:3;font-family:var(--mono);font-size:10.5px;font-weight:600;letter-spacing:.04em;color:#0b0c09;background:var(--lime);padding:7px 13px;border-radius:999px;box-shadow:0 6px 16px -6px var(--glow)}
.tj-maplist{display:flex;flex-direction:column;gap:0}
.tj-maplist .lab{font-family:var(--mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--lime-d);margin-bottom:8px}
.tj-mlrow{display:flex;align-items:center;gap:12px;padding:11px 2px;border-bottom:1px solid var(--bd)}
.tj-mlrow .num{flex:none;width:26px;height:26px;border-radius:50%;background:var(--ink);color:var(--lime);font-family:var(--mono);font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center}
.tj-mlrow .nm{flex:1;min-width:0;font-size:13.5px;font-weight:700;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tj-mlrow .tm{font-family:var(--mono);font-size:11px;color:var(--mu);flex:none}
.tj-mlrow a.pin{flex:none;color:var(--lime-d)}
.tj-mlrow a.pin svg{width:16px;height:16px}

/* ===== tips ===== */
.tj-tipsec{padding:0 0 84px}
.tj-tips h3{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:24px;letter-spacing:-.015em;margin-bottom:8px}
.tj-tiplist{margin-top:18px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
.tj-tipitem{display:flex;gap:14px;align-items:flex-start;padding:16px 18px;background:var(--white);border:1px solid var(--bd);border-radius:15px}
.tj-tipitem .num{flex:none;width:30px;height:30px;border-radius:9px;background:var(--lime-l);color:var(--lime-d);font-family:var(--mono);font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center}
.tj-tipitem .tt{color:var(--ink);font-weight:700;font-size:14.5px}
.tj-tipitem .td{color:var(--mu);font-size:13px;line-height:1.7;margin-top:3px}

/* ===== 著者カード ===== */
.tj-authsec{padding:30px 0 56px}
.tj-authcard{display:flex;gap:26px;align-items:center;background:var(--white);border:1px solid var(--bd);border-radius:24px;padding:32px 34px;box-shadow:0 18px 44px -26px rgba(17,17,17,.22)}
.tj-authcard img{width:96px;height:96px;border-radius:50%;object-fit:cover;flex:none;border:2px solid var(--lime)}
.tj-authcard .k{font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--lime-d)}
.tj-authcard h3{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:24px;margin-top:7px}
.tj-authcard .role{font-family:var(--mono);font-size:12.5px;color:var(--mu);margin-top:4px}
.tj-authcard .role .tier{color:var(--lime-d);font-weight:700}
.tj-authcard .bio{font-size:13.5px;line-height:1.85;color:var(--ink2);margin-top:13px;max-width:52ch}
.tj-authcta{margin-top:16px;display:inline-flex;align-items:center;gap:9px;font-family:var(--mono);font-size:13px;font-weight:600;color:#0b0c09;background:var(--lime);padding:11px 22px;border-radius:999px;transition:transform .2s,box-shadow .2s;box-shadow:0 12px 28px -10px var(--glow)}
.tj-authcta:hover{transform:translateY(-2px)}

/* ===== 日付クレジット（末尾・フッター的）===== */
.tj-dates{padding:0 0 70px}
.tj-dateline{display:flex;flex-wrap:wrap;gap:8px 22px;justify-content:center;align-items:center;font-family:var(--mono);font-size:12px;color:var(--mu);border-top:1px solid var(--bd);border-bottom:1px solid var(--bd);padding:20px 0}
.tj-dateline span{display:inline-flex;align-items:center;gap:8px}
.tj-dateline b{color:var(--ink2);font-weight:600}
.tj-dateline i{width:5px;height:5px;border-radius:50%;background:var(--lime);display:inline-block}

/* ===== 関連記事 ===== */
.tj-related{position:relative;width:100vw;left:50%;transform:translateX(-50%);background:var(--bg2);padding:84px 0 96px}
.tj-related .tj-wide{position:relative}
.tj-related .head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:34px}
.tj-related h2{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:clamp(24px,3.4vw,38px);letter-spacing:-.02em}
.tj-rgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.tj-rcard{display:block;background:var(--white);border:1px solid var(--bd);border-radius:18px;overflow:hidden;transition:transform .4s var(--ease),box-shadow .4s,border-color .4s;box-shadow:0 12px 30px -20px rgba(17,17,17,.2)}
.tj-rcard:hover{transform:translateY(-5px);border-color:rgba(168,224,28,.55);box-shadow:0 26px 50px -24px rgba(17,17,17,.26)}
.tj-rcov{aspect-ratio:16/11;overflow:hidden;background:var(--bg2)}
.tj-rcov img{width:100%;height:100%;object-fit:cover;transition:transform 1s var(--ease)}
.tj-rcard:hover .tj-rcov img{transform:scale(1.06)}
.tj-rb{padding:18px 20px 22px}
.tj-rb .c{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--lime-d);font-weight:600}
.tj-rb h3{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:17px;line-height:1.35;margin-top:9px}
.tj-rb .go{margin-top:14px;font-family:var(--mono);font-size:12px;color:var(--mu);display:inline-flex;align-items:center;gap:7px}
.tj-rb .go svg{width:14px;height:14px;color:var(--lime-d);transition:transform .25s}
.tj-rcard:hover .go svg{transform:translateX(4px)}

/* reveal */
.tj-rev{opacity:0;transform:translateY(28px);transition:opacity .8s var(--ease),transform .9s var(--ease)}
.tj-rev.in{opacity:1;transform:none}

@media(max-width:880px){
  .tj-mapgrid{grid-template-columns:1fr;gap:28px}
  .tj-mapframe{min-height:340px}
}
@media(max-width:720px){
  .tj-hinner{padding:0 22px 48px}
  .tj-lead{padding:64px 0 8px}
  .tj-stats{grid-template-columns:1fr 1fr;gap:12px}
  .tj-tiplist{grid-template-columns:1fr}
  .tj-authcard{flex-direction:column;text-align:center;padding:30px 22px}
  .tj-authcard .bio{margin-left:auto;margin-right:auto}
  .tj-rgrid{grid-template-columns:1fr}
  .tj-scroll{display:none}
  .tj-node{width:50px;height:50px}
  .tj-node .t{font-size:12px}
  .tj-node .n{font-size:10px}
  .tj-stop{padding-left:64px}
  .tj-conn{padding-left:64px}
  .tj-line::before{left:24px}
  .tj-chead{flex-direction:column;gap:10px}
}
`;

/* ============================ アイコン ============================ */

function ModeIcon({ mode }: { mode: string }) {
  if (mode === 'metro')
    return (
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="ic">
        <rect x="4" y="3" width="16" height="14" rx="3" />
        <path d="M4 11h16M8 21l2-3M16 21l-2-3" />
        <circle cx="8.5" cy="14" r="1" fill="currentColor" stroke="none" />
        <circle cx="15.5" cy="14" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="ic">
      <circle cx="12" cy="4" r="2" />
      <path d="M9 21l1.5-6L8 12l2-5 3 1 2 3M10.5 15 8 21M13.5 13 16 21" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

/* ============================ コンポーネント ============================ */

export function TripArticleMock() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    /* network canvas（ランディング/ArticleJournal と同系の動くライム）*/
    const canvas = root.querySelector('.tj-hnet') as HTMLCanvasElement | null;
    const host = root.querySelector('.tj-hero') as HTMLElement | null;
    let raf = 0;
    let onResize: (() => void) | null = null;
    if (canvas && host) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        let W = 0;
        let H = 0;
        let DPR = 1;
        let nodes: Array<{ x: number; y: number; vx: number; vy: number; r: number }> = [];
        const init = () => {
          DPR = Math.min(window.devicePixelRatio || 1, 2);
          W = host.clientWidth;
          H = host.clientHeight;
          canvas.width = Math.max(1, Math.floor(W * DPR));
          canvas.height = Math.max(1, Math.floor(H * DPR));
          ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
          const count = Math.max(30, Math.min(86, Math.round((W * H) / 15000)));
          nodes = Array.from({ length: count }, () => ({
            x: Math.random() * W,
            y: Math.random() * H,
            vx: (Math.random() - 0.5) * 0.26,
            vy: (Math.random() - 0.5) * 0.26,
            r: Math.random() * 1.7 + 1,
          }));
        };
        const frame = () => {
          ctx.clearRect(0, 0, W, H);
          for (const n of nodes) {
            n.x += n.vx;
            n.y += n.vy;
            if (n.x < 0 || n.x > W) n.vx *= -1;
            if (n.y < 0 || n.y > H) n.vy *= -1;
          }
          for (let i = 0; i < nodes.length; i++) {
            const a = nodes[i];
            if (!a) continue;
            for (let j = i + 1; j < nodes.length; j++) {
              const b = nodes[j];
              if (!b) continue;
              const dx = a.x - b.x;
              const dy = a.y - b.y;
              const d = Math.sqrt(dx * dx + dy * dy);
              if (d < 132) {
                ctx.strokeStyle = `rgba(168,224,28,${(1 - d / 132) * 0.4})`;
                ctx.lineWidth = 0.7;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
              }
            }
          }
          for (const n of nodes) {
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r, 0, 6.2832);
            ctx.fillStyle = 'rgba(196,240,120,0.9)';
            ctx.fill();
          }
          raf = requestAnimationFrame(frame);
        };
        init();
        frame();
        onResize = init;
        window.addEventListener('resize', init);
      }
    }

    /* reveal */
    const els = Array.from(root.querySelectorAll('.tj-rev')) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add('in');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.14, rootMargin: '0px 0px -6% 0px' },
    );
    els.forEach((el) => io.observe(el));

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (onResize) window.removeEventListener('resize', onResize);
      io.disconnect();
    };
  }, []);

  return (
    <div className="tj" ref={ref}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ===== HERO ===== */}
      <header className="tj-hero">
        <div className="tj-hbg" style={{ backgroundImage: `url('${HERO_PHOTO}')` }} />
        <canvas className="tj-hnet" />
        <div className="tj-hshade" />
        <div className="tj-hinner">
          <span className="tj-hkick">ITINERARY · {TRIP.cityEn}</span>
          <h1>
            パリ、<em>路地裏のパン屋</em>から
            <br />
            夜のセーヌまで。完璧な1日
          </h1>
          <p className="tj-hsub">
            10年このまちに暮らす書き手が、観光ガイドには載らない時間割で案内する、
            朝8時から夜のクルーズまでの「住む人のモデルコース」。
          </p>

          <div className="tj-hauthor">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AUTHOR_AVATAR} alt="" />
            <div>
              <div className="nm">{AUTHOR.name}</div>
              <div className="meta">
                {AUTHOR.city} 在住 {AUTHOR.years}年 ·{' '}
                <span className="tier">{AUTHOR.role}</span>
              </div>
            </div>
          </div>

          <div className="tj-hmeta">
            <span className="tj-pill">
              所要 <b>約{TRIP.hours}時間</b>
            </span>
            <span className="tj-pill">
              スポット <b>{TRIP.spots}</b>
            </span>
            <span className="tj-pill">
              予算 <b>€{TRIP.budget}前後</b>
            </span>
            <span className="tj-pill">
              ベスト <b>春・初夏</b>
            </span>
            <span className="tj-pill">
              歩行 <b>約{TRIP.walkKm}km</b>
            </span>
          </div>
        </div>
        <div className="tj-scroll">
          記事を読む
          <span className="ln" />
        </div>
      </header>

      {/* ===== editorsNote（前書き帯）===== */}
      <section className="tj-lead tj-rev">
        <div className="tj-wrap">
          <span className="tj-kicker dk">— Editor's note</span>
          <p>
            ガイドブックの「定番」を巡るだけの一日は、もう卒業しよう。
            これは、<em>朝のパン屋の行列</em>から<em>夜のセーヌの光</em>まで、
            このまちで暮らす私が、友人が訪ねてきたら必ず連れていく順番で組んだ、
            一切無駄のない一日の地図だ。
          </p>
        </div>
      </section>

      {/* ===== 集約マップ＋スポット概観（タイムラインの前）===== */}
      <section className="tj-mapsec">
        <div className="tj-wide">
          <div className="tj-maphead tj-rev">
            <span className="tj-kicker dk">— Route map &amp; spots</span>
            <h2>1日のルートと、立ち寄り先</h2>
            <p>
              各スポットの「場所」フィールドから自動生成したルート。先に全体像を
              つかんでから、下の旅程を時間順に読んでいきましょう。全{TRIP.spots}スポット。
            </p>
          </div>
          <div className="tj-mapgrid">
            <div className="tj-mapframe tj-rev">
              <span className="tj-mapbadge">Google マップ連携</span>
              {/* order に沿った directions 埋め込み（APIキー不要）。
                  本番では公式 Google Maps Embed API（要APIキー）に差し替え予定。 */}
              <iframe
                title="旅程ルートマップ"
                src={routeEmbedUrl(STOPS)}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="tj-maplist tj-rev">
              <div className="lab">立ち寄り順</div>
              {STOPS.map((s, i) => (
                <div key={i} className="tj-mlrow">
                  <span className="num">{i + 1}</span>
                  <span className="nm">{s.name}</span>
                  <span className="tm">{s.time}</span>
                  <a
                    className="pin"
                    href={placeMapUrl(s.place)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${s.name} を地図で見る`}
                    title="地図で見る"
                  >
                    <PinIcon />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== 旅程タイムライン（order/time/transfer 付き place）===== */}
      <section className="tj-tl">
        <div className="tj-wrap">
          <div className="tj-tlhead tj-rev">
            <span className="tj-kicker dk">— The itinerary</span>
            <h2>1日のながれ</h2>
            <p>朝 8:00 スタート / 夜 21:30 まで · 全{TRIP.spots}スポット</p>
          </div>

          <div className="tj-line">
            {STOPS.map((s, i) => (
              <div key={i}>
                <div className="tj-stop tj-rev">
                  <div className="tj-node">
                    <span className="n">{String(i + 1).padStart(2, '0')}</span>
                    <span className="t">{s.time}</span>
                  </div>
                  <div className="tj-card">
                    <div className="tj-cphoto">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.photo} alt="" loading="lazy" />
                      <span className="tj-ctag">{s.cat}</span>
                      <span className="tj-ctime">
                        <span className="dot" />
                        {s.time}
                        {s.end ? ` – ${s.end}` : ''}
                      </span>
                    </div>
                    <div className="tj-cbody">
                      <div className="tj-chead">
                        <h3>{s.name}</h3>
                        {/* 場所フィールドから自動生成する個別「地図で見る」リンク */}
                        <a
                          className="tj-maplink"
                          href={placeMapUrl(s.place)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <PinIcon />
                          地図で見る
                        </a>
                      </div>
                      <div className="tj-cplace">
                        <PinIcon />
                        {s.place.name}
                      </div>
                      <p className="tj-ctxt">{s.body}</p>
                      {s.cost ? (
                        <div className="tj-cextras">
                          <span className="tj-cost">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 7H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6M12 3v2M12 19v2" />
                            </svg>
                            {s.cost}
                          </span>
                        </div>
                      ) : null}
                      {s.tip ? (
                        <div className="tj-tipline">
                          <svg className="ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18h6M10 21h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
                          </svg>
                          <div>
                            <b>ローカルのコツ</b>
                            {s.tip}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                {s.next ? (
                  <div className="tj-conn tj-rev">
                    <span className="pill">
                      <span className="lbl">Next</span>
                      <ModeIcon mode={s.next.mode} />
                      {s.next.mins}
                    </span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== サマリースタッツ ===== */}
      <section className="tj-summary tj-rev">
        <div className="glow" />
        <div className="tj-wide">
          <h2>この旅程のまとめ</h2>
          <p className="sub">A perfect day in Paris — by the numbers</p>
          <div className="tj-stats">
            <div className="tj-stat">
              <div className="n">
                <em>{TRIP.hours}</em>h
              </div>
              <div className="l">所要時間</div>
            </div>
            <div className="tj-stat">
              <div className="n">
                €<em>{TRIP.budget}</em>
              </div>
              <div className="l">1人あたり予算</div>
            </div>
            <div className="tj-stat">
              <div className="n">
                <em>{TRIP.walkKm}</em>km
              </div>
              <div className="l">歩行距離</div>
            </div>
            <div className="tj-stat">
              <div className="n">
                <em>{TRIP.spots}</em>
              </div>
              <div className="l">立ち寄りスポット</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Local know-how（tips）===== */}
      <section className="tj-tipsec">
        <div className="tj-wide">
          <div className="tj-tips tj-rev">
            <span className="tj-kicker dk">— Local know-how</span>
            <h3 style={{ marginTop: 10 }}>失敗しないための小技</h3>
            <div className="tj-tiplist">
              {TIPS.map(([t, d], i) => (
                <div key={i} className="tj-tipitem">
                  <span className="num">{i + 1}</span>
                  <div>
                    <div className="tt">{t}</div>
                    <div className="td">{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== 著者カード ===== */}
      <section className="tj-authsec">
        <div className="tj-wide">
          <div className="tj-authcard tj-rev">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AUTHOR_AVATAR} alt="" />
            <div>
              <div className="k">この記事を書いた人</div>
              <h3>{AUTHOR.name}</h3>
              <div className="role">
                {AUTHOR.city}在住 {AUTHOR.years}年 · {AUTHOR.role} /{' '}
                <span className="tier">{AUTHOR.tier}</span>
              </div>
              <p className="bio">{AUTHOR.bio}</p>
              <a className="tj-authcta" href="#">
                プロフィールを見る
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 関連記事 ===== */}
      <section className="tj-related">
        <div className="tj-wide">
          <div className="head tj-rev">
            <div>
              <span className="tj-kicker dk">— You might also like</span>
              <h2 style={{ marginTop: 10 }}>ほかのモデルコース</h2>
            </div>
          </div>
          <div className="tj-rgrid">
            {RELATED.map((r, i) => (
              <a key={i} className="tj-rcard tj-rev" href="#">
                <div className="tj-rcov">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.img} alt="" loading="lazy" />
                </div>
                <div className="tj-rb">
                  <div className="c">{r.cat}</div>
                  <h3>{r.t}</h3>
                  <div className="go">
                    記事を読む
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 日付クレジット（末尾・フッター帯）===== */}
      <section className="tj-dates">
        <div className="tj-wide">
          <div className="tj-dateline tj-rev">
            <span>
              公開 <b>{TRIP.publishedAt}</b>
            </span>
            <i />
            <span>
              最終更新 <b>{TRIP.updatedAt}</b>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
