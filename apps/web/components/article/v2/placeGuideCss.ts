/**
 * ブログ・場所あり（place-guide）新レンダラの scoped CSS（.pg-）。
 * PlaceGuideMock.tsx の CSS を流用。実データの本文 HTML 用に .pg-intro-body /
 * .pg-ptxt 内要素のスタイルを追記。
 */
export const CSS = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700;800;900&display=swap');

.pg{--bg:#F4F4EF;--bg2:#ECECE4;--white:#fff;--ink:#111;--ink2:#2a2a28;--mu:#6E6E6E;--bd:#E7E7E0;--bd2:#D8D8CF;--lime:#A8E01C;--lime-d:#5E8B0E;--lime-l:#E3F7B8;--glow:rgba(168,224,28,.5);--mono:'JetBrains Mono',ui-monospace,monospace;--disp:'Space Grotesk','Noto Sans JP',sans-serif;--jp:'Noto Sans JP',system-ui,sans-serif;--ease:cubic-bezier(.22,1,.36,1);position:relative;background:var(--bg);color:var(--ink);font-family:var(--jp);line-height:1.8;-webkit-font-smoothing:antialiased;overflow-x:clip}
.pg *{box-sizing:border-box;margin:0;padding:0}
.pg a{color:inherit;text-decoration:none}
.pg img{display:block;max-width:100%}
.pg-wrap{max-width:760px;margin:0 auto;padding:0 24px}
.pg-wide{max-width:1180px;margin:0 auto;padding:0 24px}
.pg-kicker{font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--lime-d)}

.pg-hero{position:relative;width:100vw;left:50%;transform:translateX(-50%);min-height:88svh;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;color:#fff;background:#080a10}
.pg-hbg{position:absolute;inset:0;z-index:0;background-size:cover;background-position:center;animation:pgken 24s var(--ease) infinite alternate}
@keyframes pgken{from{transform:scale(1.06)}to{transform:scale(1.15)}}
.pg-hnet{position:absolute;inset:0;z-index:1;width:100%;height:100%}
.pg-hshade{position:absolute;inset:0;z-index:2;background:linear-gradient(180deg,rgba(8,10,16,.4),rgba(8,10,16,.18) 34%,rgba(8,10,16,.64) 76%,rgba(8,10,16,.95))}
.pg-hinner{position:relative;z-index:3;width:100%;max-width:1180px;margin:0 auto;padding:0 32px 60px}
.pg-hkick{display:inline-flex;align-items:center;gap:11px;font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--lime)}
.pg-hkick::before{content:"";width:30px;height:1.5px;background:var(--lime)}
.pg-hero h1{color:#fff;font-family:var(--disp);font-weight:800;letter-spacing:-.03em;line-height:1.05;font-size:clamp(36px,6vw,80px);margin-top:22px;max-width:17ch;text-shadow:0 2px 36px rgba(0,0,0,.5)}
.pg-hero h1 em{font-style:normal;color:var(--lime)}
.pg-hsub{margin-top:22px;max-width:560px;font-size:clamp(15px,1.7vw,18px);line-height:1.85;color:rgba(255,255,255,.84)}
.pg-hauthor{margin-top:28px;display:flex;align-items:center;gap:13px}
.pg-hauthor img{width:46px;height:46px;border-radius:50%;object-fit:cover;border:1.5px solid rgba(255,255,255,.4)}
.pg-hauthor .nm{font-weight:700;color:#fff;font-size:14.5px}
.pg-hauthor .meta{font-family:var(--mono);font-size:11.5px;color:rgba(255,255,255,.7);margin-top:2px}
.pg-hmeta{margin-top:26px;display:flex;flex-wrap:wrap;gap:10px}
.pg-pill{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:12.5px;font-weight:500;color:rgba(255,255,255,.92);background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(8px);padding:9px 15px;border-radius:999px}
.pg-pill b{color:var(--lime);font-weight:700}
.pg-scroll{position:absolute;left:50%;bottom:20px;transform:translateX(-50%);z-index:3;font-family:var(--mono);font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.6);display:flex;flex-direction:column;align-items:center;gap:9px;animation:pgbob 2.4s ease-in-out infinite}
@keyframes pgbob{0%,100%{transform:translate(-50%,0)}50%{transform:translate(-50%,7px)}}
.pg-scroll .ln{width:1px;height:34px;background:linear-gradient(var(--lime),transparent)}

.pg-intro{padding:84px 0 20px}
.pg-intro .pg-kicker{display:block;text-align:center;margin-bottom:24px}
.pg-intro-body{font-family:var(--disp);font-weight:500;font-size:clamp(19px,2.4vw,26px);line-height:1.62;letter-spacing:-.012em;color:var(--ink);text-align:center}
.pg-intro-body p{margin:0 0 .6em}
.pg-intro-body p:last-child{margin-bottom:0}
.pg-intro-body em{font-style:normal;color:var(--lime-d);background:linear-gradient(transparent 62%,var(--lime-l) 62%);padding:0 .08em}
.pg-intro-body strong{color:var(--lime-d)}
.pg-intro-body a{color:var(--lime-d);text-decoration:underline}

.pg-places{padding:54px 0 30px}
.pg-placeshead{text-align:center;margin-bottom:48px}
.pg-placeshead h2{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:clamp(26px,3.6vw,44px);letter-spacing:-.02em;margin-top:12px}
.pg-placeshead p{color:var(--mu);font-size:15px;margin-top:12px}
.pg-prich{display:flex;flex-direction:column;gap:46px}
.pg-prow{display:grid;grid-template-columns:1fr 1fr;gap:38px;align-items:center}
.pg-prow.nophoto{grid-template-columns:1fr}
.pg-prow:nth-child(even) .pg-pphoto{order:2}
.pg-pphoto{position:relative;aspect-ratio:4/3;overflow:hidden;border-radius:20px;background:var(--bg2);box-shadow:0 18px 44px -26px rgba(17,17,17,.3)}
.pg-pphoto img{width:100%;height:100%;object-fit:cover;transition:transform 1.2s var(--ease)}
.pg-prow:hover .pg-pphoto img{transform:scale(1.05)}
.pg-pcat{position:absolute;top:14px;left:14px;z-index:2;font-family:var(--mono);font-size:10.5px;font-weight:600;color:#0b0c09;background:var(--lime);padding:6px 12px;border-radius:999px}
.pg-pname{display:flex;align-items:baseline;gap:12px}
.pg-pidx{font-family:var(--mono);font-size:13px;font-weight:700;color:var(--lime-d)}
.pg-pbody h3{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:clamp(22px,2.6vw,30px);letter-spacing:-.015em;line-height:1.2}
.pg-pplace{margin-top:9px;font-family:var(--mono);font-size:11.5px;color:var(--mu);display:flex;align-items:center;gap:6px}
.pg-pplace svg{width:12px;height:12px;color:var(--lime-d);flex:none}
.pg-ptxt{margin-top:14px;font-size:15px;line-height:1.95;color:var(--ink2)}
.pg-ptxt p{margin:0 0 .7em}
.pg-ptxt p:last-child{margin-bottom:0}
.pg-ptxt ul,.pg-ptxt ol{margin:.4em 0 .7em;padding-left:1.4em}
.pg-ptxt a{color:var(--lime-d);text-decoration:underline}
.pg-pextras{margin-top:16px;display:flex;flex-wrap:wrap;gap:9px;align-items:center}
.pg-cost{display:inline-flex;align-items:center;gap:7px;font-family:var(--mono);font-size:12px;font-weight:600;color:var(--lime-d);background:var(--lime-l);border:1px solid rgba(168,224,28,.45);padding:6px 13px;border-radius:999px}
.pg-maplink{display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:11.5px;font-weight:600;color:var(--ink);border:1px solid var(--bd2);padding:7px 13px;border-radius:999px;transition:border-color .2s,color .2s}
.pg-maplink:hover{border-color:var(--lime);color:var(--lime-d)}
.pg-maplink svg{width:13px;height:13px}
.pg-ptip{margin-top:14px;display:flex;gap:10px;align-items:flex-start;padding:11px 14px;border-radius:12px;background:var(--bg);border:1px dashed var(--bd2);font-size:12.5px;line-height:1.7;color:var(--ink2)}
.pg-ptip svg{flex:none;color:var(--lime-d);margin-top:1px;width:15px;height:15px}
.pg-ptip b{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--lime-d);display:block;margin-bottom:2px}
.pg-ptip .tx{white-space:pre-line}

.pg-mapsec{position:relative;width:100vw;left:50%;transform:translateX(-50%);background:var(--ink);padding:78px 0;margin-top:46px;overflow:hidden}
.pg-mapsec .glow{position:absolute;width:540px;height:540px;border-radius:50%;background:var(--lime);filter:blur(150px);opacity:.16;top:-220px;left:-60px}
.pg-mapsec .pg-wide{position:relative;z-index:2}
.pg-maphead{text-align:center;margin-bottom:30px}
.pg-maphead .pg-kicker{color:var(--lime)}
.pg-maphead h2{color:#fff;font-family:var(--disp);font-weight:700;font-size:clamp(24px,3.2vw,40px);letter-spacing:-.02em;margin-top:12px}
.pg-maphead p{color:rgba(255,255,255,.66);font-size:14px;margin-top:12px}
.pg-mapframe{position:relative;border-radius:22px;overflow:hidden;border:1px solid rgba(255,255,255,.14);height:clamp(360px,52vh,540px);background:#dfe4e8;box-shadow:0 24px 60px -30px rgba(0,0,0,.6)}
.pg-mapframe iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block}
.pg-mapframe .locore-map-canvas{position:absolute;inset:0}
.pg-mapfallback{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;font-family:var(--mono);font-size:12.5px;line-height:1.7;color:rgba(255,255,255,.7)}
.pg-mapbadge{position:absolute;top:16px;left:16px;z-index:3;font-family:var(--mono);font-size:10.5px;font-weight:600;color:#0b0c09;background:var(--lime);padding:7px 13px;border-radius:999px;box-shadow:0 8px 20px -6px var(--glow)}

.pg-listsec{padding:74px 0 30px}
.pg-listhead{text-align:center;margin-bottom:34px}
.pg-listhead h2{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:clamp(22px,3vw,34px);letter-spacing:-.02em;margin-top:10px}
.pg-list{display:flex;flex-direction:column;border-top:1px solid var(--bd)}
.pg-lrow{display:flex;align-items:center;gap:16px;padding:18px 6px;border-bottom:1px solid var(--bd);transition:padding-left .3s var(--ease)}
.pg-lrow:hover{padding-left:12px}
.pg-lthumb{flex:none;width:90px;aspect-ratio:4/3;border-radius:11px;overflow:hidden;background:var(--bg2)}
.pg-lthumb img{width:100%;height:100%;object-fit:cover}
.pg-lbody{flex:1;min-width:0}
.pg-lcat{font-family:var(--mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--lime-d);font-weight:600}
.pg-lrow h3{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:17px;line-height:1.3;margin-top:4px}
.pg-lplace{font-family:var(--mono);font-size:11px;color:var(--mu);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pg-lgo{flex:none;display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:11.5px;font-weight:600;color:var(--lime-d);border:1px solid var(--bd2);padding:8px 13px;border-radius:999px;transition:border-color .2s,background .2s}
.pg-lgo:hover{border-color:var(--lime);background:var(--lime-l)}
.pg-lgo svg{width:14px;height:14px}

.pg-authsec{padding:40px 0 56px}
.pg-authcard{display:flex;gap:26px;align-items:center;background:var(--white);border:1px solid var(--bd);border-radius:24px;padding:32px 34px;box-shadow:0 18px 44px -26px rgba(17,17,17,.22)}
.pg-authcard img{width:92px;height:92px;border-radius:50%;object-fit:cover;flex:none;border:2px solid var(--lime)}
.pg-authcard .k{font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--lime-d)}
.pg-authcard h3{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:23px;margin-top:7px}
.pg-authcard .role{font-family:var(--mono);font-size:12.5px;color:var(--mu);margin-top:4px}
.pg-authcard .bio{font-size:13.5px;line-height:1.85;color:var(--ink2);margin-top:12px;max-width:52ch}
.pg-authcard .body{flex:1;min-width:0}
.pg-authcta{margin-top:16px;display:inline-flex;align-items:center;gap:9px;font-family:var(--mono);font-size:13px;font-weight:600;color:#0b0c09;background:var(--lime);padding:11px 22px;border-radius:999px;transition:transform .2s;box-shadow:0 12px 28px -10px var(--glow)}
.pg-authcta:hover{transform:translateY(-2px)}
.pg-authcta svg{width:14px;height:14px}
.pg-authlinks{margin-top:14px;display:flex;flex-wrap:wrap;gap:16px;align-items:center}
.pg-authlink{font-family:var(--mono);font-size:12px;font-weight:600;color:var(--lime-d);display:inline-flex;align-items:center;gap:6px}
.pg-authlink:hover{text-decoration:underline}
.pg-authlink svg{width:12px;height:12px}
.pg-authsvc{margin-top:26px;border-top:1px solid var(--bd);padding-top:22px}
.pg-authsvc .lab{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.pg-authsvc .lab .k{font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--lime-d)}
.pg-authsvc .lab a{font-family:var(--mono);font-size:11px;font-weight:600;color:var(--lime-d)}
.pg-authsvc-grid{margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:720px){.pg-authsvc-grid{grid-template-columns:1fr}}

.pg-related{position:relative;width:100vw;left:50%;transform:translateX(-50%);background:var(--bg2);padding:80px 0 92px}
.pg-related .head{margin-bottom:32px}
.pg-related h2{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:clamp(24px,3.4vw,38px);letter-spacing:-.02em}
.pg-rgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.pg-rcard{display:block;background:var(--white);border:1px solid var(--bd);border-radius:18px;overflow:hidden;transition:transform .4s var(--ease),box-shadow .4s,border-color .4s;box-shadow:0 12px 30px -20px rgba(17,17,17,.2)}
.pg-rcard:hover{transform:translateY(-5px);border-color:rgba(168,224,28,.55);box-shadow:0 26px 50px -24px rgba(17,17,17,.26)}
.pg-rcov{aspect-ratio:16/11;overflow:hidden;background:var(--bg2)}
.pg-rcov img{width:100%;height:100%;object-fit:cover;transition:transform 1s var(--ease)}
.pg-rcard:hover .pg-rcov img{transform:scale(1.06)}
.pg-rb{padding:18px 20px 22px}
.pg-rb .c{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--lime-d);font-weight:600}
.pg-rb h3{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:17px;line-height:1.35;margin-top:9px}

.pg-heroact{margin-top:24px;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.pg-hact{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:13px;font-weight:600;color:#0b0c09;background:#fff;border:1px solid rgba(255,255,255,.7);padding:10px 18px;border-radius:999px;cursor:pointer;transition:background .2s,color .2s,transform .15s,box-shadow .2s;box-shadow:0 6px 18px -10px rgba(0,0,0,.5)}
.pg-hact:hover{transform:translateY(-1px)}
.pg-hact:disabled{opacity:.7;cursor:default}
.pg-hact svg{width:16px;height:16px}
.pg-hact .ct{font-variant-numeric:tabular-nums}
.pg-hact.on{background:var(--lime);color:#0b0c09;border-color:var(--lime);box-shadow:0 10px 26px -10px var(--glow)}
.pg-body{padding:54px 0 20px}
.pg-bodywrap{max-width:760px;margin:0 auto;padding:0 24px}
@media(max-width:720px){.pg-body{padding:36px 0 12px}}

.pg-dates{padding:0 0 70px}
.pg-dateline{display:flex;flex-wrap:wrap;gap:8px 22px;justify-content:center;align-items:center;font-family:var(--mono);font-size:12px;color:var(--mu);border-top:1px solid var(--bd);border-bottom:1px solid var(--bd);padding:20px 0}
.pg-dateline span{display:inline-flex;align-items:center;gap:8px}
.pg-dateline b{color:var(--ink2);font-weight:600}
.pg-dateline i{width:5px;height:5px;border-radius:50%;background:var(--lime);display:inline-block}

.pg-rev{opacity:0;transform:translateY(26px);transition:opacity .8s var(--ease),transform .9s var(--ease)}
.pg-rev.in{opacity:1;transform:none}

@media(max-width:820px){
  .pg-prow{grid-template-columns:1fr;gap:20px}
  .pg-prow:nth-child(even) .pg-pphoto{order:0}
  .pg-rgrid{grid-template-columns:1fr}
  .pg-authcard{flex-direction:column;text-align:center;padding:30px 22px}
  .pg-authcard .bio{margin-left:auto;margin-right:auto}
}
@media(max-width:720px){
  .pg-intro{padding:64px 0 8px}
  .pg-scroll{display:none}
  .pg-lthumb{width:72px}
}
`;
