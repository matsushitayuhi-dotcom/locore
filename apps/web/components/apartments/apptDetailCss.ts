/**
 * /apartments/[id] 住居詳細ページ (Airbnb 風) の scoped CSS。
 *
 * ★重要: App Router の初回 SSR で styled-jsx / :global() は当たらず全崩れするため、
 *   この CSS 文字列は ApartmentDetail.tsx 内で
 *   <style dangerouslySetInnerHTML={{ __html: CSS }} /> として生 <style> 描画する。
 *   components/services/serviceDetailCss.ts と同じ方式。
 *
 * 固有プレフィックスは .apt-。承認済みモック apartment-detail.html のレイアウト/世界観を再現。
 * ブランド配色 (--bg/--card/--lime/--ink 等) と Google Fonts を維持。
 */
export const CSS = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Noto+Sans+JP:wght@400;500;700;800&display=swap');

.apt{--bg:#F4F4EF;--bg2:#FBFBF8;--card:#fff;--lime:#A8E01C;--lime-d:#5E8B0E;--lime-l:#E3F7B8;--ink:#14140f;--ink2:#3a3a34;--mu:#7a7a72;--bd:#E6E6DE;--bd2:#D8D8CF;--jp:'Noto Sans JP','Space Grotesk',sans-serif;--disp:'Space Grotesk','Noto Sans JP',sans-serif;--mono:'JetBrains Mono',monospace;background:var(--bg);color:var(--ink);font-family:var(--jp);-webkit-font-smoothing:antialiased;font-feature-settings:"palt" 1;line-height:1.8;overflow-x:clip}
.apt *{box-sizing:border-box}
.apt a{color:inherit;text-decoration:none}
.apt img{display:block;max-width:100%}
.apt-wrap{max-width:1120px;margin:0 auto;padding:0 28px}
.apt-st{color:var(--lime-d)}

/* breadcrumb */
.apt-crumb{font-size:12.5px;color:var(--mu);font-family:var(--mono);padding:20px 0 0}
.apt-crumb a{text-decoration:underline;text-underline-offset:2px}

/* ===== title block ===== */
.apt-head{padding:14px 0 14px}
.apt-head h1{font-family:var(--jp);font-weight:900;font-size:clamp(23px,3vw,31px);line-height:1.3;letter-spacing:.01em;color:var(--ink)}
.apt-sub{display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px;margin-top:10px;font-size:13.5px;color:var(--ink2)}
.apt-sub .apt-loc{color:var(--ink2);text-decoration:underline;text-underline-offset:2px;font-weight:600}
.apt-sub .apt-dot{color:var(--bd2)}
.apt-sub .apt-tag{font-family:var(--mono);font-size:11.5px;font-weight:700;color:var(--lime-d);background:var(--lime-l);border-radius:999px;padding:3px 11px}
.apt-status{font-family:var(--mono);font-size:11.5px;font-weight:700;display:inline-flex;align-items:center;gap:5px}
.apt-status.live{color:var(--lime-d)}
.apt-status.live i{width:7px;height:7px;border-radius:50%;background:var(--lime);display:inline-block;box-shadow:0 0 0 3px rgba(168,224,28,.25)}
.apt-status.closed{color:var(--mu);background:rgba(0,0,0,.05);border-radius:999px;padding:3px 11px}
.apt-acts{margin-left:auto;display:flex;gap:6px}
.apt-acts button{display:inline-flex;align-items:center;gap:7px;background:transparent;border:0;cursor:pointer;font-size:13px;font-weight:700;color:var(--ink2);padding:7px 11px;border-radius:9px}
.apt-acts button:hover{background:rgba(0,0,0,.05)}
.apt-acts button.on{color:var(--lime-d)}
.apt-acts button.on svg{fill:var(--lime);stroke:var(--lime-d)}
.apt-acts svg{width:17px;height:17px}

/* ===== gallery (Airbnb 1+4) ===== */
.apt-gallery{position:relative;display:grid;grid-template-columns:2fr 1fr 1fr;grid-template-rows:1fr 1fr;gap:8px;border-radius:20px;overflow:hidden;aspect-ratio:24/11;background:#e9e9e1}
.apt-gallery.one{grid-template-columns:1fr;grid-template-rows:1fr}
.apt-gallery.two{grid-template-columns:1fr 1fr;grid-template-rows:1fr}
.apt-gallery.three{grid-template-columns:2fr 1fr;grid-template-rows:1fr 1fr}
.apt-gallery .cell{position:relative;overflow:hidden;background:#e9e9e1;border:0;padding:0;cursor:pointer}
.apt-gallery .cell img{width:100%;height:100%;object-fit:cover;transition:.4s}
.apt-gallery .cell:hover img{transform:scale(1.04)}
.apt-gallery .cell.big{grid-row:1/3}
.apt-gallery.one .cell.big,.apt-gallery.two .cell.big{grid-row:auto}
.apt-ph{display:grid;place-items:center;width:100%;height:100%;color:var(--mu)}
.apt-ph svg{width:48px;height:48px;opacity:.5}
.apt-allphotos{position:absolute;bottom:16px;right:16px;display:inline-flex;align-items:center;gap:8px;background:#fff;color:var(--ink);border:1px solid var(--bd2);border-radius:11px;padding:9px 15px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px -6px rgba(0,0,0,.4)}
.apt-allphotos svg{width:15px;height:15px}

/* ===== two-column ===== */
.apt-cols{display:grid;grid-template-columns:1fr 372px;gap:54px;padding:30px 0 70px;align-items:start}
.apt-sec{padding:26px 0;border-top:1px solid var(--bd)}
.apt-sec:first-child{border-top:0;padding-top:6px}
.apt-sec h2{font-family:var(--jp);font-weight:900;font-size:20px;margin-bottom:14px;color:var(--ink)}

/* status banner (closed/expired) */
.apt-banner{display:flex;align-items:center;gap:10px;margin-top:18px;padding:14px 16px;border:1px solid var(--bd);background:var(--bg2);border-radius:14px}
.apt-banner svg{width:20px;height:20px;color:var(--mu);flex:none}
.apt-banner b{font-weight:700;font-size:14px;color:var(--ink2)}
.apt-banner p{font-size:12px;color:var(--mu)}

/* owner controls bar */
.apt-owner{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:18px;padding:12px 16px;border:1px solid rgba(94,139,14,.3);background:rgba(168,224,28,.08);border-radius:14px}
.apt-owner p{font-size:12px;color:var(--ink2)}

/* overview header */
.apt-ovr{display:flex;align-items:flex-start;gap:18px;padding-bottom:6px}
.apt-ovr .ttl{font-family:var(--jp);font-weight:900;font-size:21px;line-height:1.4;color:var(--ink)}
.apt-ovr .specs{margin-top:7px;font-size:14px;color:var(--ink2)}
.apt-ovr .specs b{font-weight:700}
.apt-ovr .specs .apt-dot{color:var(--bd2);margin:0 7px}
.apt-ovr .ava{margin-left:auto;flex:none;width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid var(--lime);background:var(--lime-l)}
.apt-ovr .avaf{margin-left:auto;flex:none;width:56px;height:56px;border-radius:50%;border:2px solid var(--lime);background:var(--lime-l);display:grid;place-items:center;font-family:var(--disp);font-weight:700;font-size:21px;color:var(--lime-d)}

/* highlight bullets */
.apt-hl{display:flex;flex-direction:column;gap:18px;list-style:none}
.apt-hl li{display:flex;gap:15px;align-items:flex-start}
.apt-hl .ic{flex:none;width:26px;height:26px;color:var(--ink);margin-top:2px}
.apt-hl .ic svg{width:26px;height:26px;stroke-width:1.5}
.apt-hl b{font-weight:700;font-size:15px}
.apt-hl p{color:var(--mu);font-size:13px;margin-top:2px}

/* description */
.apt-lead{font-size:15px;line-height:2.05;color:var(--ink2)}
.apt-lead.clamp{max-height:13.2em;overflow:hidden;position:relative}
.apt-lead.clamp::after{content:"";position:absolute;left:0;right:0;bottom:0;height:4em;background:linear-gradient(to bottom,rgba(244,244,239,0),var(--bg))}
.apt-morebtn{display:inline-flex;align-items:center;gap:7px;margin-top:14px;background:transparent;border:0;cursor:pointer;font-size:14px;font-weight:800;color:var(--ink);text-decoration:underline;text-underline-offset:3px}
.apt-morebtn svg{width:14px;height:14px}

/* spec table は「物件の概要」セクションで Tailwind の compact dl (元フォーマット) を使用 */

/* amenities */
.apt-amen{display:grid;grid-template-columns:1fr 1fr;gap:15px 22px}
.apt-amen div{display:flex;gap:13px;align-items:center;font-size:14.5px;color:var(--ink2)}
.apt-amen svg{width:22px;height:22px;color:var(--ink);flex:none;stroke-width:1.6}
.apt-amen div.off{color:var(--bd2)}
.apt-amen div.off svg{color:var(--bd2)}
.apt-amen div.off span{text-decoration:line-through}
.apt-amenbtn{display:inline-flex;align-items:center;justify-content:center;margin-top:22px;padding:13px 22px;border:1px solid var(--ink);border-radius:12px;background:transparent;font-size:14px;font-weight:800;cursor:pointer;color:var(--ink)}
.apt-amenbtn:hover{background:rgba(0,0,0,.04)}

/* map (blurred approximate area) */
.apt-mapframe{border-radius:18px;overflow:hidden;border:1px solid var(--bd);aspect-ratio:16/8;background:#dfe4e8;position:relative}
.apt-mapframe iframe{position:absolute;inset:0;width:100%;height:100%;border:0;filter:grayscale(.12)}
/* 中心を覆うふんわりライムの円。ピン (マーカー) を隠し、正確な番地を秘匿する */
.apt-mapcircle{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);border-radius:50%;pointer-events:none;background:radial-gradient(circle,rgba(168,224,28,.42) 0%,rgba(168,224,28,.30) 55%,rgba(168,224,28,.12) 80%,rgba(168,224,28,0) 100%);box-shadow:0 0 0 1px rgba(94,139,14,.15) inset;filter:blur(2px)}
.apt-maploc{margin-top:13px;font-size:14px;color:var(--ink2)}
.apt-maploc b{font-weight:700;color:var(--ink)}
.apt-maploc p{color:var(--mu);font-size:13px;margin-top:4px}

/* host card */
.apt-hostcard{display:flex;gap:18px;align-items:flex-start;background:var(--card);border:1px solid var(--bd);border-radius:18px;padding:22px}
.apt-hostcard .ava{width:72px;height:72px;border-radius:50%;object-fit:cover;flex:none;border:2px solid var(--lime);background:var(--lime-l)}
.apt-hostcard .avaf{width:72px;height:72px;border-radius:50%;flex:none;border:2px solid var(--lime);background:var(--lime-l);display:grid;place-items:center;font-family:var(--disp);font-weight:700;font-size:26px;color:var(--lime-d)}
.apt-hostcard .nm{font-weight:700;font-size:17px;color:var(--ink)}
.apt-hostcard .badge{display:inline-flex;align-items:center;gap:5px;font-family:var(--mono);font-size:11px;font-weight:700;color:var(--lime-d);margin-left:8px}
.apt-hostcard .badge svg{width:13px;height:13px}
.apt-hostcard .meta{color:var(--mu);font-size:12.5px;font-family:var(--mono);margin:3px 0 10px}
.apt-hostcard .bio{font-size:13.5px;color:var(--ink2);line-height:1.9;white-space:pre-line}
.apt-hostcard .link{display:inline-flex;align-items:center;gap:6px;margin-top:12px;font-size:13px;font-weight:700;color:var(--lime-d)}
.apt-hostcard .link svg{width:13px;height:13px}

/* ===== inquiry card (sticky) ===== */
.apt-book{position:sticky;top:24px;background:var(--card);border:1px solid var(--bd);border-radius:20px;padding:24px;box-shadow:0 26px 60px -34px rgba(20,20,15,.5)}
.apt-book .price{display:flex;align-items:baseline;gap:7px}
.apt-book .price b{font-family:var(--disp);font-size:28px;font-weight:700;color:var(--ink)}
.apt-book .price span{color:var(--mu);font-size:14px}
.apt-book .price .free{font-family:var(--jp);color:var(--lime-d)}
.apt-book .avail{margin-top:6px;font-size:12.5px;color:var(--lime-d);font-weight:700;display:inline-flex;align-items:center;gap:6px}
.apt-book .avail svg{width:14px;height:14px}
.apt-book .brk{margin:18px 0;border:1px solid var(--bd);border-radius:14px;overflow:hidden}
.apt-book .brk .row{display:flex;justify-content:space-between;padding:12px 16px;font-size:13.5px;color:var(--ink2);border-bottom:1px solid var(--bd)}
.apt-book .brk .row span:last-child{font-weight:700;color:var(--ink);font-family:var(--mono)}
.apt-book .brk .row.sum{border-bottom:0;background:var(--bg2);font-weight:800}
.apt-book .brk .row.sum span:first-child{color:var(--ink);font-weight:800}
.apt-book .brk .row .mu{color:var(--mu);font-size:11px;font-weight:500;font-family:var(--jp)}
.apt-book .ctawrap{margin-top:2px}
.apt-book .save{display:block;width:100%;text-align:center;margin-top:10px;background:#fff;border:1px solid var(--bd2);border-radius:13px;padding:13px;font-size:14px;font-weight:800;cursor:pointer;color:var(--ink)}
.apt-book .save:hover{background:var(--bg2)}
.apt-book .save.on{color:var(--lime-d);border-color:var(--lime)}
.apt-book .note{margin-top:16px;font-size:11.5px;color:var(--mu);line-height:1.7;display:flex;gap:8px}
.apt-book .note svg{width:15px;height:15px;color:var(--lime-d);flex:none;margin-top:1px}
.apt-book .closed{margin-top:8px;text-align:center;padding:12px;border-radius:13px;background:var(--bg2);border:1px solid var(--bd);font-size:13px;font-weight:700;color:var(--mu)}

/* fraud notice footer */
.apt-fraud{margin-top:8px;border:1px solid rgba(245,158,11,.4);background:rgba(254,243,199,.5);border-radius:16px;padding:20px;font-size:12.5px;line-height:1.8;color:#7a4b08}
.apt-fraud .ft{display:flex;align-items:center;gap:8px;font-weight:800;color:#92400e;margin-bottom:8px}
.apt-fraud .ft svg{width:16px;height:16px;flex:none}
.apt-fraud ul{margin:0;padding-left:18px}
.apt-fraud li{margin-top:4px}
.apt-fraud a{text-decoration:underline}

/* ===== responsive ===== */
@media(max-width:860px){
  .apt-wrap{padding:0 18px}
  .apt-cols{grid-template-columns:1fr;gap:0}
  .apt-book{position:static;margin-top:8px;box-shadow:none}
  .apt-gallery{grid-template-columns:1fr 1fr;grid-template-rows:1fr;aspect-ratio:auto}
  .apt-gallery .cell{aspect-ratio:3/2}
  .apt-gallery .cell.big{grid-column:1/3;grid-row:auto;aspect-ratio:16/10}
  .apt-gallery .cell:nth-child(n+4){display:none}
  .apt-gallery.one .cell.big{grid-column:1/2}
  .apt-amen{grid-template-columns:1fr 1fr}
}
@media(max-width:560px){
  .apt-head h1{font-size:22px}
  .apt-amen{grid-template-columns:1fr}
}`;
