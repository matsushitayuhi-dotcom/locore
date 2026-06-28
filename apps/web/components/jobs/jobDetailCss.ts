/**
 * /jobs/[id] 求人詳細ページ (応募者目線) の scoped CSS。
 *
 * ★重要: App Router の初回 SSR で styled-jsx / :global() は当たらず全崩れするため、
 *   この CSS 文字列は JobDetail.tsx 内で
 *   <style dangerouslySetInnerHTML={{ __html: CSS }} /> として生 <style> 描画する。
 *   components/apartments/apptDetailCss.ts と同じ方式。
 *
 * 固有プレフィックスは .job-。承認済みモック job-detail.html のレイアウト/世界観を再現。
 * ブランド配色 (--bg/--card/--lime/--ink 等) と Google Fonts を維持。
 */
export const CSS = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Noto+Sans+JP:wght@400;500;700;800&display=swap');

.job{--bg:#F4F4EF;--bg2:#FBFBF8;--card:#fff;--lime:#A8E01C;--lime-d:#5E8B0E;--lime-l:#E3F7B8;--ink:#14140f;--ink2:#3a3a34;--mu:#7a7a72;--bd:#E6E6DE;--bd2:#D8D8CF;--warn:#C2410C;--warn-l:#FBEAE0;--jp:'Noto Sans JP','Space Grotesk',sans-serif;--disp:'Space Grotesk','Noto Sans JP',sans-serif;--mono:'JetBrains Mono',monospace;background:var(--bg);color:var(--ink);font-family:var(--jp);-webkit-font-smoothing:antialiased;font-feature-settings:"palt" 1;line-height:1.8;overflow-x:clip}
.job *{box-sizing:border-box}
.job a{color:inherit;text-decoration:none}
.job img{display:block;max-width:100%}
.job-wrap{max-width:1120px;margin:0 auto;padding:0 28px}

/* breadcrumb */
.job-crumb{font-size:12.5px;color:var(--mu);font-family:var(--mono);padding:20px 0 0}
.job-crumb a{text-decoration:underline;text-underline-offset:2px}

/* ===== title block ===== */
.job-head{padding:14px 0 18px}
.job-head .badges{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:11px}
.job-head .status{font-family:var(--mono);font-size:11.5px;font-weight:700;color:var(--lime-d);display:inline-flex;align-items:center;gap:5px}
.job-head .status i{width:7px;height:7px;border-radius:50%;background:var(--lime);display:inline-block;box-shadow:0 0 0 3px rgba(168,224,28,.25)}
.job-head .status.closed{color:var(--mu);background:rgba(0,0,0,.05);border-radius:999px;padding:3px 11px}
.job-head .tag{font-family:var(--mono);font-size:11.5px;font-weight:700;color:var(--lime-d);background:var(--lime-l);border-radius:999px;padding:3px 11px}
.job-head .urgent{font-family:var(--mono);font-size:11.5px;font-weight:700;color:#fff;background:var(--warn);border-radius:999px;padding:3px 11px}
.job-head h1{font-family:var(--jp);font-weight:900;font-size:clamp(23px,3vw,32px);line-height:1.3;letter-spacing:.01em}
.job-head .sub{display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px;margin-top:11px;font-size:13.5px;color:var(--ink2)}
.job-head .sub .co{font-weight:700}
.job-head .sub .loc{text-decoration:underline;text-underline-offset:2px}
.job-head .sub .dot{color:var(--bd2)}
.job-head .sub .posted{font-family:var(--mono);font-size:12px;color:var(--mu)}
.job-head .acts{margin-left:auto;display:flex;gap:6px}
.job-head .acts button{display:inline-flex;align-items:center;gap:7px;background:transparent;border:0;cursor:pointer;font-size:13px;font-weight:700;color:var(--ink2);padding:7px 11px;border-radius:9px}
.job-head .acts button:hover{background:rgba(0,0,0,.05)}
.job-head .acts button.on{color:var(--lime-d)}
.job-head .acts svg{width:17px;height:17px}

/* status banner */
.job-banner{display:flex;gap:12px;align-items:flex-start;background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:14px 16px;margin:4px 0 0}
.job-banner svg{width:20px;height:20px;color:var(--mu);flex:none;margin-top:2px}
.job-banner b{font-weight:700;font-size:14px}
.job-banner p{color:var(--mu);font-size:12.5px;margin-top:2px}

/* owner controls wrapper */
.job-owner{margin:14px 0 0;background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:14px 16px}
.job-owner p{font-size:12.5px;color:var(--mu);margin-bottom:8px}

/* ===== key conditions band ===== */
.job-band{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--bd);border:1px solid var(--bd);border-radius:18px;overflow:hidden;margin-top:6px}
.job-band .c{background:var(--card);padding:16px 18px;display:flex;gap:12px;align-items:flex-start}
.job-band .c .ic{flex:none;width:26px;height:26px;color:var(--lime-d);margin-top:1px}
.job-band .c .ic svg{width:26px;height:26px;stroke-width:1.6}
.job-band .c .k{font-size:11px;color:var(--mu);font-family:var(--mono);text-transform:uppercase;letter-spacing:.04em}
.job-band .c .v{font-weight:700;font-size:15px;margin-top:2px;line-height:1.5}
.job-band .c .v small{font-weight:500;color:var(--mu);font-size:11.5px;display:block;margin-top:1px;font-family:var(--jp)}
.job-band .c.ok .v{color:var(--lime-d)}

/* ===== two-column ===== */
.job-cols{display:grid;grid-template-columns:1fr 372px;gap:54px;padding:30px 0 70px;align-items:start}
.job-sec{padding:26px 0;border-top:1px solid var(--bd)}
.job-sec:first-child{border-top:0;padding-top:8px}
.job-sec h2{font-family:var(--jp);font-weight:900;font-size:20px;margin-bottom:14px}
.job-sec h2 .note{font-weight:500;font-size:12.5px;color:var(--mu);margin-left:10px}

.job-lead{font-size:15px;line-height:2.05;color:var(--ink2)}
.job-lead p+p{margin-top:14px}
.job-lead ul,.job-lead ol{margin:12px 0 12px 1.3em}
.job-lead li{margin:4px 0}
.job-lead h1,.job-lead h2,.job-lead h3{font-weight:700;margin:16px 0 8px;color:var(--ink)}
.job-lead a{color:var(--lime-d);text-decoration:underline}
.job-lead strong{font-weight:700;color:var(--ink)}

/* lime check bullets */
.job-checks{display:flex;flex-direction:column;gap:12px}
.job-checks li{display:flex;gap:12px;list-style:none;align-items:flex-start;font-size:14.5px;color:var(--ink2)}
.job-checks .ck{flex:none;width:23px;height:23px;border-radius:50%;background:var(--lime-l);color:var(--lime-d);display:grid;place-items:center;margin-top:1px}
.job-checks .ck svg{width:13px;height:13px}

/* required / preferred two groups */
.job-reqgrid{display:grid;grid-template-columns:1fr 1fr;gap:26px}
.job-reqgrid .label{font-family:var(--mono);font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:13px}
.job-reqgrid .must .label{color:var(--lime-d)}
.job-reqgrid .pref .label{color:var(--mu)}
.job-reqgrid .pref .ck{background:#eef0ea;color:var(--mu)}

/* language requirement */
.job-langs{display:flex;flex-direction:column;gap:14px}
.job-lang{display:flex;align-items:center;gap:16px}
.job-lang .nm{width:96px;font-weight:700;font-size:14.5px;flex:none}
.job-lang .meter{flex:1;display:flex;gap:5px}
.job-lang .meter i{flex:1;height:7px;border-radius:4px;background:var(--bd)}
.job-lang .meter i.on{background:var(--lime)}
.job-lang .lvl{width:130px;text-align:right;font-size:12.5px;color:var(--ink2);flex:none}
.job-lang .lvl b{font-weight:700}
.job-langnote{margin-top:14px;font-size:13px;color:var(--mu);display:flex;gap:8px;align-items:flex-start}
.job-langnote svg{width:16px;height:16px;color:var(--lime-d);flex:none;margin-top:2px}

/* benefits 2-col */
.job-ben{display:grid;grid-template-columns:1fr 1fr;gap:11px 22px}
.job-ben div{display:flex;gap:10px;align-items:center;font-size:14px;color:var(--ink2)}
.job-ben svg{width:18px;height:18px;color:var(--lime-d);flex:none}

/* spec table */
.job-spec{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px 18px;background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:18px}
.job-spec .k{font-size:10px;color:var(--mu);font-family:var(--mono);text-transform:uppercase;letter-spacing:.08em;display:flex;align-items:center;gap:5px}
.job-spec .k svg{width:12px;height:12px}
.job-spec .v{font-size:13.5px;font-weight:500;color:var(--ink);margin-top:3px}

/* selection steps */
.job-steps{display:flex;flex-direction:column;gap:0}
.job-step{display:flex;gap:16px;position:relative;padding-bottom:22px}
.job-step:last-child{padding-bottom:0}
.job-step .n{flex:none;width:30px;height:30px;border-radius:50%;background:var(--lime);color:var(--ink);font-family:var(--disp);font-weight:700;font-size:14px;display:grid;place-items:center;z-index:1}
.job-step:not(:last-child)::before{content:"";position:absolute;left:14.5px;top:30px;bottom:0;width:2px;background:var(--bd)}
.job-step .t{font-weight:700;font-size:14.5px}
.job-step .d{color:var(--mu);font-size:13px;margin-top:2px}

/* company card */
.job-cocard{display:flex;gap:18px;align-items:flex-start;background:var(--card);border:1px solid var(--bd);border-radius:18px;padding:22px}
.job-cocard .lg{width:62px;height:62px;border-radius:14px;object-fit:cover;flex:none;border:1px solid var(--bd)}
.job-cocard .lgf{width:62px;height:62px;border-radius:14px;flex:none;border:1px solid var(--bd);background:var(--lime-l);color:var(--lime-d);display:grid;place-items:center;font-family:var(--disp);font-weight:700;font-size:24px}
.job-cocard .nm{font-weight:700;font-size:17px;display:flex;align-items:center;flex-wrap:wrap;gap:4px}
.job-cocard .badge{display:inline-flex;align-items:center;gap:5px;font-family:var(--mono);font-size:11px;font-weight:700;color:var(--lime-d)}
.job-cocard .badge svg{width:13px;height:13px}
.job-cocard .meta{color:var(--mu);font-size:12.5px;font-family:var(--mono);margin:3px 0 6px}
.job-cocard .chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}
.job-cocard .chips span{font-size:11.5px;font-weight:700;color:var(--lime-d);background:var(--lime-l);border-radius:999px;padding:3px 10px}
.job-cocard .bio{font-size:13.5px;color:var(--ink2);line-height:1.9}
.job-cocard .link{display:inline-flex;align-items:center;gap:6px;margin-top:11px;font-size:13px;font-weight:700;color:var(--lime-d)}
.job-cocard .link svg{width:13px;height:13px}

/* ===== apply card (sticky) ===== */
.job-apply{position:sticky;top:86px;background:var(--card);border:1px solid var(--bd);border-radius:20px;padding:24px;box-shadow:0 26px 60px -34px rgba(20,20,15,.5)}
.job-apply .pay{font-size:12px;color:var(--mu);font-family:var(--mono);text-transform:uppercase;letter-spacing:.05em}
.job-apply .payv{display:flex;align-items:baseline;gap:7px;margin-top:3px;flex-wrap:wrap}
.job-apply .payv b{font-family:var(--disp);font-size:27px;font-weight:700}
.job-apply .payv span{color:var(--mu);font-size:14px}
.job-apply .gross{margin-top:4px;font-size:11.5px;color:var(--mu)}
.job-apply .facts{margin:18px 0;border:1px solid var(--bd);border-radius:14px;overflow:hidden}
.job-apply .facts .row{display:flex;justify-content:space-between;gap:12px;padding:11px 16px;font-size:13px;color:var(--ink2);border-bottom:1px solid var(--bd)}
.job-apply .facts .row:last-child{border-bottom:0}
.job-apply .facts .row span:first-child{color:var(--mu)}
.job-apply .facts .row span:last-child{font-weight:700;color:var(--ink);text-align:right}
.job-apply .facts .row .hot{color:var(--warn)}
.job-apply .ctawrap{margin-top:2px}
.job-apply .save{display:block;width:100%;text-align:center;margin-top:10px;background:#fff;border:1px solid var(--bd2);border-radius:13px;padding:13px;font-size:14px;font-weight:800;cursor:pointer;color:var(--ink)}
.job-apply .save:hover{background:var(--bg2)}
.job-apply .save.on{color:var(--lime-d);border-color:var(--lime)}
.job-apply .closed{margin-top:6px;text-align:center;font-size:13px;font-weight:700;color:var(--mu);background:var(--bg2);border:1px solid var(--bd);border-radius:13px;padding:13px}
.job-apply .docs{margin-top:16px;font-size:12px;color:var(--ink2);background:var(--bg2);border:1px solid var(--bd);border-radius:11px;padding:11px 13px;line-height:1.7}
.job-apply .docs b{font-weight:700}
.job-apply .note{margin-top:14px;font-size:11.5px;color:var(--mu);line-height:1.7;display:flex;gap:8px}
.job-apply .note svg{width:15px;height:15px;color:var(--warn);flex:none;margin-top:1px}

/* fraud notice */
.job-fraud{border-top:1px solid var(--bd);padding:24px 0 50px}
.job-fraud .ft{display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px;color:var(--warn);margin-bottom:10px}
.job-fraud .ft svg{width:18px;height:18px}
.job-fraud ul{margin:0 0 0 1.1em;color:var(--ink2);font-size:13px;line-height:1.9}

/* responsive */
@media(max-width:860px){
  .job-cols{grid-template-columns:1fr;gap:0}
  .job-apply{position:static;margin-top:8px;box-shadow:none}
  .job-band{grid-template-columns:1fr 1fr}
  .job-spec{grid-template-columns:1fr 1fr}
  .job-reqgrid{grid-template-columns:1fr;gap:22px}
}
@media(max-width:560px){
  .job-wrap{padding:0 16px}
  .job-head h1{font-size:22px}
  .job-band{grid-template-columns:1fr}
  .job-ben{grid-template-columns:1fr}
  .job-lang .lvl{width:auto}
}
`;
