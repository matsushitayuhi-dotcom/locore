'use client';

import { useEffect, useRef } from 'react';
import {
  AUTHOR,
  AUTHOR_AVATAR,
  GUIDE,
  GUIDE_HERO,
  GUIDE_RELATED,
  PLACES,
  pinsEmbedUrl,
  placeMapUrl,
} from './tripData';

/**
 * 記事タイプ: 場所紹介（standard / place-guide）。
 *
 * 仕様 docs/editor-spec.md §6-2 のレイアウト:
 *   Hero → 導入(paragraph) → 場所紹介（リッチな place の連なり・順不同） →
 *   ピン集約マップ → 縦並び場所リスト（各 place に Google Map リンク） →
 *   著者カード → 関連記事 → 日付フッター
 *
 * place ブロックは旅程系と同一だが order/time/transfer を持たない（＝順不同）。
 * 地図は place.location から自動生成（ここでは「順路ではないピン集約」マップ）。
 *
 * - ヒーローはフルブリード・ライム×クリーム・network canvas を全タイプで統一。
 * - スコープ接頭辞 `.pg-`。見出しは color を明示（グローバル h1-h6 上書き対策）。
 * - 横スクロール防止に root へ overflow-x:clip。
 *
 * プレビュー: /mockup/place-guide
 */

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700;800;900&display=swap');

.pg{--bg:#F4F4EF;--bg2:#ECECE4;--white:#fff;--ink:#111;--ink2:#2a2a28;--mu:#6E6E6E;--bd:#E7E7E0;--bd2:#D8D8CF;--lime:#A8E01C;--lime-d:#5E8B0E;--lime-l:#E3F7B8;--glow:rgba(168,224,28,.5);--mono:'JetBrains Mono',ui-monospace,monospace;--disp:'Space Grotesk','Noto Sans JP',sans-serif;--jp:'Noto Sans JP',system-ui,sans-serif;--ease:cubic-bezier(.22,1,.36,1);position:relative;background:var(--bg);color:var(--ink);font-family:var(--jp);line-height:1.8;-webkit-font-smoothing:antialiased;overflow-x:clip}
.pg *{box-sizing:border-box;margin:0;padding:0}
.pg a{color:inherit;text-decoration:none}
.pg img{display:block;max-width:100%}
.pg-wrap{max-width:760px;margin:0 auto;padding:0 24px}
.pg-wide{max-width:1180px;margin:0 auto;padding:0 24px}
.pg-kicker{font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--lime-d)}

/* ===== HERO（フルブリード）===== */
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

/* ===== 導入(paragraph) ===== */
.pg-intro{padding:84px 0 20px}
.pg-intro .pg-kicker{display:block;text-align:center;margin-bottom:24px}
.pg-intro p{font-family:var(--disp);font-weight:500;font-size:clamp(20px,2.6vw,28px);line-height:1.62;letter-spacing:-.012em;color:var(--ink);text-align:center}
.pg-intro p em{font-style:normal;color:var(--lime-d);background:linear-gradient(transparent 62%,var(--lime-l) 62%);padding:0 .08em}

/* ===== 場所紹介（リッチ place の連なり・順不同）===== */
.pg-places{padding:54px 0 30px}
.pg-placeshead{text-align:center;margin-bottom:48px}
.pg-placeshead h2{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:clamp(26px,3.6vw,44px);letter-spacing:-.02em;margin-top:12px}
.pg-placeshead p{color:var(--mu);font-size:15px;margin-top:12px}
.pg-prich{display:flex;flex-direction:column;gap:46px}
/* 交互レイアウト（写真左右）で読み物的なリズム */
.pg-prow{display:grid;grid-template-columns:1fr 1fr;gap:38px;align-items:center}
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
.pg-pextras{margin-top:16px;display:flex;flex-wrap:wrap;gap:9px;align-items:center}
.pg-cost{display:inline-flex;align-items:center;gap:7px;font-family:var(--mono);font-size:12px;font-weight:600;color:var(--lime-d);background:var(--lime-l);border:1px solid rgba(168,224,28,.45);padding:6px 13px;border-radius:999px}
.pg-maplink{display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:11.5px;font-weight:600;color:var(--ink);border:1px solid var(--bd2);padding:7px 13px;border-radius:999px;transition:border-color .2s,color .2s}
.pg-maplink:hover{border-color:var(--lime);color:var(--lime-d)}
.pg-maplink svg{width:13px;height:13px}
.pg-ptip{margin-top:14px;display:flex;gap:10px;align-items:flex-start;padding:11px 14px;border-radius:12px;background:var(--bg);border:1px dashed var(--bd2);font-size:12.5px;line-height:1.7;color:var(--ink2)}
.pg-ptip svg{flex:none;color:var(--lime-d);margin-top:1px;width:15px;height:15px}
.pg-ptip b{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--lime-d);display:block;margin-bottom:2px}

/* ===== ピン集約マップ（順不同）===== */
.pg-mapsec{position:relative;width:100vw;left:50%;transform:translateX(-50%);background:var(--ink);padding:78px 0;margin-top:46px;overflow:hidden}
.pg-mapsec .glow{position:absolute;width:540px;height:540px;border-radius:50%;background:var(--lime);filter:blur(150px);opacity:.16;top:-220px;left:-60px}
.pg-mapsec .pg-wide{position:relative;z-index:2}
.pg-maphead{text-align:center;margin-bottom:30px}
.pg-maphead .pg-kicker{color:var(--lime)}
.pg-maphead h2{color:#fff;font-family:var(--disp);font-weight:700;font-size:clamp(24px,3.2vw,40px);letter-spacing:-.02em;margin-top:12px}
.pg-maphead p{color:rgba(255,255,255,.66);font-size:14px;margin-top:12px}
.pg-mapframe{position:relative;border-radius:22px;overflow:hidden;border:1px solid rgba(255,255,255,.14);height:clamp(360px,52vh,540px);background:#dfe4e8;box-shadow:0 24px 60px -30px rgba(0,0,0,.6)}
.pg-mapframe iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block}
.pg-mapbadge{position:absolute;top:16px;left:16px;z-index:3;font-family:var(--mono);font-size:10.5px;font-weight:600;color:#0b0c09;background:var(--lime);padding:7px 13px;border-radius:999px;box-shadow:0 8px 20px -6px var(--glow)}

/* ===== 縦並び場所リスト ===== */
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

/* ===== 著者カード ===== */
.pg-authsec{padding:40px 0 56px}
.pg-authcard{display:flex;gap:26px;align-items:center;background:var(--white);border:1px solid var(--bd);border-radius:24px;padding:32px 34px;box-shadow:0 18px 44px -26px rgba(17,17,17,.22)}
.pg-authcard img{width:92px;height:92px;border-radius:50%;object-fit:cover;flex:none;border:2px solid var(--lime)}
.pg-authcard .k{font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--lime-d)}
.pg-authcard h3{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:23px;margin-top:7px}
.pg-authcard .role{font-family:var(--mono);font-size:12.5px;color:var(--mu);margin-top:4px}
.pg-authcard .bio{font-size:13.5px;line-height:1.85;color:var(--ink2);margin-top:12px;max-width:52ch}

/* ===== 関連 ===== */
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

/* ===== 日付フッター ===== */
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

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function BulbIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 21h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
    </svg>
  );
}

export function PlaceGuideMock() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const canvas = root.querySelector('.pg-hnet') as HTMLCanvasElement | null;
    const host = root.querySelector('.pg-hero') as HTMLElement | null;
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
          const count = Math.max(28, Math.min(82, Math.round((W * H) / 15000)));
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

    const els = Array.from(root.querySelectorAll('.pg-rev')) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add('in');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    els.forEach((el) => io.observe(el));

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (onResize) window.removeEventListener('resize', onResize);
      io.disconnect();
    };
  }, []);

  return (
    <div className="pg" ref={ref}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ===== HERO ===== */}
      <header className="pg-hero">
        <div className="pg-hbg" style={{ backgroundImage: `url('${GUIDE_HERO}')` }} />
        <canvas className="pg-hnet" />
        <div className="pg-hshade" />
        <div className="pg-hinner">
          <span className="pg-hkick">PLACE GUIDE · {GUIDE.cityEn}</span>
          <h1>
            在住者がこっそり通う、<em>パリの6か所</em>
          </h1>
          <p className="pg-hsub">
            順番は気にしないでいい。気が向いた一つから訪ねてほしい、
            観光地図のすこし外側にある、私の好きな場所たち。
          </p>
          <div className="pg-hauthor">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AUTHOR_AVATAR} alt="" />
            <div>
              <div className="nm">{AUTHOR.name}</div>
              <div className="meta">
                {AUTHOR.city} 在住 {AUTHOR.years}年
              </div>
            </div>
          </div>
          <div className="pg-hmeta">
            <span className="pg-pill">
              紹介 <b>{GUIDE.count}か所</b>
            </span>
            <span className="pg-pill">
              エリア <b>パリ全域</b>
            </span>
            <span className="pg-pill">
              順番 <b>なし（順不同）</b>
            </span>
          </div>
        </div>
        <div className="pg-scroll">
          読む
          <span className="ln" />
        </div>
      </header>

      {/* ===== 導入(paragraph) ===== */}
      <section className="pg-intro pg-rev">
        <div className="pg-wrap">
          <span className="pg-kicker">— Intro</span>
          <p>
            旅程のように<em>順番に巡る</em>必要はない。ここに挙げるのは、
            その日の気分でひとつ選べばいい、私の<em>お気に入りの場所</em>。
            地図のピンを頼りに、自由に組み合わせて歩いてほしい。
          </p>
        </div>
      </section>

      {/* ===== 場所紹介（リッチ place の連なり・順不同）===== */}
      <section className="pg-places">
        <div className="pg-wide">
          <div className="pg-placeshead pg-rev">
            <span className="pg-kicker">— The places</span>
            <h2>場所を、ひとつずつ</h2>
            <p>各場所は独立。気になったところから。全{GUIDE.count}か所。</p>
          </div>
          <div className="pg-prich">
            {PLACES.map((p, i) => (
              <article key={i} className="pg-prow pg-rev">
                <div className="pg-pphoto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.photo} alt="" loading="lazy" />
                  <span className="pg-pcat">{p.cat}</span>
                </div>
                <div className="pg-pbody">
                  <div className="pg-pname">
                    <span className="pg-pidx">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3>{p.name}</h3>
                  </div>
                  <div className="pg-pplace">
                    <PinIcon />
                    {p.place.name}
                  </div>
                  <p className="pg-ptxt">{p.body}</p>
                  {p.tip ? (
                    <div className="pg-ptip">
                      <BulbIcon />
                      <div>
                        <b>ローカルのコツ</b>
                        {p.tip}
                      </div>
                    </div>
                  ) : null}
                  <div className="pg-pextras">
                    {p.cost ? (
                      <span className="pg-cost">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 7H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6M12 3v2M12 19v2" />
                        </svg>
                        {p.cost}
                      </span>
                    ) : null}
                    <a
                      className="pg-maplink"
                      href={placeMapUrl(p.place)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <PinIcon />
                      地図で見る
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ピン集約マップ（順不同・順路ではない）===== */}
      <section className="pg-mapsec">
        <div className="glow" />
        <div className="pg-wide">
          <div className="pg-maphead pg-rev">
            <span className="pg-kicker">— Map</span>
            <h2>全{GUIDE.count}か所のピン</h2>
            <p>
              各場所の「場所」フィールドから自動生成。順路ではなく、ピンとして
              散らした集約マップです。
            </p>
          </div>
          <div className="pg-mapframe pg-rev">
            <span className="pg-mapbadge">Google マップ連携</span>
            {/* 順不同のピン集約マップ（APIキー不要）。本番は公式 Embed API
                （maps/embed/v1/search）で全ピン個別表示に差し替え予定。 */}
            <iframe
              title="場所紹介マップ"
              src={pinsEmbedUrl(PLACES)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      {/* ===== 縦並び場所リスト（各 place に Google Map リンク）===== */}
      <section className="pg-listsec">
        <div className="pg-wrap">
          <div className="pg-listhead pg-rev">
            <span className="pg-kicker">— Index</span>
            <h2>場所いちらん</h2>
          </div>
          <div className="pg-list">
            {PLACES.map((p, i) => (
              <div key={i} className="pg-lrow pg-rev">
                <div className="pg-lthumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.photo} alt="" loading="lazy" />
                </div>
                <div className="pg-lbody">
                  <div className="pg-lcat">{p.cat}</div>
                  <h3>{p.name}</h3>
                  <div className="pg-lplace">{p.place.name}</div>
                </div>
                <a
                  className="pg-lgo"
                  href={placeMapUrl(p.place)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <PinIcon />
                  地図
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 著者カード ===== */}
      <section className="pg-authsec">
        <div className="pg-wide">
          <div className="pg-authcard pg-rev">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AUTHOR_AVATAR} alt="" />
            <div>
              <div className="k">この記事を書いた人</div>
              <h3>{AUTHOR.name}</h3>
              <div className="role">
                {AUTHOR.city}在住 {AUTHOR.years}年 · {AUTHOR.role}
              </div>
              <p className="bio">{AUTHOR.bio}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 関連 ===== */}
      <section className="pg-related">
        <div className="pg-wide">
          <div className="head pg-rev">
            <span className="pg-kicker">— You might also like</span>
            <h2 style={{ marginTop: 10 }}>ほかの場所ガイド</h2>
          </div>
          <div className="pg-rgrid">
            {GUIDE_RELATED.map((r, i) => (
              <a key={i} className="pg-rcard pg-rev" href="#">
                <div className="pg-rcov">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.img} alt="" loading="lazy" />
                </div>
                <div className="pg-rb">
                  <div className="c">{r.cat}</div>
                  <h3>{r.t}</h3>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 日付フッター ===== */}
      <section className="pg-dates">
        <div className="pg-wide">
          <div className="pg-dateline pg-rev">
            <span>
              公開 <b>{GUIDE.publishedAt}</b>
            </span>
            <i />
            <span>
              最終更新 <b>{GUIDE.updatedAt}</b>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
