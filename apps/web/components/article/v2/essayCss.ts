/**
 * ブログ・場所なし（essay）新レンダラの scoped CSS（.es-）。
 * EssayMock.tsx の CSS を流用。本文 HTML（.es-body）向けスタイルを追記。
 * 動画は 16:9 中央（二重センタリング禁止: max-width＋margin-inline:auto）。
 */
export const CSS = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700;800;900&display=swap');

.es{--bg:#F4F4EF;--bg2:#ECECE4;--white:#fff;--ink:#111;--ink2:#2a2a28;--mu:#6E6E6E;--bd:#E7E7E0;--bd2:#D8D8CF;--lime:#A8E01C;--lime-d:#5E8B0E;--lime-l:#E3F7B8;--glow:rgba(168,224,28,.5);--mono:'JetBrains Mono',ui-monospace,monospace;--disp:'Space Grotesk','Noto Sans JP',sans-serif;--jp:'Noto Sans JP',system-ui,sans-serif;--ease:cubic-bezier(.22,1,.36,1);position:relative;background:var(--bg);color:var(--ink);font-family:var(--jp);line-height:1.95;-webkit-font-smoothing:antialiased;overflow-x:clip}
.es *{box-sizing:border-box;margin:0;padding:0}
.es a{color:inherit;text-decoration:none}
.es img{display:block;max-width:100%}
.es-read{max-width:720px;margin:0 auto;padding:0 24px}
.es-wide{max-width:1180px;margin:0 auto;padding:0 24px}
.es-kicker{font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--lime-d)}

.es-hero{position:relative;width:100vw;left:50%;transform:translateX(-50%);min-height:92svh;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;color:#fff;background:#080a10}
.es-hbg{position:absolute;inset:0;z-index:0;background-size:cover;background-position:center;animation:esken 26s var(--ease) infinite alternate}
@keyframes esken{from{transform:scale(1.05)}to{transform:scale(1.15)}}
.es-hnet{position:absolute;inset:0;z-index:1;width:100%;height:100%}
.es-hshade{position:absolute;inset:0;z-index:2;background:linear-gradient(180deg,rgba(8,10,16,.34),rgba(8,10,16,.12) 40%,rgba(8,10,16,.66) 80%,rgba(8,10,16,.95))}
.es-hinner{position:relative;z-index:3;width:100%;max-width:820px;margin:0 auto;padding:0 24px 70px;text-align:center}
.es-hkick{display:inline-flex;align-items:center;gap:11px;font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:var(--lime)}
.es-hero h1{color:#fff;font-family:var(--disp);font-weight:700;letter-spacing:-.025em;line-height:1.1;font-size:clamp(34px,5.4vw,68px);margin-top:22px;text-shadow:0 2px 36px rgba(0,0,0,.5)}
.es-hero h1 em{font-style:italic;color:var(--lime);font-weight:600}
.es-hsub{margin:22px auto 0;max-width:540px;font-size:clamp(15px,1.7vw,17px);line-height:1.85;color:rgba(255,255,255,.84)}
.es-hauthor{margin-top:28px;display:inline-flex;align-items:center;gap:12px}
.es-hauthor img{width:42px;height:42px;border-radius:50%;object-fit:cover;border:1.5px solid rgba(255,255,255,.4)}
.es-hauthor .nm{font-weight:700;color:#fff;font-size:14px;text-align:left}
.es-hauthor .meta{font-family:var(--mono);font-size:11.5px;color:rgba(255,255,255,.7);margin-top:2px;text-align:left}
.es-scroll{position:absolute;left:50%;bottom:20px;transform:translateX(-50%);z-index:3;font-family:var(--mono);font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.6);display:flex;flex-direction:column;align-items:center;gap:9px;animation:esbob 2.4s ease-in-out infinite}
@keyframes esbob{0%,100%{transform:translate(-50%,0)}50%{transform:translate(-50%,7px)}}
.es-scroll .ln{width:1px;height:34px;background:linear-gradient(var(--lime),transparent)}

.es-article{padding:74px 0 30px}
.es-article .es-kicker{display:block;text-align:center;margin-bottom:22px}

/* 本文 HTML（renderArticleBodyHtml）。読み物タイポを当てる。 */
.es-body{max-width:720px;margin:0 auto;padding:0 24px}
.es-body p{font-size:16.5px;line-height:1.95;color:var(--ink2);margin-top:26px}
.es-body p:first-child{margin-top:0}
.es-body h2{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:clamp(24px,3vw,34px);letter-spacing:-.02em;line-height:1.25;margin-top:56px}
.es-body h3{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:clamp(20px,2.4vw,26px);letter-spacing:-.015em;margin-top:40px}
.es-body ul,.es-body ol{margin:20px 0;padding-left:1.5em;color:var(--ink2);font-size:16px;line-height:1.9}
.es-body li{margin:6px 0}
.es-body a{color:var(--lime-d);text-decoration:underline}
.es-body strong,.es-body b{color:var(--ink)}
.es-body img{width:100%;border-radius:14px;margin:36px 0;background:var(--bg2)}
.es-body blockquote{margin:40px 0;padding-left:18px;border-left:3px solid var(--lime);color:var(--ink);font-family:var(--disp);font-weight:500;font-size:clamp(18px,2.2vw,24px);line-height:1.55}
.es-body blockquote p{margin:0;color:inherit;font-size:inherit}
.es-body hr{width:60px;height:2px;background:var(--lime);border:none;margin:54px auto}
.es-body pre{background:var(--ink);color:#e8f7c8;border-radius:12px;padding:16px 18px;overflow-x:auto;margin:28px 0;font-family:var(--mono);font-size:13px}
.es-body code{font-family:var(--mono);font-size:.92em}
.es-body table{width:100%;border-collapse:collapse;margin:28px 0;font-size:14px}
.es-body th,.es-body td{border:1px solid var(--bd);padding:9px 12px;text-align:left}
.es-body th{background:var(--bg2)}

/* image（photo_entries）ブロック。記事より少し広い・中央寄せ（二重センタリング禁止）。 */
.es-figure{position:relative;width:100%;max-width:1000px;margin:48px auto;padding:0 24px}
.es-figure .ph{aspect-ratio:21/9;overflow:hidden;border-radius:14px;background:var(--bg2)}
@media(max-width:720px){.es-figure{padding:0}.es-figure .ph{aspect-ratio:4/3;border-radius:0}}
.es-figure img{width:100%;height:100%;object-fit:cover;display:block}
.es-figcap{max-width:720px;margin:12px auto 0;padding:0 24px;font-family:var(--mono);font-size:11.5px;color:var(--mu)}

/* video（article_videos）ブロック。16:9 レスポンシブ・中央寄せ。 */
.es-video{position:relative;width:100%;max-width:1000px;margin:48px auto;padding:0 24px}
@media(max-width:720px){.es-video{padding:0 24px}}
.es-vframe{position:relative;aspect-ratio:16/9;width:100%;border-radius:14px;overflow:hidden;background:#000;box-shadow:0 24px 60px -30px rgba(0,0,0,.5)}
.es-vframe iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block}
.es-vbadge{position:absolute;top:12px;left:12px;z-index:3;font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.06em;color:#0b0c09;background:var(--lime);padding:6px 11px;border-radius:999px}
.es-vlink{max-width:720px;margin:18px auto;padding:0 24px}
.es-vlink a{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:12.5px;font-weight:600;color:var(--lime-d);border:1px solid var(--bd2);padding:10px 16px;border-radius:999px}

.es-foot{padding:40px 0 30px}
.es-byline{display:flex;gap:18px;align-items:center;border-top:1px solid var(--bd);border-bottom:1px solid var(--bd);padding:26px 0}
.es-byline img{width:64px;height:64px;border-radius:50%;object-fit:cover;flex:none;border:2px solid var(--lime)}
.es-byline .k{font-family:var(--mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--lime-d)}
.es-byline h3{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:18px;margin-top:5px}
.es-byline .role{font-family:var(--mono);font-size:11.5px;color:var(--mu);margin-top:3px}
.es-byline .bio{font-size:12.5px;line-height:1.75;color:var(--ink2);margin-top:9px}

.es-related{position:relative;width:100vw;left:50%;transform:translateX(-50%);background:var(--bg2);padding:74px 0 90px;margin-top:50px}
.es-related .head{margin-bottom:30px}
.es-related h2{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:clamp(24px,3.4vw,38px);letter-spacing:-.02em}
.es-rgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.es-rcard{display:block;background:var(--white);border:1px solid var(--bd);border-radius:18px;overflow:hidden;transition:transform .4s var(--ease),box-shadow .4s,border-color .4s;box-shadow:0 12px 30px -20px rgba(17,17,17,.2)}
.es-rcard:hover{transform:translateY(-5px);border-color:rgba(168,224,28,.55);box-shadow:0 26px 50px -24px rgba(17,17,17,.26)}
.es-rcov{aspect-ratio:16/11;overflow:hidden;background:var(--bg2)}
.es-rcov img{width:100%;height:100%;object-fit:cover;transition:transform 1s var(--ease)}
.es-rcard:hover .es-rcov img{transform:scale(1.06)}
.es-rb{padding:18px 20px 22px}
.es-rb .c{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--lime-d);font-weight:600}
.es-rb h3{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:17px;line-height:1.35;margin-top:9px}

.es-dates{padding:40px 0 70px}
.es-dateline{display:flex;flex-wrap:wrap;gap:8px 22px;justify-content:center;align-items:center;font-family:var(--mono);font-size:12px;color:var(--mu);border-top:1px solid var(--bd);border-bottom:1px solid var(--bd);padding:20px 0}
.es-dateline span{display:inline-flex;align-items:center;gap:8px}
.es-dateline b{color:var(--ink2);font-weight:600}
.es-dateline i{width:5px;height:5px;border-radius:50%;background:var(--lime);display:inline-block}

.es-rev{opacity:0;transform:translateY(24px);transition:opacity .8s var(--ease),transform .9s var(--ease)}
.es-rev.in{opacity:1;transform:none}

@media(max-width:820px){
  .es-rgrid{grid-template-columns:1fr}
}
@media(max-width:720px){
  .es-scroll{display:none}
  .es-byline{flex-direction:column;text-align:center}
}
`;
