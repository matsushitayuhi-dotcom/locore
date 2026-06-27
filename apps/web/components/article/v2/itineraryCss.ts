/**
 * モデルコース新レンダラの scoped CSS（.tj-）。
 * TripArticleMock.tsx の CSS を流用（フルブリードのダークヒーロー、ライム×クリーム、
 * overflow-x:clip ガード、見出し color 明示）。実データ用に .tj-leadbody /
 * .tj-ctxt 内の HTML 要素向けスタイルを追記。
 */
export const CSS = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700;800;900&display=swap');

.tj{--bg:#F4F4EF;--bg2:#ECECE4;--white:#fff;--ink:#111;--ink2:#2a2a28;--mu:#6E6E6E;--bd:#E7E7E0;--bd2:#D8D8CF;--lime:#A8E01C;--lime-d:#5E8B0E;--lime-l:#E3F7B8;--glow:rgba(168,224,28,.5);--mono:'JetBrains Mono',ui-monospace,monospace;--disp:'Space Grotesk','Noto Sans JP',sans-serif;--jp:'Noto Sans JP',system-ui,sans-serif;--ease:cubic-bezier(.22,1,.36,1);position:relative;background:var(--bg);color:var(--ink);font-family:var(--jp);line-height:1.75;-webkit-font-smoothing:antialiased;overflow-x:clip}
.tj *{box-sizing:border-box;margin:0;padding:0}
.tj a{color:inherit;text-decoration:none}
.tj img{display:block;max-width:100%}
.tj-wrap{max-width:760px;margin:0 auto;padding:0 24px}
.tj-wide{max-width:1180px;margin:0 auto;padding:0 24px}
.tj-kicker{font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--lime)}
.tj-kicker.dk{color:var(--lime-d)}

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

.tj-lead{padding:88px 0 16px}
.tj-lead .tj-kicker{display:block;text-align:center;margin-bottom:26px}
.tj-leadbody{font-family:var(--disp);font-weight:500;font-size:clamp(19px,2.4vw,27px);line-height:1.6;letter-spacing:-.012em;color:var(--ink);text-align:center}
.tj-leadbody p{margin:0 0 .6em}
.tj-leadbody p:last-child{margin-bottom:0}
.tj-leadbody em{font-style:normal;color:var(--lime-d);background:linear-gradient(transparent 62%,var(--lime-l) 62%);padding:0 .08em}
.tj-leadbody strong{color:var(--lime-d)}
.tj-leadbody a{color:var(--lime-d);text-decoration:underline}

.tj-tl{padding:72px 0 40px}
.tj-tlhead{text-align:center;margin-bottom:54px}
.tj-tlhead h2{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:clamp(28px,4vw,46px);letter-spacing:-.02em;margin-top:14px}
.tj-tlhead p{color:var(--mu);font-size:15px;margin-top:14px}
.tj-line{position:relative;padding-left:0}
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
.tj-ctxt p{margin:0 0 .7em}
.tj-ctxt p:last-child{margin-bottom:0}
.tj-ctxt h2,.tj-ctxt h3,.tj-ctxt h4{color:var(--ink);font-family:var(--disp);margin:.6em 0 .3em}
.tj-ctxt ul,.tj-ctxt ol{margin:.4em 0 .7em;padding-left:1.4em}
.tj-ctxt a{color:var(--lime-d);text-decoration:underline}
.tj-ctxt img{border-radius:10px;margin:.6em 0}
.tj-ctxt blockquote{border-left:3px solid var(--lime);padding-left:14px;color:var(--ink2);margin:.6em 0}
.tj-cextras{margin-top:18px;display:flex;flex-wrap:wrap;gap:9px}
.tj-cost{display:inline-flex;align-items:center;gap:7px;font-family:var(--mono);font-size:12px;font-weight:600;color:var(--lime-d);background:var(--lime-l);border:1px solid rgba(168,224,28,.45);padding:6px 13px;border-radius:999px}
.tj-tipline{margin-top:14px;display:flex;gap:11px;align-items:flex-start;padding:12px 15px;border-radius:12px;background:var(--bg);border:1px dashed var(--bd2);font-size:12.5px;line-height:1.7;color:var(--ink2)}
.tj-tipline .ic,.tj-tipline>svg{flex:none;color:var(--lime-d);margin-top:1px;width:16px;height:16px}
.tj-tipline b{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--lime-d);display:block;margin-bottom:2px}
.tj-tipline .tx{white-space:pre-line}
.tj-conn{position:relative;padding-left:74px;margin:6px 0 18px}
@media(min-width:721px){.tj-conn{padding-left:92px}}
.tj-conn .pill{display:inline-flex;align-items:center;gap:9px;font-family:var(--mono);font-size:12px;font-weight:500;color:var(--ink2);background:var(--white);border:1px solid var(--bd);border-radius:999px;padding:8px 16px;box-shadow:0 4px 14px -8px rgba(17,17,17,.2)}
.tj-conn .pill .ic{color:var(--lime-d)}
.tj-conn .lbl{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--mu);margin-right:2px}

.tj-mapsec{padding:84px 0}
.tj-maphead{margin-bottom:24px}
.tj-maphead h2{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:clamp(24px,3.2vw,38px);letter-spacing:-.02em;margin-top:10px}
.tj-maphead p{color:var(--mu);font-size:14px;margin-top:10px}
.tj-mapgrid{display:grid;grid-template-columns:1.3fr .7fr;gap:36px;align-items:stretch}
.tj-mapframe{position:relative;border-radius:22px;overflow:hidden;border:1px solid var(--bd);min-height:420px;background:#dfe4e8;box-shadow:0 18px 44px -26px rgba(17,17,17,.3)}
.tj-mapframe iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block}
.tj-mapframe .locore-map-canvas{position:absolute;inset:0}
.tj-mapfallback{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;font-family:var(--mono);font-size:12.5px;line-height:1.7;color:var(--mu)}
.tj-mapbadge{position:absolute;top:14px;left:14px;z-index:3;font-family:var(--mono);font-size:10.5px;font-weight:600;letter-spacing:.04em;color:#0b0c09;background:var(--lime);padding:7px 13px;border-radius:999px;box-shadow:0 6px 16px -6px var(--glow)}
.tj-maplist{display:flex;flex-direction:column;gap:0}
.tj-maplist .lab{font-family:var(--mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--lime-d);margin-bottom:8px}
.tj-mlrow{display:flex;align-items:center;gap:12px;padding:11px 2px;border-bottom:1px solid var(--bd)}
.tj-mlrow .num{flex:none;width:26px;height:26px;border-radius:50%;background:var(--ink);color:var(--lime);font-family:var(--mono);font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center}
.tj-mlrow .nm{flex:1;min-width:0;font-size:13.5px;font-weight:700;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tj-mlrow .tm{font-family:var(--mono);font-size:11px;color:var(--mu);flex:none}
.tj-mlrow a.pin{flex:none;color:var(--lime-d)}
.tj-mlrow a.pin svg{width:16px;height:16px}

.tj-authsec{padding:60px 0 56px}
.tj-authcard{display:flex;gap:26px;align-items:center;background:var(--white);border:1px solid var(--bd);border-radius:24px;padding:32px 34px;box-shadow:0 18px 44px -26px rgba(17,17,17,.22)}
.tj-authcard img{width:96px;height:96px;border-radius:50%;object-fit:cover;flex:none;border:2px solid var(--lime)}
.tj-authcard .k{font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--lime-d)}
.tj-authcard h3{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:24px;margin-top:7px}
.tj-authcard .role{font-family:var(--mono);font-size:12.5px;color:var(--mu);margin-top:4px}
.tj-authcard .role .tier{color:var(--lime-d);font-weight:700}
.tj-authcard .bio{font-size:13.5px;line-height:1.85;color:var(--ink2);margin-top:13px;max-width:52ch}
.tj-authcard .body{flex:1;min-width:0}
.tj-authcta{margin-top:16px;display:inline-flex;align-items:center;gap:9px;font-family:var(--mono);font-size:13px;font-weight:600;color:#0b0c09;background:var(--lime);padding:11px 22px;border-radius:999px;transition:transform .2s,box-shadow .2s;box-shadow:0 12px 28px -10px var(--glow)}
.tj-authcta:hover{transform:translateY(-2px)}
.tj-authcta svg{width:14px;height:14px}
.tj-authlinks{margin-top:14px;display:flex;flex-wrap:wrap;gap:16px;align-items:center}
.tj-authlink{font-family:var(--mono);font-size:12px;font-weight:600;color:var(--lime-d);display:inline-flex;align-items:center;gap:6px}
.tj-authlink:hover{text-decoration:underline}
.tj-authlink svg{width:12px;height:12px}
/* 著者サービス */
.tj-authsvc{margin-top:26px;border-top:1px solid var(--bd);padding-top:22px}
.tj-authsvc .lab{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.tj-authsvc .lab .k{font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--lime-d)}
.tj-authsvc .lab a{font-family:var(--mono);font-size:11px;font-weight:600;color:var(--lime-d)}
.tj-authsvc-grid{margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:720px){.tj-authsvc-grid{grid-template-columns:1fr}}

/* ヒーロー内アクション（いいね / 保存）= 既定 白 / active ライム */
.tj-heroact{margin-top:26px;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.tj-hact{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:13px;font-weight:600;color:#0b0c09;background:#fff;border:1px solid rgba(255,255,255,.7);padding:10px 18px;border-radius:999px;cursor:pointer;transition:background .2s,color .2s,transform .15s,box-shadow .2s;box-shadow:0 6px 18px -10px rgba(0,0,0,.5)}
.tj-hact:hover{transform:translateY(-1px)}
.tj-hact:disabled{opacity:.7;cursor:default}
.tj-hact svg{width:16px;height:16px}
.tj-hact .ct{font-variant-numeric:tabular-nums}
.tj-hact.on{background:var(--lime);color:#0b0c09;border-color:var(--lime);box-shadow:0 10px 26px -10px var(--glow)}
.tj-body{padding:48px 0 20px}
.tj-bodywrap{max-width:760px;margin:0 auto;padding:0 24px}
@media(max-width:720px){.tj-body{padding:32px 0 12px}}

.tj-dates{padding:0 0 70px}
.tj-dateline{display:flex;flex-wrap:wrap;gap:8px 22px;justify-content:center;align-items:center;font-family:var(--mono);font-size:12px;color:var(--mu);border-top:1px solid var(--bd);border-bottom:1px solid var(--bd);padding:20px 0}
.tj-dateline span{display:inline-flex;align-items:center;gap:8px}
.tj-dateline b{color:var(--ink2);font-weight:600}
.tj-dateline i{width:5px;height:5px;border-radius:50%;background:var(--lime);display:inline-block}

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

.tj-rev{opacity:0;transform:translateY(28px);transition:opacity .8s var(--ease),transform .9s var(--ease)}
.tj-rev.in{opacity:1;transform:none}

@media(max-width:880px){
  .tj-mapgrid{grid-template-columns:1fr;gap:28px}
  .tj-mapframe{min-height:340px}
}
@media(max-width:720px){
  .tj-hinner{padding:0 22px 48px}
  .tj-lead{padding:64px 0 8px}
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
