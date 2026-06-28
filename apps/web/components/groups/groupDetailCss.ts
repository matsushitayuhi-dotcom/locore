/**
 * /groups/[id] 集まり詳細ページ（参加者目線）の scoped CSS。
 *
 * ★重要: App Router の初回 SSR で styled-jsx / :global() は当たらず全崩れするため、
 *   この CSS 文字列は GroupDetail.tsx 内で
 *   <style dangerouslySetInnerHTML={{ __html: CSS }} /> として生 <style> 描画する。
 *   components/jobs/jobDetailCss.ts / apartments/apptDetailCss.ts と同じ方式。
 *
 * 固有プレフィックスは .gr-。承認済みモック group-detail.html のレイアウト/世界観を再現。
 * フォントはランディング統一（Space Grotesk + JetBrains Mono + Noto Sans JP）。
 */
export const CSS = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Noto+Sans+JP:wght@400;500;700;800&display=swap');

.gr{--bg:#F4F4EF;--bg2:#FBFBF8;--card:#fff;--lime:#A8E01C;--lime-d:#5E8B0E;--lime-l:#E3F7B8;--ink:#14140f;--ink2:#3a3a34;--mu:#7a7a72;--bd:#E6E6DE;--bd2:#D8D8CF;--warn:#C2410C;--jp:'Noto Sans JP','Space Grotesk',sans-serif;--disp:'Space Grotesk','Noto Sans JP',sans-serif;--mono:'JetBrains Mono',monospace;background:var(--bg);color:var(--ink);font-family:var(--jp);-webkit-font-smoothing:antialiased;font-feature-settings:"palt" 1;line-height:1.8;overflow-x:clip}
.gr *{box-sizing:border-box}
.gr a{color:inherit;text-decoration:none}
.gr img{display:block;max-width:100%}
.gr-wrap{max-width:1120px;margin:0 auto;padding:0 28px}

/* breadcrumb */
.gr-crumb{font-size:12.5px;color:var(--mu);font-family:var(--mono);padding:20px 0 0}
.gr-crumb a{text-decoration:underline;text-underline-offset:2px}

/* ===== title ===== */
.gr-head{padding:14px 0 18px}
.gr-head .badges{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:11px}
.gr-head .status{font-family:var(--mono);font-size:11.5px;font-weight:700;color:var(--lime-d);display:inline-flex;align-items:center;gap:5px}
.gr-head .status i{width:7px;height:7px;border-radius:50%;background:var(--lime);display:inline-block;box-shadow:0 0 0 3px rgba(168,224,28,.25)}
.gr-head .status.closed{color:var(--mu);background:rgba(0,0,0,.05);border-radius:999px;padding:3px 11px}
.gr-head .tag{font-family:var(--mono);font-size:11.5px;font-weight:700;color:var(--lime-d);background:var(--lime-l);border-radius:999px;padding:3px 11px}
.gr-head .tag.dk{color:var(--ink2);background:rgba(0,0,0,.05)}
.gr-head h1{font-family:var(--jp);font-weight:800;font-size:clamp(23px,3vw,32px);line-height:1.3;letter-spacing:.01em}
.gr-head .sub{display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px;margin-top:11px;font-size:13.5px;color:var(--ink2)}
.gr-head .sub .org{font-weight:700}
.gr-head .sub .loc{text-decoration:underline;text-underline-offset:2px}
.gr-head .sub .dot{color:var(--bd2)}
.gr-head .acts{margin-left:auto;display:flex;gap:6px}
.gr-head .acts button{display:inline-flex;align-items:center;gap:7px;background:transparent;border:0;cursor:pointer;font-size:13px;font-weight:700;color:var(--ink2);padding:7px 11px;border-radius:9px}
.gr-head .acts button:hover{background:rgba(0,0,0,.05)}
.gr-head .acts button.on{color:var(--lime-d)}
.gr-head .acts svg{width:17px;height:17px}

/* ===== gallery 1+4 ===== */
.gr-gallery{position:relative;display:grid;grid-template-columns:2fr 1fr 1fr;grid-template-rows:1fr 1fr;gap:8px;border-radius:20px;overflow:hidden;aspect-ratio:24/11;background:#e9e9e1}
.gr-gallery.one{grid-template-columns:1fr;grid-template-rows:1fr}
.gr-gallery.two{grid-template-columns:1fr 1fr;grid-template-rows:1fr}
.gr-gallery.three{grid-template-columns:2fr 1fr;grid-template-rows:1fr 1fr}
.gr-gallery .cell{position:relative;overflow:hidden;background:#e9e9e1;border:0;padding:0;cursor:pointer}
.gr-gallery .cell img{width:100%;height:100%;object-fit:cover;transition:.4s}
.gr-gallery .cell:hover img{transform:scale(1.04)}
.gr-gallery .cell.big{grid-row:1/3}
.gr-gallery.one .cell.big,.gr-gallery.two .cell.big{grid-row:auto}
.gr-allphotos{position:absolute;bottom:16px;right:16px;display:inline-flex;align-items:center;gap:8px;background:#fff;color:var(--ink);border:1px solid var(--bd2);border-radius:11px;padding:9px 15px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px -6px rgba(0,0,0,.4)}
.gr-allphotos svg{width:15px;height:15px}

/* status banner */
.gr-banner{display:flex;gap:12px;align-items:flex-start;background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:14px 16px;margin:4px 0 0}
.gr-banner svg{width:20px;height:20px;color:var(--mu);flex:none;margin-top:2px}
.gr-banner b{font-weight:700;font-size:14px}
.gr-banner p{color:var(--mu);font-size:12.5px;margin-top:2px}

/* owner controls wrapper */
.gr-owner{margin:14px 0 0;background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:14px 16px}
.gr-owner p{font-size:12.5px;color:var(--mu);margin-bottom:8px}

/* ===== key facts band (6 枠固定) ===== */
.gr-band{margin-top:6px;display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--bd);border:1px solid var(--bd);border-radius:18px;overflow:hidden}
.gr-band .c{background:var(--card);padding:16px 18px;display:flex;gap:12px;align-items:flex-start}
.gr-band .c .ic{flex:none;width:26px;height:26px;color:var(--lime-d);margin-top:1px}
.gr-band .c .ic svg{width:26px;height:26px;stroke-width:1.6}
.gr-band .c .k{font-size:11px;color:var(--mu);font-family:var(--mono);text-transform:uppercase;letter-spacing:.04em}
.gr-band .c .v{font-weight:700;font-size:15px;margin-top:2px;line-height:1.5}
.gr-band .c .v small{font-weight:500;color:var(--mu);font-size:11.5px;display:block;margin-top:1px;font-family:var(--jp)}
.gr-band .c.ok .v{color:var(--lime-d)}
.gr-band .c.empty .ic{color:var(--bd2)}
.gr-band .c .ph{margin-top:6px}
.gr-band .c .ph .bar{display:block;height:9px;width:64%;border-radius:5px;background:var(--bd)}
.gr-band .c .ph small{display:block;margin-top:6px;font-size:11px;color:var(--mu)}

/* ===== two-column ===== */
.gr-cols{display:grid;grid-template-columns:1fr 360px;gap:54px;padding:30px 0 70px;align-items:start}
.gr-sec{padding:26px 0;border-top:1px solid var(--bd)}
.gr-sec:first-child{border-top:0;padding-top:8px}
.gr-sec h2{font-family:var(--jp);font-weight:800;font-size:20px;margin-bottom:14px}

.gr-lead{font-size:15px;line-height:2.05;color:var(--ink2)}
.gr-lead p+p{margin-top:14px}
.gr-lead ul,.gr-lead ol{margin:12px 0 12px 1.3em}
.gr-lead li{margin:4px 0}
.gr-lead h1,.gr-lead h2,.gr-lead h3{font-weight:700;margin:16px 0 8px;color:var(--ink)}
.gr-lead a{color:var(--lime-d);text-decoration:underline}
.gr-lead strong{font-weight:700;color:var(--ink)}

/* lime checks */
.gr-checks{display:flex;flex-direction:column;gap:12px}
.gr-checks li{display:flex;gap:12px;list-style:none;align-items:flex-start;font-size:14.5px;color:var(--ink2)}
.gr-checks .ck{flex:none;width:23px;height:23px;border-radius:50%;background:var(--lime-l);color:var(--lime-d);display:grid;place-items:center;margin-top:1px}
.gr-checks .ck svg{width:13px;height:13px}

/* timeline (当日の流れ) */
.gr-steps{display:flex;flex-direction:column;gap:0}
.gr-step{display:flex;gap:16px;position:relative;padding-bottom:20px}
.gr-step:last-child{padding-bottom:0}
.gr-step .tm{flex:none;width:56px;font-family:var(--mono);font-size:12.5px;font-weight:700;color:var(--lime-d);padding-top:2px}
.gr-step .dot{position:relative;flex:none;width:12px}
.gr-step .dot i{position:absolute;left:2px;top:6px;width:9px;height:9px;border-radius:50%;background:var(--lime);z-index:1}
.gr-step:not(:last-child) .dot::before{content:"";position:absolute;left:6px;top:6px;bottom:-14px;width:2px;background:var(--bd)}
.gr-step .t{font-weight:700;font-size:14.5px}
.gr-step .d{color:var(--mu);font-size:13px;margin-top:1px}

/* participants */
.gr-parts{display:flex;align-items:center;gap:14px}
.gr-ava-stack{display:flex}
.gr-ava-stack img,.gr-ava-stack .ava-f,.gr-ava-stack .more{width:40px;height:40px;border-radius:50%;border:2.5px solid var(--bg);object-fit:cover;margin-left:-10px}
.gr-ava-stack img:first-child,.gr-ava-stack .ava-f:first-child{margin-left:0}
.gr-ava-stack .ava-f{display:grid;place-items:center;background:var(--card);color:var(--mu);font-family:var(--disp);font-weight:700;font-size:14px}
.gr-ava-stack .more{display:grid;place-items:center;background:var(--lime-l);color:var(--lime-d);font-family:var(--mono);font-weight:700;font-size:12px}
.gr-parts .ptxt b{font-weight:700;font-size:15px}
.gr-parts .ptxt span{display:block;color:var(--mu);font-size:12.5px}
.gr-empty{font-size:14px;color:var(--mu);background:var(--bg2);border:1px solid var(--bd);border-radius:14px;padding:16px 18px;line-height:1.8}

/* map */
.gr-mapframe{border-radius:18px;overflow:hidden;border:1px solid var(--bd);aspect-ratio:16/8;background:#dfe4e8;position:relative}
.gr-mapframe iframe{position:absolute;inset:0;width:100%;height:100%;border:0;filter:grayscale(.12)}
.gr-maploc{margin-top:13px;font-size:14px;color:var(--ink2)}.gr-maploc b{font-weight:700}
.gr-maploc p{color:var(--mu);font-size:13px;margin-top:4px}
.gr-online{display:flex;gap:12px;align-items:center;background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:16px 18px}
.gr-online svg{width:22px;height:22px;color:var(--lime-d);flex:none}
.gr-online b{font-weight:700;font-size:14.5px}
.gr-online p{color:var(--mu);font-size:13px;margin-top:2px}

/* host card */
.gr-hostcard{display:flex;gap:18px;align-items:flex-start;background:var(--card);border:1px solid var(--bd);border-radius:18px;padding:22px}
.gr-hostcard .ava{width:66px;height:66px;border-radius:50%;object-fit:cover;flex:none;border:2px solid var(--lime)}
.gr-hostcard .avaf{width:66px;height:66px;border-radius:50%;flex:none;border:2px solid var(--lime);background:var(--lime-l);color:var(--lime-d);display:grid;place-items:center;font-family:var(--disp);font-weight:700;font-size:26px}
.gr-hostcard .nm{font-weight:700;font-size:17px;display:flex;align-items:center;flex-wrap:wrap;gap:4px}
.gr-hostcard .badge{display:inline-flex;align-items:center;gap:5px;font-family:var(--mono);font-size:11px;font-weight:700;color:var(--lime-d);margin-left:8px}
.gr-hostcard .badge svg{width:13px;height:13px}
.gr-hostcard .meta{color:var(--mu);font-size:12.5px;font-family:var(--mono);margin:3px 0 9px}
.gr-hostcard .bio{font-size:13.5px;color:var(--ink2);line-height:1.9}
.gr-hostcard .link{display:inline-flex;align-items:center;gap:6px;margin-top:11px;font-size:13px;font-weight:700;color:var(--lime-d)}
.gr-hostcard .link svg{width:13px;height:13px}

/* ===== join card (sticky) ===== */
.gr-join{position:sticky;top:86px;background:var(--card);border:1px solid var(--bd);border-radius:20px;padding:24px;box-shadow:0 26px 60px -34px rgba(20,20,15,.5)}
.gr-join .fee{font-size:12px;color:var(--mu);font-family:var(--mono);text-transform:uppercase;letter-spacing:.05em}
.gr-join .feev{display:flex;align-items:baseline;gap:7px;margin-top:3px;flex-wrap:wrap}
.gr-join .feev b{font-family:var(--disp);font-size:27px;font-weight:700}
.gr-join .feev span{color:var(--mu);font-size:13px}
.gr-join .when{margin-top:16px;display:flex;gap:12px;align-items:flex-start;padding:14px;border:1px solid var(--bd);border-radius:14px;background:var(--bg2)}
.gr-join .when .cal{flex:none;width:46px;text-align:center;border-radius:10px;overflow:hidden;border:1px solid var(--bd);background:#fff}
.gr-join .when .cal .m{background:var(--lime);color:var(--ink);font-family:var(--mono);font-size:10px;font-weight:700;padding:2px 0}
.gr-join .when .cal .d{font-family:var(--disp);font-weight:700;font-size:20px;padding:3px 0 4px}
.gr-join .when .wt b{font-weight:700;font-size:14.5px}
.gr-join .when .wt span{display:block;color:var(--mu);font-size:12.5px;margin-top:2px}
.gr-join .when .wt .rec{color:var(--lime-d);font-weight:700;font-family:var(--mono);font-size:11px;margin-top:4px}
.gr-join .seats{margin:14px 0;display:flex;align-items:center;gap:10px;font-size:13px}
.gr-join .seats .trk{flex:1;height:7px;border-radius:4px;background:var(--bd);overflow:hidden}
.gr-join .seats .trk i{display:block;height:100%;background:var(--lime);border-radius:4px}
.gr-join .seats b{font-weight:700}.gr-join .seats .left{color:var(--lime-d);font-weight:700;white-space:nowrap}
.gr-join .seatsline{margin:14px 0 0;font-size:13px;color:var(--ink2)}
.gr-join .seatsline b{font-weight:700}
.gr-join .cta{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;text-align:center;background:var(--lime);color:var(--ink);font-weight:800;font-size:15.5px;border:0;border-radius:13px;padding:15px;cursor:pointer;box-shadow:0 10px 22px -10px rgba(94,139,14,.6)}
.gr-join .cta:hover{filter:brightness(1.03)}
.gr-join .cta:disabled{opacity:.55;cursor:default;box-shadow:none}
.gr-join .cta.is-on{background:var(--lime-l);color:var(--lime-d)}
.gr-join .save{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;text-align:center;margin-top:10px;background:#fff;border:1px solid var(--bd2);border-radius:13px;padding:13px;font-size:14px;font-weight:800;cursor:pointer;color:var(--ink)}
.gr-join .save:hover{background:var(--bg2)}
.gr-join .save.is-on{color:var(--lime-d);border-color:var(--lime)}
.gr-join .save:disabled{opacity:.55;cursor:default}
.gr-join .closed{margin-top:6px;text-align:center;font-size:13px;font-weight:700;color:var(--mu);background:var(--bg2);border:1px solid var(--bd);border-radius:13px;padding:13px}
.gr-join .full{margin-top:10px;text-align:center;font-size:12px;color:var(--warn);font-weight:700}
.gr-join .ddl{margin-top:13px;text-align:center;font-size:12px;color:var(--mu)}
.gr-join .ddl b{color:var(--warn);font-weight:700}
.gr-join .msgwrap{margin-top:14px;border-top:1px solid var(--bd);padding-top:14px}
.gr-join .note{margin-top:14px;font-size:11.5px;color:var(--mu);line-height:1.7;display:flex;gap:8px}
.gr-join .note svg{width:15px;height:15px;color:var(--lime-d);flex:none;margin-top:1px}

.gr-foot{border-top:1px solid var(--bd);padding:24px 0 50px;color:var(--mu);font-size:12px;font-family:var(--mono)}

/* responsive */
@media(max-width:860px){
  .gr-cols{grid-template-columns:1fr;gap:0}
  .gr-join{position:static;margin-top:8px;box-shadow:none}
  .gr-band{grid-template-columns:1fr 1fr}
  .gr-gallery{grid-template-columns:1fr 1fr;grid-template-rows:1fr;aspect-ratio:auto}
  .gr-gallery .cell{aspect-ratio:3/2}
  .gr-gallery .cell.big{grid-column:1/3;grid-row:auto;aspect-ratio:16/10}
  .gr-gallery .cell:nth-child(n+4){display:none}
  .gr-gallery.one .cell.big{grid-column:1/2}
}
@media(max-width:640px){
  .gr-wrap{padding:0 16px}
  .gr-head h1{font-size:22px}
  .gr-band{grid-template-columns:1fr 1fr;border-radius:14px;gap:1px}
  .gr-band .c{padding:11px 12px;gap:8px;flex-direction:column}
  .gr-band .c .ic{width:18px;height:18px;margin-top:0}
  .gr-band .c .ic svg{width:18px;height:18px;stroke-width:1.8}
  .gr-band .c .k{font-size:9.5px;letter-spacing:.02em}
  .gr-band .c .v{font-size:13px;margin-top:1px}
  .gr-band .c .v small{font-size:10.5px}
  .gr-band .c .ph{margin-top:4px}
  .gr-band .c .ph .bar{height:7px}
  .gr-band .c .ph small{font-size:10px;margin-top:4px}
}
`;
