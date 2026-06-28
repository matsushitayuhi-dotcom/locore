/**
 * /services/[id] 詳細ページ (Airbnb 風) の scoped CSS。
 *
 * ★重要: App Router の初回 SSR で styled-jsx / :global() は当たらず全崩れするため、
 *   この CSS 文字列は ServiceDetail.tsx 内で
 *   <style dangerouslySetInnerHTML={{ __html: CSS }} /> として生 <style> 描画する。
 *   article/v2/*Css.ts や ServicesShelves.tsx と同じ方式。
 *
 * 固有プレフィックスは .sd-。承認済みモック service-detail.html のレイアウト/世界観を再現。
 * ブランド配色 (--bg/--card/--lime/--ink 等) と Google Fonts を維持。
 */
export const CSS = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Noto+Sans+JP:wght@400;500;700;800&display=swap');

.sd{--bg:#F4F4EF;--bg2:#FBFBF8;--card:#fff;--lime:#A8E01C;--lime-d:#5E8B0E;--lime-l:#E3F7B8;--ink:#14140f;--ink2:#3a3a34;--mu:#7a7a72;--bd:#E6E6DE;--bd2:#D8D8CF;--jp:'Noto Sans JP','Space Grotesk',sans-serif;--disp:'Space Grotesk','Noto Sans JP',sans-serif;--mono:'JetBrains Mono',monospace;background:var(--bg);color:var(--ink);font-family:var(--jp);-webkit-font-smoothing:antialiased;font-feature-settings:"palt" 1;line-height:1.8;overflow-x:clip}
.sd *{box-sizing:border-box}
.sd a{color:inherit;text-decoration:none}
.sd img{display:block;max-width:100%}
.sd-wrap{max-width:1120px;margin:0 auto;padding:0 28px}
.sd-st{color:var(--lime-d)}
.sd-back{display:inline-flex;align-items:center;gap:6px;margin-top:22px;font-size:12.5px;font-weight:700;color:var(--lime-d)}
.sd-back svg{width:15px;height:15px}

/* ===== title block ===== */
.sd-head{padding:18px 0 14px}
.sd-head h1{font-family:var(--jp);font-weight:900;font-size:clamp(24px,3.2vw,33px);line-height:1.3;letter-spacing:.01em;color:var(--ink)}
.sd-sub{display:flex;align-items:center;flex-wrap:wrap;gap:8px 14px;margin-top:11px;font-size:13.5px;color:var(--ink2)}
.sd-sub .sd-dot{color:var(--bd2)}
.sd-loc{color:var(--ink2);text-decoration:underline;text-underline-offset:2px}
.sd-tag{font-family:var(--mono);font-size:11.5px;font-weight:700;color:var(--lime-d);background:var(--lime-l);border-radius:999px;padding:3px 11px;text-transform:uppercase}
.sd-acts{margin-left:auto;display:flex;gap:6px}
.sd-acts button{display:inline-flex;align-items:center;gap:7px;background:transparent;border:0;cursor:pointer;font-size:13px;font-weight:700;color:var(--ink2);padding:7px 11px;border-radius:9px}
.sd-acts button:hover{background:rgba(0,0,0,.05)}
.sd-acts button.on{color:var(--lime-d)}
.sd-acts svg{width:17px;height:17px}
.sd-acts button.on svg{fill:var(--lime);stroke:var(--lime-d)}

/* ===== gallery (Airbnb 1+4) ===== */
.sd-gallery{position:relative;display:grid;grid-template-columns:2fr 1fr 1fr;grid-template-rows:1fr 1fr;gap:8px;border-radius:20px;overflow:hidden;aspect-ratio:24/11;background:#e9e9e1}
.sd-gallery.one{grid-template-columns:1fr;grid-template-rows:1fr}
.sd-gallery .cell{position:relative;overflow:hidden;background:#e9e9e1}
.sd-gallery .cell img{width:100%;height:100%;object-fit:cover;transition:.4s}
.sd-gallery .cell:hover img{transform:scale(1.04)}
.sd-gallery .cell.big{grid-row:1/3}
.sd-gallery.one .cell.big{grid-row:auto}
.sd-ph{display:grid;place-items:center;width:100%;height:100%;color:var(--mu)}
.sd-ph svg{width:48px;height:48px;opacity:.5}
.sd-allphotos{position:absolute;bottom:16px;right:16px;display:inline-flex;align-items:center;gap:8px;background:#fff;color:var(--ink);border:1px solid var(--bd2);border-radius:11px;padding:9px 15px;font-size:13px;font-weight:700;box-shadow:0 4px 14px -6px rgba(0,0,0,.4)}
.sd-allphotos svg{width:15px;height:15px}

/* ===== two-column ===== */
.sd-cols{display:grid;grid-template-columns:1fr 360px;gap:54px;padding:34px 0 70px;align-items:start}
.sd-sec{padding:26px 0;border-top:1px solid var(--bd)}
.sd-sec:first-child{border-top:0;padding-top:30px}
.sd-sec h2{font-family:var(--jp);font-weight:900;font-size:20px;margin-bottom:14px;color:var(--ink)}

/* host row */
.sd-hostrow{display:flex;align-items:center;gap:14px;padding:24px 0 4px}
.sd-hostrow .ava{width:54px;height:54px;border-radius:50%;object-fit:cover;border:2px solid var(--lime);background:var(--lime-l)}
.sd-hostrow .avaf{width:54px;height:54px;border-radius:50%;border:2px solid var(--lime);background:var(--lime-l);display:grid;place-items:center;font-family:var(--disp);font-weight:700;font-size:20px;color:var(--lime-d)}
.sd-hostrow .t{font-weight:700;font-size:16px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.sd-hostrow .t .yrs{font-weight:500;color:var(--mu);font-size:13px;font-family:var(--mono)}
.sd-hostrow .s{color:var(--mu);font-size:13px;margin-top:2px}
.sd-vbadge{display:inline-flex;align-items:center;gap:4px;font-family:var(--mono);font-size:11px;font-weight:700;color:var(--lime-d)}
.sd-vbadge svg{width:13px;height:13px}

/* quick facts */
.sd-facts{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.sd-fact{display:flex;gap:12px;align-items:flex-start}
.sd-fact .ic{flex:none;width:30px;height:30px;color:var(--lime-d)}
.sd-fact .ic svg{width:26px;height:26px;stroke-width:1.6}
.sd-fact b{font-weight:700;font-size:14.5px}
.sd-fact span{display:block;color:var(--mu);font-size:12.5px;margin-top:1px}

.sd-lead{font-size:15px;line-height:2;color:var(--ink2);white-space:pre-line}

/* highlight bullets */
.sd-hl{display:flex;flex-direction:column;gap:13px;list-style:none}
.sd-hl li{display:flex;gap:12px;align-items:flex-start}
.sd-hl .ck{flex:none;width:24px;height:24px;border-radius:50%;background:var(--lime-l);color:var(--lime-d);display:grid;place-items:center;margin-top:1px}
.sd-hl .ck svg{width:14px;height:14px}
.sd-hl b{font-weight:700}

/* included */
.sd-inc{display:grid;grid-template-columns:1fr 1fr;gap:10px 22px}
.sd-inc div{display:flex;gap:10px;align-items:center;font-size:14px}
.sd-inc svg{width:18px;height:18px;color:var(--lime-d);flex:none}

/* host card */
.sd-hostcard{display:flex;gap:18px;align-items:flex-start;background:var(--card);border:1px solid var(--bd);border-radius:18px;padding:20px}
.sd-hostcard .ava{width:72px;height:72px;border-radius:50%;object-fit:cover;flex:none;border:2px solid var(--lime);background:var(--lime-l)}
.sd-hostcard .avaf{width:72px;height:72px;border-radius:50%;flex:none;border:2px solid var(--lime);background:var(--lime-l);display:grid;place-items:center;font-family:var(--disp);font-weight:700;font-size:26px;color:var(--lime-d)}
.sd-hostcard .nm{font-weight:700;font-size:17px}
.sd-hostcard .meta{color:var(--mu);font-size:12.5px;font-family:var(--mono);margin:2px 0 9px}
.sd-hostcard .bio{font-size:13.5px;color:var(--ink2);line-height:1.9;white-space:pre-line}
.sd-hostcard .link{display:inline-flex;align-items:center;gap:6px;margin-top:11px;font-size:13px;font-weight:700;color:var(--lime-d)}

/* map */
.sd-mapframe{border-radius:18px;overflow:hidden;border:1px solid var(--bd);aspect-ratio:16/8;background:#dfe4e8;position:relative}
.sd-mapframe iframe{position:absolute;inset:0;width:100%;height:100%;border:0;filter:grayscale(.15)}

/* ===== contact card (sticky) ===== */
.sd-book{position:sticky;top:24px;background:var(--card);border:1px solid var(--bd);border-radius:20px;padding:22px;box-shadow:0 26px 60px -34px rgba(20,20,15,.5)}
.sd-book .price{display:flex;align-items:baseline;gap:7px}
.sd-book .price b{font-family:var(--disp);font-size:26px;font-weight:700;color:var(--ink)}
.sd-book .price span{color:var(--mu);font-size:13px}
.sd-book .price .free{font-family:var(--jp);color:var(--lime-d)}
.sd-book .ctawrap{margin-top:16px}
.sd-book .note{text-align:center;color:var(--mu);font-size:12px;margin-top:11px}
.sd-book .safe{display:flex;align-items:flex-start;gap:8px;margin-top:16px;padding-top:14px;border-top:1px solid var(--bd);font-size:12px;color:var(--ink2);line-height:1.7}
.sd-book .safe svg{width:15px;height:15px;color:var(--lime-d);flex:none;margin-top:2px}
.sd-book .qf{margin-top:16px;padding-top:14px;border-top:1px solid var(--bd);display:flex;flex-direction:column;gap:8px}
.sd-book .qf div{display:flex;justify-content:space-between;gap:12px;font-size:13px;color:var(--ink2)}
.sd-book .qf div b{font-weight:700;color:var(--ink);text-align:right}

/* other (articles/services) carryover styles */
.sd-other{padding:0 0 60px}
.sd-other h3{font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--mu);margin-bottom:12px;display:flex;align-items:center;gap:7px}
.sd-other h3 svg{width:13px;height:13px}
.sd-scroll{display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;scrollbar-width:none}
.sd-scroll::-webkit-scrollbar{display:none}
.sd-acard{width:60%;max-width:240px;flex:none;background:var(--card);border:1px solid var(--bd);border-radius:14px;overflow:hidden}
.sd-acard .th{aspect-ratio:4/3;background:var(--bd);overflow:hidden}
.sd-acard .th img{width:100%;height:100%;object-fit:cover}
.sd-acard .body{padding:11px 13px}
.sd-acard .body p{font-size:12.5px;font-weight:700;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}

@media(max-width:900px){
  .sd-wrap{padding:0 18px}
  .sd-cols{grid-template-columns:1fr;gap:0}
  .sd-book{position:static;margin-top:24px}
  .sd-gallery{grid-template-columns:1fr 1fr;aspect-ratio:16/12}
  .sd-gallery .cell.big{grid-row:1/2;grid-column:1/3;aspect-ratio:16/9}
  .sd-gallery .cell:nth-child(n+4){display:none}
  .sd-gallery.one .cell.big{grid-column:1/2}
  .sd-facts,.sd-inc{grid-template-columns:1fr}
  .sd-acard{width:72%}
}`;
