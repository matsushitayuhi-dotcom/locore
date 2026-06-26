'use client';

import { useEffect, useRef } from 'react';

/* 2026-06: marketing landing. Ported from the approved design sample.
   Full-screen overlay (.lp) covers the layout chrome and carries its own nav.
   Styles scoped under .lp. Rotating network globe / marquees / reveal run in useEffect. */

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Noto+Sans+JP:wght@400;500;700;800&display=swap');

:root{
  --bg:#F4F4EF; --bg2:#ECECE4; --white:#FFFFFF;
  --ink:#111111; --ink2:#2a2a28; --mu:#6E6E6E; --bd:#E7E7E0; --bd2:#D8D8CF;
  --lime:#A8E01C; --lime-d:#5E8B0E; --lime-l:#E3F7B8; --glow:rgba(168,224,28,.5);
}
.lp *{box-sizing:border-box;margin:0;padding:0}
.lp{position:fixed;inset:0;z-index:100;box-sizing:border-box;overflow-y:auto;overflow-x:hidden;background:var(--bg);color:var(--ink);font-family:'Noto Sans JP','Space Grotesk',sans-serif;line-height:1.7;scroll-behavior:smooth;-webkit-font-smoothing:antialiased}
.lp h1,.lp h2,.lp h3,.lp .disp{font-family:'Space Grotesk','Noto Sans JP',sans-serif;font-weight:700;letter-spacing:-.022em;line-height:1.08}
.lp a{color:inherit;text-decoration:none}
.lp h1,.lp h2,.lp h3,.lp p{word-break:auto-phrase}
.mono{font-family:'JetBrains Mono',monospace}
.wrap{max-width:1180px;margin:0 auto;padding:0 32px}
.btn{display:inline-flex;align-items:center;gap:9px;padding:15px 28px;border-radius:999px;font-size:15px;font-weight:700;font-family:'Space Grotesk','Noto Sans JP';border:2px solid var(--ink);transition:.18s;background:transparent;color:var(--ink);cursor:pointer}
.btn:hover{transform:translateY(-2px)}
.btn.pri{background:var(--lime);border-color:var(--lime);color:#1c2a06;box-shadow:0 10px 26px -8px var(--glow)}
.btn.pri:hover{box-shadow:0 16px 36px -8px var(--glow)}
.klabel{font-family:'JetBrains Mono';font-size:12px;letter-spacing:.16em;color:var(--lime-d);text-transform:uppercase}

.navwrap{position:sticky;top:0;z-index:60;border-bottom:1px solid transparent;transition:background .35s ease,border-color .35s ease}
.navwrap.scrolled{background:rgba(11,13,19,.82);backdrop-filter:blur(14px);border-bottom-color:rgba(255,255,255,.09)}
.lp nav{max-width:1180px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:72px;padding:0 24px;background:transparent;border:none;border-radius:0;box-shadow:none}
.logo{display:flex;align-items:center;gap:8px;font-family:'Space Grotesk';font-weight:700;font-size:22px}
.logo b{color:var(--lime-d)}
.navwrap .logo{color:#fff}
.navwrap .logo b{color:var(--lime)}
.nlinks{display:flex;gap:30px;font-size:14px;color:rgba(255,255,255,.86);font-weight:500}
.nlinks a:hover{color:#fff}
.nright{display:flex;align-items:center;gap:18px}
.nlogin{font-size:14px;font-weight:500;color:rgba(255,255,255,.86)}
.nlogin:hover{color:#fff}

.hero{position:relative;min-height:100vh;overflow:hidden;background:#080a10;color:#fff;text-align:center;display:flex;align-items:center;justify-content:center}
.hero-bg{position:absolute;inset:0;z-index:0;background:linear-gradient(180deg,rgba(14,16,26,.28),rgba(14,16,26,.42) 58%,rgba(14,16,26,.74)),url('https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1700&q=78') center/cover}
.lp #net{position:absolute;inset:0;z-index:1;width:100%;height:100%;display:block}
.hero-content{position:relative;z-index:3;max-width:1180px;margin:0 auto;padding:56px 32px 0}
.hero h1{font-size:clamp(50px,8vw,100px);font-weight:800;margin:0 auto;max-width:13ch;color:#fff;text-shadow:0 6px 54px rgba(0,0,0,.5)}
.hero h1 .lime{color:var(--lime)}
.hero .lead{font-family:'JetBrains Mono',monospace;font-size:clamp(15px,1.6vw,18px);color:rgba(255,255,255,.82);max-width:600px;margin:32px auto 0;line-height:1.8}
.cta{display:flex;gap:14px;justify-content:center;margin-top:42px;flex-wrap:wrap}
.hero .btn{border-color:rgba(255,255,255,.5);color:#fff;background:rgba(255,255,255,.05)}
.hero .btn:hover{background:rgba(255,255,255,.14)}
.hero .btn.pri{background:var(--lime);border-color:var(--lime);color:#1c2a06}
.hero .btn.pri:hover{background:#b6ec33}

.shot{position:relative;z-index:2;max-width:1000px;margin:92px auto 0;perspective:1700px}
.frame{transform:rotateX(7deg);transform-origin:center top;border-radius:18px;border:1px solid var(--bd2);background:var(--white);box-shadow:0 70px 130px -40px rgba(0,0,0,.42),0 30px 60px -40px var(--glow);overflow:hidden}
.fbar{display:flex;align-items:center;gap:7px;padding:13px 17px;border-bottom:1px solid var(--bd);background:#fafaf7}
.fdot{width:11px;height:11px;border-radius:50%}
.furl{margin-left:12px;font-family:'JetBrains Mono';font-size:12px;color:var(--mu);background:var(--bg);border-radius:7px;padding:4px 14px}
.app{padding:22px;background:var(--bg)}
.appbar{display:flex;gap:10px;align-items:center;margin-bottom:18px}
.search{flex:1;height:42px;border-radius:12px;border:1px solid var(--bd);background:#fff;display:flex;align-items:center;padding:0 16px;font-size:13px;color:var(--mu);font-family:'JetBrains Mono'}
.fchip{padding:8px 15px;border-radius:999px;background:#fff;border:1px solid var(--bd);font-size:12.5px;white-space:nowrap}
.fchip.on{background:var(--lime);border-color:var(--lime);color:#1c2a06;font-weight:700}
.pgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.pcard{background:#fff;border:1px solid var(--bd);border-radius:15px;padding:16px;text-align:left}
.pcard .top{display:flex;align-items:center;gap:11px}
.pcard .top img{width:46px;height:46px;border-radius:50%;object-fit:cover}
.pcard .nm{font-size:14px;font-weight:700}
.pcard .rl{font-family:'JetBrains Mono';font-size:11px;color:var(--mu)}
.pcard .sn{font-size:12.5px;color:#444;margin:12px 0 14px;line-height:1.6}
.pcard .fl{display:block;text-align:center;background:var(--lime);color:#1c2a06;font-weight:700;font-size:12.5px;border-radius:10px;padding:9px}

/* pinned phone (scroll-scrub) */
.phonesec{display:flex;justify-content:center;width:100%;padding:8px 0 64px;position:relative;z-index:4}
.shotsec{padding:24px 0 0}
/* realistic iphone (real screenshot inside, gloss + front camera) */
.device{width:340px;margin:0 auto;position:relative;z-index:5;filter:drop-shadow(0 56px 78px rgba(0,0,0,.42))}
.dbody{position:relative;background:#1f1f22;border-radius:66px;padding:14px;box-shadow:inset 0 0 0 2px #56565e,inset 0 0 0 7px #0a0a0c}
.dbody::before{content:"";position:absolute;inset:0;border-radius:66px;z-index:5;pointer-events:none;background:linear-gradient(135deg,rgba(255,255,255,.24),rgba(255,255,255,0) 26%,rgba(255,255,255,0) 78%,rgba(255,255,255,.09))}
.dscreen{position:relative;border-radius:52px;overflow:hidden;background:#000;aspect-ratio:390/844}
.dscreen img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.dscreen::after{content:"";position:absolute;inset:0;z-index:2;pointer-events:none;background:linear-gradient(118deg,rgba(255,255,255,.16),rgba(255,255,255,0) 20%,rgba(255,255,255,0) 82%,rgba(255,255,255,.07))}
.island{position:absolute;top:25px;left:50%;transform:translateX(-50%);width:112px;height:33px;background:#000;border-radius:17px;z-index:4;display:flex;align-items:center;justify-content:flex-end;padding-right:10px}
.cam{width:12px;height:12px;border-radius:50%;background:radial-gradient(circle at 34% 32%,#43596d 0%,#16212b 48%,#050709 76%);box-shadow:inset 0 0 0 1px #2a2a2c,0 0 3px rgba(90,150,210,.55)}
.dbtn{position:absolute;background:#16161a;border-radius:3px;z-index:3}
.dl1{left:-3px;top:122px;width:3px;height:26px}
.dl2{left:-3px;top:164px;width:3px;height:52px}
.dl3{left:-3px;top:228px;width:3px;height:52px}
.dr1{right:-3px;top:198px;width:3px;height:86px}
/* google-like search screen */
.gsearch{padding:64px 24px 76px;text-align:center;background:#fff}
.gs-logo{font-family:'Space Grotesk';font-weight:700;font-size:clamp(40px,5vw,56px);letter-spacing:-1.5px}
.gs-logo b{color:var(--lime-d)}
.gs-sub{color:var(--mu);font-size:15px;margin-top:8px}
.gs-bar{max-width:500px;margin:28px auto 0;height:52px;border:1px solid var(--bd);border-radius:999px;display:flex;align-items:center;gap:12px;padding:0 24px;color:#9a9a92;box-shadow:0 8px 22px -12px rgba(0,0,0,.18);font-family:'JetBrains Mono';font-size:13.5px}
.gs-bar span{font-size:18px}
.gs-countries{display:flex;flex-wrap:wrap;justify-content:center;gap:11px;max-width:620px;margin:30px auto 0}
.gs-c{display:inline-flex;align-items:center;gap:9px;padding:10px 18px;border:1px solid var(--bd);border-radius:999px;font-size:14.5px;font-weight:500;background:#fff;transition:.16s}
.gs-c:hover{border-color:var(--lime);box-shadow:0 6px 16px -8px var(--glow);transform:translateY(-1px)}
.gs-c img{width:23px;height:16px;border-radius:3px;object-fit:cover}
.gs-c.more{color:var(--lime-d);font-weight:700}
/* native phone app screen (service detail) */
.appscreen{position:absolute;top:0;left:0;width:100%;background:#fff;color:#111;text-align:left;font-family:'Noto Sans JP',sans-serif;will-change:transform}
.as-top{display:flex;justify-content:space-between;align-items:center;padding:46px 18px 10px;font-family:'Space Grotesk';font-weight:700;font-size:18px}
.as-top b{color:var(--lime-d)}.as-menu{color:#bbb;font-size:16px}
.as-cover{height:152px;overflow:hidden}
.as-cover img{width:100%;height:100%;object-fit:cover;display:block}
.as-body{padding:16px}
.as-cats{display:flex;flex-wrap:wrap;gap:7px;font-size:10px;color:var(--lime-d);font-weight:700;margin-bottom:11px}
.as-title{font-size:18px;font-weight:700;line-height:1.4}
.as-price{font-size:21px;font-weight:700;color:var(--lime-d);margin-top:9px}
.as-price small{font-size:11px;color:#999;font-weight:500}
.as-cta{margin-top:13px;background:var(--lime);color:#1c2a06;text-align:center;font-weight:700;border-radius:13px;padding:12px;font-size:13.5px}
.as-sec{font-weight:700;font-size:13px;margin-top:22px;padding-top:18px;border-top:1px solid #eee}
.as-p{font-size:12px;color:#555;line-height:1.75;margin-top:9px}
.as-list{font-size:12px;color:#555;margin:11px 0 0 16px;line-height:2}
.as-prov{display:flex;gap:12px;align-items:center;margin-top:16px}
.as-prov img{width:48px;height:48px;border-radius:50%;object-fit:cover}
.as-pnm{font-weight:700;font-size:14px}.as-pnm span{font-size:10px;color:var(--lime-d);font-family:'JetBrains Mono';margin-left:6px}
.as-pmeta{font-size:11px;color:#999;margin-top:2px}
.as-pbio{font-size:11.5px;color:#666;line-height:1.75;margin-top:11px}
.as-others{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:13px}
.as-o img{width:100%;height:82px;object-fit:cover;border-radius:11px;display:block}
.as-ot{font-size:11px;font-weight:700;margin-top:7px;line-height:1.35}
.as-op{font-size:12px;font-weight:700;color:var(--lime-d);margin-top:3px}
@media(max-width:880px){
  .device{width:286px}
}

/* feature rows */
.feats{padding:150px 0 70px}
.feat{display:grid;grid-template-columns:1.15fr .85fr;gap:70px;align-items:center;padding:110px 0;border-top:1px solid var(--bd)}
.feat:first-child{border-top:none;padding-top:0}
.feat .num{font-family:'JetBrains Mono';font-size:14px;color:var(--lime-d);letter-spacing:.12em;margin-bottom:26px}
.feat h3{font-size:clamp(34px,4.6vw,56px);font-weight:700}
.feat p{color:var(--mu);font-size:19px;margin-top:24px;max-width:34ch;line-height:1.85}
.feat .art{display:flex;justify-content:center;align-items:center}
.feat .art svg{width:clamp(230px,27vw,310px);height:auto;overflow:visible}
.ln{stroke:var(--ink);stroke-width:1.7;fill:none;stroke-linecap:round;stroke-linejoin:round}
.lnf{stroke:var(--bd2);stroke-width:1.5;fill:none}
.inka{stroke:var(--lime-d);stroke-width:3;fill:none;stroke-linecap:round}
.floaty{animation:fl 6s ease-in-out infinite}
@keyframes fl{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
.dash{stroke-dasharray:5 6;animation:dash 1.7s linear infinite}
.dashf{stroke-dasharray:4 7;animation:dash 2.6s linear infinite}
@keyframes dash{to{stroke-dashoffset:-22}}
.pulse{animation:pl 2.4s ease-in-out infinite}
@keyframes pl{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.85)}}
.breathe{transform-origin:110px 110px;animation:br 7s ease-in-out infinite}
@keyframes br{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}

.lp section{padding:120px 0}
.shead{max-width:760px;margin:0 auto 64px;text-align:center}
.shead h2{font-size:clamp(34px,4.8vw,56px);font-weight:800;margin:16px 0 0}
.shead p{color:var(--mu);font-size:18px;margin-top:18px}

.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
.stat{background:var(--white);border:1px solid var(--bd);border-radius:20px;padding:36px 18px;text-align:center}
.stat .n{font-family:'Space Grotesk';font-size:48px;font-weight:700}
.stat .n em{color:var(--lime-d);font-style:normal}
.stat .l{font-family:'JetBrains Mono';font-size:12.5px;color:var(--mu);margin-top:8px}

.tmarq{overflow:hidden;margin-top:48px;-webkit-mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent);mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)}
.ttrack{display:flex;gap:12px;width:max-content;animation:scroll 40s linear infinite}
.tcity{padding:10px 20px;border:1px solid var(--bd);border-radius:999px;background:#fff;font-size:13.5px;white-space:nowrap;font-weight:500}

.marq{overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 9%,#000 91%,transparent);mask-image:linear-gradient(90deg,transparent,#000 9%,#000 91%,transparent)}
.track{display:flex;gap:16px;width:max-content;animation:scroll 46s linear infinite}
.track.rev{animation-direction:reverse;animation-duration:54s}
.marq:hover .track,.tmarq:hover .ttrack{animation-play-state:paused}
@keyframes scroll{to{transform:translateX(-50%)}}
.person{display:flex;align-items:center;gap:13px;background:var(--white);border:1px solid var(--bd);border-radius:18px;padding:13px 22px 13px 13px;white-space:nowrap}
.person img{width:48px;height:48px;border-radius:50%;object-fit:cover}
.person .nm{font-size:14.5px;font-weight:700;font-family:'Space Grotesk','Noto Sans JP'}
.person .ci{font-family:'JetBrains Mono';font-size:12px;color:var(--mu)}

/* flowing steps */
.flow{max-width:660px;margin:0 auto;position:relative;padding-left:8px}
.flow::before{content:"";position:absolute;left:34px;top:34px;bottom:34px;width:2px;background:var(--bd)}
.fstep{display:flex;gap:28px;align-items:center;position:relative;z-index:2}
.fnode{flex:0 0 54px;width:54px;height:54px;border-radius:16px;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono';font-weight:700;font-size:17px}
.fbody h3{font-size:23px;font-weight:700}
.fbody p{color:var(--mu);font-size:15px;margin-top:6px}
.fchevs{display:flex;flex-direction:column;align-items:center;width:54px;margin-left:0;padding:16px 0;gap:4px;position:relative;z-index:2}
.fchevs svg{width:24px;height:13px;animation:chev 1.5s ease-in-out infinite}
.fchevs svg:nth-child(2){animation-delay:.2s}.fchevs svg:nth-child(3){animation-delay:.4s}
@keyframes chev{0%,100%{opacity:.22;transform:translateY(0)}50%{opacity:1;transform:translateY(4px)}}

.ctaband{position:relative;text-align:center;background:var(--ink);color:#fff;border-radius:34px;padding:104px 28px;overflow:hidden}
.ctaband .g{position:absolute;width:620px;height:620px;border-radius:50%;background:var(--lime);filter:blur(130px);opacity:.34;top:-200px;left:50%;transform:translateX(-50%)}
.ctaband h2{position:relative;z-index:2;font-size:clamp(34px,5vw,60px);font-weight:800}
.ctaband h2 .lime{color:var(--lime)}
.ctaband p{position:relative;z-index:2;color:#bdbdb6;margin:18px 0 32px;font-size:17px}
.ctaband .cta{margin-top:0}
.ctaband .btn.ghost{border-color:rgba(255,255,255,.35);color:#fff}
.ctaband .btn.ghost:hover{border-color:var(--lime)}
.trust3{position:relative;z-index:2;display:flex;gap:24px;justify-content:center;flex-wrap:wrap;margin-top:30px;font-family:'JetBrains Mono';font-size:12.5px;color:#9a9a93}
.trust3 span{display:inline-flex;align-items:center;gap:8px}
.trust3 i{width:6px;height:6px;border-radius:50%;background:var(--lime);display:inline-block}

/* scroll reveal + section rhythm */
.reveal-init{opacity:0;transform:translateY(30px);transition:opacity .7s ease,transform .8s cubic-bezier(.2,.7,.2,1)}
.reveal-in{opacity:1;transform:none}
.lp #global{background:#FAFAF6}
.lp #people{background:#ECEDE3}
.lp #start{background:#F8F8F3}
/* one big growing stat */
.bigstat{text-align:center;padding:26px 0 0}
.bigstat-n{font-family:'Space Grotesk';font-weight:800;font-size:clamp(110px,20vw,240px);line-height:.92;letter-spacing:-.045em;color:var(--lime-d)}
.bigstat-l{font-family:'JetBrains Mono';font-size:clamp(13px,1.7vw,16px);letter-spacing:.08em;color:var(--mu);margin-top:10px}
/* final CTA (lime finale) */
.finalcta{background:var(--lime);color:#1b2a06;text-align:center;padding:clamp(90px,14vh,150px) 24px}
.finalcta h2{font-size:clamp(36px,5.4vw,68px);font-weight:800;letter-spacing:-.02em}
.finalcta p{font-size:clamp(15px,1.8vw,18px);color:#33480e;margin:18px auto 34px;max-width:32ch}
.finalcta .fbtn{display:inline-flex;align-items:center;gap:9px;background:#111;color:var(--lime);font-weight:700;font-size:16px;padding:17px 36px;border-radius:999px;font-family:'Space Grotesk','Noto Sans JP';transition:.18s}
.finalcta .fbtn:hover{transform:translateY(-2px);box-shadow:0 18px 38px -10px rgba(0,0,0,.45)}
.finalcta .ftrust{display:flex;gap:22px;justify-content:center;flex-wrap:wrap;margin-top:28px;font-family:'JetBrains Mono';font-size:12.5px;color:#33480e}
.finalcta .ftrust span{display:inline-flex;align-items:center;gap:7px}
.finalcta .ftrust i{width:6px;height:6px;border-radius:50%;background:#111;display:inline-block}
.lp footer{border-top:1px solid var(--bd);padding:64px 0 40px}
.fcols{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:32px;margin-bottom:42px}
.fcols h4{font-family:'JetBrains Mono';font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--mu);margin-bottom:16px}
.fcols a{display:block;font-size:14px;color:var(--ink2);margin-bottom:10px}
.fcols a:hover{color:var(--lime-d)}
.fbot{display:flex;justify-content:space-between;border-top:1px solid var(--bd);padding-top:24px;color:var(--mu);font-size:13px}

@media(max-width:880px){
  .nlinks,.nlogin{display:none}
  .frame{transform:none}
  .pgrid{grid-template-columns:1fr}
  .feat{grid-template-columns:1fr;gap:40px;padding:76px 0;text-align:center}
  .feat p{margin-left:auto;margin-right:auto}
  .feat .art{order:-1}
  .stats{grid-template-columns:1fr 1fr}
  .fcols{grid-template-columns:1fr 1fr}
}
`;

const BODY = `<div class="navwrap"><div class="wrap"><nav>
  <div class="logo">Lo<b>core</b></div>
  <div class="nlinks"><a href="#feats">サービス</a><a href="#global">対応エリア</a><a href="#people">いる人たち</a><a href="#start">はじめ方</a></div>
  <div class="nright"><a class="nlogin" href="/auth/login">ログイン</a><a class="btn pri" href="/auth/signup" style="padding:9px 18px;font-size:14px">無料ではじめる</a></div>
</nav></div></div>

<header class="hero">
  <div class="hero-bg"></div>
  <canvas id="net"></canvas>
  <div class="hero-content">
    <h1>世界中の街に、<br><span class="lime">知り合いを。</span></h1>
    <p class="lead">海外で頼れる人を見つけたい人も、現地で新しいつながりを探す人も。旅も暮らしも"現地に住む日本人"とつながれる、新しい在外邦人のネットワーク。</p>
    <div class="cta">
      <a class="btn pri" href="/auth/signup">無料ではじめる →</a>
      <a class="btn" href="/auth/login">ログイン</a>
    </div>
  </div>
</header>


<div class="feats" id="feats"><div class="wrap">

  <div class="feat">
    <div>
      <div class="num">01 — ブログ</div>
      <h3>現地の"今"を、<br>記事で残す・読む</h3>
      <p>住んでいる人だけが知る"暮らし目線"の情報を、雑誌のように。検索やAIには出てこない、その街の本当の歩き方。</p>
    </div>
    <div class="art">
      <svg viewBox="0 0 220 220" aria-hidden="true">
        <line class="lnf" x1="34" y1="118" x2="188" y2="118"/>
        <line class="lnf" x1="34" y1="146" x2="188" y2="146"/>
        <line class="lnf" x1="34" y1="174" x2="188" y2="174"/>
        <path class="inka dash" d="M30 150 C42 138 53 162 68 150 C83 138 94 162 109 150 C120 142 128 158 136 154"/>
        <g transform="translate(220 0) scale(-1 1) translate(-24 -22) rotate(-50 110 178)">
          <rect class="ln" x="100" y="40" width="20" height="102" rx="10" fill="#fff"/>
          <line class="ln" x1="100" y1="60" x2="120" y2="60"/>
          <rect class="ln" x="114" y="46" width="4" height="28" rx="2" fill="#fff"/>
          <path class="ln" d="M100 142 L104 154 L116 154 L120 142 Z" fill="#fff"/>
          <path class="ln" d="M104 154 L110 180 L116 154 Z" fill="#fff"/>
          <line class="ln" x1="110" y1="158" x2="110" y2="176"/>
          <circle class="ln" cx="110" cy="162" r="2.6" fill="#fff"/>
        </g>
      </svg>
    </div>
  </div>

  <div class="feat">
    <div>
      <div class="num">02 — サービス</div>
      <h3>その人に、<br>そのまま頼める</h3>
      <p>案内・通訳・買付・撮影・赴任前相談まで。気になる人へチャットで相談、そのまま依頼。本人確認とエスクローで、はじめてでも安心。</p>
    </div>
    <div class="art">
      <svg viewBox="0 0 220 220" aria-hidden="true">
        <rect class="ln" x="36" y="86" width="52" height="64" rx="16" fill="#fff"/>
        <circle class="ln" cx="62" cy="108" r="10" fill="#fff"/><path class="ln" d="M48 142 a14 12 0 0 1 28 0"/>
        <rect class="ln" x="132" y="86" width="52" height="64" rx="16" fill="#fff"/>
        <circle class="ln" cx="158" cy="108" r="10" fill="#fff"/><path class="ln" d="M144 142 a14 12 0 0 1 28 0"/>
        <line class="ln dash" x1="88" y1="118" x2="132" y2="118"/>
        <rect class="ln" x="94" y="56" width="32" height="22" rx="8" fill="#fff"/>
        <path class="ln" d="M104 78 l6 8 l4 -8" fill="#fff"/>
        <circle cx="103" cy="67" r="2.4" fill="#A8E01C"/><circle cx="110" cy="67" r="2.4" fill="#A8E01C"/><circle cx="117" cy="67" r="2.4" fill="#A8E01C"/>
        <circle class="pulse" cx="110" cy="118" r="8" fill="#A8E01C" stroke="#111" stroke-width="1.6"/>
      </svg>
    </div>
  </div>

  <div class="feat">
    <div>
      <div class="num">03 — コミュニティ</div>
      <h3>同じ街の仲間と、<br>助け合える</h3>
      <p>仕事・住まい・暮らしの情報を、同じ街の日本人と交換。渡航前の不安から、住んでからの困りごとまで。海外でもひとりじゃない。</p>
    </div>
    <div class="art">
      <svg viewBox="0 0 220 220" aria-hidden="true">
        <circle class="lnf" cx="110" cy="110" r="68"/>
        <g>
          <line class="lnf dashf" x1="110" y1="110" x2="178" y2="110"/><line class="lnf dashf" x1="110" y1="110" x2="144" y2="168.9"/><line class="lnf dashf" x1="110" y1="110" x2="76" y2="168.9"/><line class="lnf dashf" x1="110" y1="110" x2="42" y2="110"/><line class="lnf dashf" x1="110" y1="110" x2="76" y2="51.1"/><line class="lnf dashf" x1="110" y1="110" x2="144" y2="51.1"/>
        </g>
        <g class="breathe">
          <g><rect class="ln" x="163" y="95" width="30" height="30" rx="8" fill="#fff"/><circle class="ln" cx="178" cy="106" r="4" fill="#fff"/><path class="ln" d="M172 118 a6 5 0 0 1 12 0"/></g>
          <g><rect class="ln" x="129" y="153.9" width="30" height="30" rx="8" fill="#fff"/><circle class="ln" cx="144" cy="164.9" r="4" fill="#fff"/><path class="ln" d="M138 176.9 a6 5 0 0 1 12 0"/></g>
          <g><rect class="ln" x="61" y="153.9" width="30" height="30" rx="8" fill="#fff"/><circle class="ln" cx="76" cy="164.9" r="4" fill="#fff"/><path class="ln" d="M70 176.9 a6 5 0 0 1 12 0"/></g>
          <g><rect class="ln" x="27" y="95" width="30" height="30" rx="8" fill="#fff"/><circle class="ln" cx="42" cy="106" r="4" fill="#fff"/><path class="ln" d="M36 118 a6 5 0 0 1 12 0"/></g>
          <g><rect class="ln" x="61" y="36.1" width="30" height="30" rx="8" fill="#fff"/><circle class="ln" cx="76" cy="47.1" r="4" fill="#fff"/><path class="ln" d="M70 59.1 a6 5 0 0 1 12 0"/></g>
          <g><rect class="ln" x="129" y="36.1" width="30" height="30" rx="8" fill="#fff"/><circle class="ln" cx="144" cy="47.1" r="4" fill="#fff"/><path class="ln" d="M138 59.1 a6 5 0 0 1 12 0"/></g>
        </g>
        <rect x="94" y="94" width="32" height="32" rx="9" fill="#A8E01C" stroke="#111" stroke-width="1.7"/>
        <circle cx="110" cy="106" r="5" fill="#fff"/><path d="M102 122 a8 7 0 0 1 16 0" fill="none" stroke="#fff" stroke-width="1.8"/>
      </svg>
    </div>
  </div>

</div></div>

<section id="global"><div class="wrap">
  <div class="shead"><div class="klabel">[ Growing together ]</div><h2>みんなで育てる、<br>成長中のプラットフォーム</h2><p>住んでいる人が増えるほど、つながれる街も広がっていく。あなたの一歩が、次に来る誰かの道しるべに。</p></div>
  <div class="bigstat"><div class="bigstat-n" data-count="28">0</div><div class="bigstat-l">対応都市 ・ ただいま拡大中</div></div>
  <div class="tmarq"><div class="ttrack" id="tcities"></div></div>
</div></section>

<section id="people">
  <div class="wrap"><div class="shead"><div class="klabel">[ People ]</div><h2>いま、つながれる人たち</h2></div></div>
  <div class="marq" style="margin-bottom:16px"><div class="track" id="row1"></div></div>
  <div class="marq"><div class="track rev" id="row2"></div></div>
</section>

<section id="start"><div class="wrap">
  <div class="shead"><div class="klabel">[ How it works ]</div><h2>つながるまで、3ステップ。</h2></div>
  <div class="flow">
    <div class="fstep"><div class="fnode">01</div><div class="fbody"><h3>まず登録（無料）</h3><p>メールアドレスだけで、すぐに始められる。本人確認でより多くの機能を利用可能に。</p></div></div>
    <div class="fchevs"><svg viewBox="0 0 24 13"><path class="inka" d="M4 4 L12 10 L20 4"/></svg><svg viewBox="0 0 24 13"><path class="inka" d="M4 4 L12 10 L20 4"/></svg><svg viewBox="0 0 24 13"><path class="inka" d="M4 4 L12 10 L20 4"/></svg></div>
    <div class="fstep"><div class="fnode">02</div><div class="fbody"><h3>気になる人を探す</h3><p>ブログや活動を読んでみて、話してみたい、会ってみたい人をフォロー。</p></div></div>
    <div class="fchevs"><svg viewBox="0 0 24 13"><path class="inka" d="M4 4 L12 10 L20 4"/></svg><svg viewBox="0 0 24 13"><path class="inka" d="M4 4 L12 10 L20 4"/></svg><svg viewBox="0 0 24 13"><path class="inka" d="M4 4 L12 10 L20 4"/></svg></div>
    <div class="fstep"><div class="fnode">03</div><div class="fbody"><h3>話しかけてみる</h3><p>チャットで相談、案内をお願い。もちろん自分が発信者になるのもOK！</p></div></div>
  </div>
</div></section>

<section class="finalcta">
  <h2>さあ、はじめよう。</h2>
  <p>旅でも、暮らしでも、仕事でも。あなたの海外に、つながる人を。</p>
  <a class="fbtn" href="/auth/signup">無料ではじめる →</a>
  <div class="ftrust"><span><i></i>登録無料</span><span><i></i>約2分</span><span><i></i>本人確認で安心</span></div>
</section>

<footer><div class="wrap">
  <div class="fcols">
    <div><div class="logo" style="font-size:22px">Lo<b>core</b></div><p class="mono" style="font-size:12.5px;color:var(--mu);margin-top:14px">現地に住む人と、つながる。<br>Local × Lore × Core</p></div>
    <div><h4>サービス</h4><a href="/articles">ブログ</a><a href="/services">サービス</a><a href="/expat">コミュニティ</a></div>
    <div><h4>会社</h4><a href="#">About</a><a href="#">採用</a><a href="#">お問い合わせ</a></div>
    <div><h4>規約</h4><a href="#">利用規約</a><a href="#">プライバシー</a><a href="#">特商法</a></div>
  </div>
  <div class="fbot"><span>© Locore</span><span class="mono">made for 在外邦人</span></div>
</div></footer>`;

export function LandingClient() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const cities = ['パリ','リヨン','マルセイユ','ボルドー','ニース','リール','ストラスブール','トゥールーズ','ナント','ブリュッセル','レンヌ','モンペリエ'];
    const tc = root.querySelector('#tcities');
    if (tc) tc.innerHTML = cities.concat(cities).map((c) => `<span class="tcity">${c}</span>`).join('');
    const people: [string, string, string][] = [['田中 美咲','パリ','women/68'],['佐藤 健','リヨン','men/32'],['山本 彩','マルセイユ','women/44'],['鈴木 大輔','ボルドー','men/52'],['高橋 由美','ニース','women/12'],['伊藤 翔','リール','men/75'],['渡辺 結衣','ストラスブール','women/24'],['中村 拓海','ナント','men/19'],['小林 真央','トゥールーズ','women/56'],['加藤 怜','ブリュッセル','men/8'],['吉田 楓','パリ','women/33'],['山口 蓮','リヨン','men/41']];
    const card = (p: [string, string, string]) => `<div class="person"><img src="https://randomuser.me/api/portraits/${p[2]}.jpg" alt=""><div><div class="nm">${p[0]}</div><div class="ci">${p[1]} 在住</div></div></div>`;
    const r1 = root.querySelector('#row1');
    const r2 = root.querySelector('#row2');
    if (r1) { const aa = people.map(card).join(''); r1.innerHTML = aa + aa; }
    if (r2) { const bb = [...people].reverse().map(card).join(''); r2.innerHTML = bb + bb; }

    let raf = 0;
    let resizeHandler: (() => void) | null = null;
    const cv = root.querySelector('#net') as HTMLCanvasElement | null;
    const ctx = cv ? cv.getContext('2d') : null;
    if (cv && ctx) {
      let W = 0, H = 0, DPR = 1;
      const N = 160;
      const pts: { x: number; y: number; z: number }[] = [];
      const GA = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < N; i++) { const y = 1 - (i / (N - 1)) * 2; const r = Math.sqrt(Math.max(0, 1 - y * y)); const t = i * GA; pts.push({ x: Math.cos(t) * r, y, z: Math.sin(t) * r }); }
      const rs = () => { DPR = Math.min(2, window.devicePixelRatio || 1); W = cv.width = cv.clientWidth * DPR; H = cv.height = cv.clientHeight * DPR; };
      let ang = 0;
      const frame = () => {
        ctx.clearRect(0, 0, W, H); ang += 0.0015;
        const cx = W / 2, cy = H * 0.45, R = Math.min(W, H) * 0.42;
        const ca = Math.cos(ang), sa = Math.sin(ang), tl = 0.42, ctil = Math.cos(tl), stil = Math.sin(tl);
        const P = pts.map((p) => { const x = p.x * ca - p.z * sa, z = p.x * sa + p.z * ca, y = p.y; const y2 = y * ctil - z * stil, z2 = y * stil + z * ctil; return { sx: cx + x * R, sy: cy + y2 * R, z: z2 }; });
        const TH = R * 0.42; ctx.lineWidth = DPR;
        for (let i = 0; i < P.length; i++) { const a = P[i]; if (!a) continue; for (let j = i + 1; j < P.length; j++) { const b = P[j]; if (!b) continue; const dx = a.sx - b.sx, dy = a.sy - b.sy; const d = Math.sqrt(dx * dx + dy * dy); if (d < TH) { const dep = (a.z + b.z) * 0.5; const al = (1 - d / TH) * 0.32 * (0.3 + 0.7 * (dep + 1) / 2); ctx.strokeStyle = 'rgba(168,224,28,' + al.toFixed(3) + ')'; ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke(); } } }
        P.forEach((p) => { const dep = (p.z + 1) / 2; const s = (1.1 + dep * 2.1) * DPR; ctx.fillStyle = dep > 0.84 ? 'rgba(226,248,180,' + (0.55 + dep * 0.45).toFixed(3) + ')' : 'rgba(168,224,28,' + (0.22 + dep * 0.72).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(p.sx, p.sy - 1.5 * s, 0.92 * s, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(p.sx - 1.45 * s, p.sy + 2.0 * s); ctx.quadraticCurveTo(p.sx, p.sy - 0.5 * s, p.sx + 1.45 * s, p.sy + 2.0 * s); ctx.closePath(); ctx.fill(); });
        raf = requestAnimationFrame(frame);
      };
      rs(); frame();
      resizeHandler = rs;
      window.addEventListener('resize', rs);
    }

    const els = Array.from(root.querySelectorAll('.feat,.shead,.step,.bigstat')) as HTMLElement[];
    els.forEach((el) => el.classList.add('reveal-init'));
    const io = new IntersectionObserver((entries) => { entries.forEach((e) => { if (e.isIntersecting) { (e.target as HTMLElement).classList.add('reveal-in'); io.unobserve(e.target); } }); }, { root, threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach((el) => io.observe(el));

    // nav: transparent over the hero, darkens once scrolled
    const navwrap = root.querySelector('.navwrap');
    const onScroll = () => {
      if (navwrap) navwrap.classList.toggle('scrolled', root.scrollTop > 14);
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // count-up for the one big stat
    let countIo: IntersectionObserver | null = null;
    const bigN = root.querySelector('.bigstat-n') as HTMLElement | null;
    if (bigN) {
      const target = parseInt(bigN.getAttribute('data-count') || '0', 10);
      countIo = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const dur = 1500;
          let start = 0;
          const stepFn = (now: number) => {
            if (!start) start = now;
            const k = Math.min(1, (now - start) / dur);
            bigN.textContent = String(Math.round(target * (1 - Math.pow(1 - k, 3))));
            if (k < 1) requestAnimationFrame(stepFn);
          };
          requestAnimationFrame(stepFn);
          countIo?.unobserve(e.target);
        });
      }, { root, threshold: 0.5 });
      countIo.observe(bigN);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (resizeHandler) window.removeEventListener('resize', resizeHandler);
      root.removeEventListener('scroll', onScroll);
      io.disconnect();
      if (countIo) countIo.disconnect();
    };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="lp" ref={ref} dangerouslySetInnerHTML={{ __html: BODY }} />
    </>
  );
}
