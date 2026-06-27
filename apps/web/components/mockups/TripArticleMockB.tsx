'use client';

import { useEffect, useRef } from 'react';
import {
  AUTHOR,
  AUTHOR_AVATAR,
  HERO_PHOTO,
  placeMapUrl,
  routeEmbedUrl,
  STOPS,
  TRIP,
} from './tripData';

/**
 * 旅程記事モックアップ案 B（マップ先行）。
 *
 * 同じエディタ・ブロック（tripData.ts の STOPS / 構造化スポットブロック）から、
 * A 案とは出し分けたレイアウト。Route Map を主役として大きく見せ、その下に
 * スポットを番号付きカードのグリッドで並べる「地図 → 一覧」型の構成。
 *
 * - ヒーローはフルブリード基調、ライム×クリームのトーンは A と統一。
 * - スコープ接頭辞は `.tb-`（A の `.tj-` と衝突しないよう分離）。
 * - 場所フィールドから Route Map（埋め込み iframe）と各カードの「地図で見る」を生成。
 *
 * プレビュー: /mockup/trip-article-b
 */

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700;800;900&display=swap');

.tb{--bg:#F4F4EF;--bg2:#ECECE4;--white:#fff;--ink:#111;--ink2:#2a2a28;--mu:#6E6E6E;--bd:#E7E7E0;--bd2:#D8D8CF;--lime:#A8E01C;--lime-d:#5E8B0E;--lime-l:#E3F7B8;--glow:rgba(168,224,28,.5);--mono:'JetBrains Mono',ui-monospace,monospace;--disp:'Space Grotesk','Noto Sans JP',sans-serif;--jp:'Noto Sans JP',system-ui,sans-serif;--ease:cubic-bezier(.22,1,.36,1);position:relative;background:var(--bg);color:var(--ink);font-family:var(--jp);line-height:1.75;-webkit-font-smoothing:antialiased;overflow-x:clip}
.tb *{box-sizing:border-box;margin:0;padding:0}
.tb a{color:inherit;text-decoration:none}
.tb img{display:block;max-width:100%}
.tb-wide{max-width:1180px;margin:0 auto;padding:0 24px}
.tb-kicker{font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--lime-d)}

/* ===== HERO（フルブリード・短め）===== */
.tb-hero{position:relative;width:100vw;left:50%;transform:translateX(-50%);min-height:78svh;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;color:#fff;background:#080a10}
.tb-hbg{position:absolute;inset:0;z-index:0;background-size:cover;background-position:center;animation:tbken 24s var(--ease) infinite alternate}
@keyframes tbken{from{transform:scale(1.05)}to{transform:scale(1.14)}}
.tb-hnet{position:absolute;inset:0;z-index:1;width:100%;height:100%}
.tb-hshade{position:absolute;inset:0;z-index:2;background:linear-gradient(180deg,rgba(8,10,16,.4),rgba(8,10,16,.2) 36%,rgba(8,10,16,.7) 78%,rgba(8,10,16,.95))}
.tb-hinner{position:relative;z-index:3;width:100%;max-width:1180px;margin:0 auto;padding:0 32px 56px}
.tb-hkick{display:inline-flex;align-items:center;gap:11px;font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--lime)}
.tb-hkick::before{content:"";width:30px;height:1.5px;background:var(--lime)}
.tb-hero h1{color:#fff;font-family:var(--disp);font-weight:800;letter-spacing:-.03em;line-height:1.05;font-size:clamp(34px,5.6vw,72px);margin-top:20px;max-width:18ch;text-shadow:0 2px 36px rgba(0,0,0,.5)}
.tb-hero h1 em{font-style:normal;color:var(--lime)}
.tb-hsub{margin-top:20px;max-width:560px;font-size:clamp(15px,1.7vw,17px);line-height:1.85;color:rgba(255,255,255,.84)}
.tb-hauthor{margin-top:26px;display:flex;align-items:center;gap:13px}
.tb-hauthor img{width:44px;height:44px;border-radius:50%;object-fit:cover;border:1.5px solid rgba(255,255,255,.4)}
.tb-hauthor .nm{font-weight:700;color:#fff;font-size:14px}
.tb-hauthor .meta{font-family:var(--mono);font-size:11.5px;color:rgba(255,255,255,.7);margin-top:2px}

/* ===== マップ先行（主役）===== */
.tb-mapsec{position:relative;padding:0}
.tb-mapwrap{position:relative;width:100vw;left:50%;transform:translateX(-50%);background:var(--ink)}
.tb-maphead{max-width:1180px;margin:0 auto;padding:46px 32px 24px;color:#fff}
.tb-maphead .tb-kicker{color:var(--lime)}
.tb-maphead h2{color:#fff;font-family:var(--disp);font-weight:700;font-size:clamp(24px,3.4vw,40px);letter-spacing:-.02em;margin-top:12px}
.tb-maphead p{color:rgba(255,255,255,.66);font-size:14px;margin-top:12px;max-width:60ch}
.tb-mapbig{position:relative;width:100%;height:clamp(360px,56vh,620px);background:#dfe4e8}
.tb-mapbig iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block}
.tb-mapbadge{position:absolute;top:18px;left:18px;z-index:3;font-family:var(--mono);font-size:11px;font-weight:600;color:#0b0c09;background:var(--lime);padding:8px 15px;border-radius:999px;box-shadow:0 8px 20px -6px var(--glow)}
/* 地図下に重ねる立ち寄りチップ（横スクロール）*/
.tb-chips{position:relative;z-index:3;max-width:1180px;margin:0 auto;padding:18px 32px 40px;display:flex;gap:10px;overflow-x:auto;scrollbar-width:none}
.tb-chips::-webkit-scrollbar{display:none}
.tb-chip{flex:none;display:inline-flex;align-items:center;gap:9px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(8px);color:#fff;padding:9px 15px;border-radius:999px;font-family:var(--mono);font-size:12px;transition:background .2s}
.tb-chip:hover{background:rgba(168,224,28,.2);border-color:var(--lime)}
.tb-chip .n{width:20px;height:20px;border-radius:50%;background:var(--lime);color:#0b0c09;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:11px}
.tb-chip .tm{color:rgba(255,255,255,.6)}

/* ===== スポット番号付きカードのグリッド ===== */
.tb-stops{padding:74px 0 40px}
.tb-stopshead{text-align:center;margin-bottom:46px}
.tb-stopshead h2{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:clamp(26px,3.6vw,44px);letter-spacing:-.02em;margin-top:12px}
.tb-stopshead p{color:var(--mu);font-size:15px;margin-top:12px}
.tb-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:22px}
.tb-card{position:relative;display:flex;flex-direction:column;background:var(--white);border:1px solid var(--bd);border-radius:20px;overflow:hidden;box-shadow:0 14px 36px -22px rgba(17,17,17,.2);transition:transform .4s var(--ease),box-shadow .4s,border-color .4s}
.tb-card:hover{transform:translateY(-4px);border-color:rgba(168,224,28,.5);box-shadow:0 24px 50px -24px rgba(17,17,17,.24)}
.tb-cphoto{position:relative;aspect-ratio:16/10;overflow:hidden;background:var(--bg2)}
.tb-cphoto img{width:100%;height:100%;object-fit:cover;transition:transform 1.1s var(--ease)}
.tb-card:hover .tb-cphoto img{transform:scale(1.05)}
.tb-cphoto::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(6,8,4,.6),transparent 50%)}
.tb-cnum{position:absolute;top:14px;left:14px;z-index:2;width:38px;height:38px;border-radius:50%;background:var(--lime);color:#0b0c09;font-family:var(--disp);font-weight:700;font-size:17px;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px -4px var(--glow)}
.tb-ctag{position:absolute;top:18px;right:14px;z-index:2;font-family:var(--mono);font-size:10.5px;font-weight:600;color:#fff;background:rgba(10,12,16,.55);border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(6px);padding:5px 11px;border-radius:999px}
.tb-ctime{position:absolute;bottom:12px;left:15px;z-index:2;font-family:var(--mono);font-size:12px;color:#fff;display:flex;align-items:center;gap:7px;text-shadow:0 1px 6px rgba(0,0,0,.6)}
.tb-ctime .dot{width:5px;height:5px;border-radius:50%;background:var(--lime)}
.tb-cbody{padding:20px 22px 22px;display:flex;flex-direction:column;flex:1}
.tb-cbody h3{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:20px;letter-spacing:-.015em;line-height:1.25}
.tb-cplace{margin-top:7px;font-family:var(--mono);font-size:11.5px;color:var(--mu);display:flex;align-items:center;gap:6px}
.tb-cplace svg{width:12px;height:12px;color:var(--lime-d);flex:none}
.tb-ctxt{margin-top:12px;font-size:14px;line-height:1.9;color:var(--ink2)}
.tb-cfoot{margin-top:auto;padding-top:16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.tb-cost{display:inline-flex;align-items:center;gap:7px;font-family:var(--mono);font-size:12px;font-weight:600;color:var(--lime-d);background:var(--lime-l);border:1px solid rgba(168,224,28,.45);padding:6px 13px;border-radius:999px}
.tb-maplink{display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:11.5px;font-weight:600;color:var(--ink);border:1px solid var(--bd2);padding:7px 13px;border-radius:999px;transition:border-color .2s,color .2s}
.tb-maplink:hover{border-color:var(--lime);color:var(--lime-d)}
.tb-maplink svg{width:13px;height:13px}
.tb-tip{margin-top:12px;display:flex;gap:10px;align-items:flex-start;padding:11px 14px;border-radius:12px;background:var(--bg);border:1px dashed var(--bd2);font-size:12.5px;line-height:1.7;color:var(--ink2)}
.tb-tip svg{flex:none;color:var(--lime-d);margin-top:1px;width:15px;height:15px}
.tb-tip b{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--lime-d);display:block;margin-bottom:2px}

/* ===== 著者＋日付（末尾）===== */
.tb-foot{padding:30px 0 90px}
.tb-authcard{display:flex;gap:24px;align-items:center;background:var(--white);border:1px solid var(--bd);border-radius:22px;padding:28px 30px;box-shadow:0 16px 40px -26px rgba(17,17,17,.2)}
.tb-authcard img{width:84px;height:84px;border-radius:50%;object-fit:cover;flex:none;border:2px solid var(--lime)}
.tb-authcard .k{font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--lime-d)}
.tb-authcard h3{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:21px;margin-top:6px}
.tb-authcard .role{font-family:var(--mono);font-size:12px;color:var(--mu);margin-top:4px}
.tb-authcard .bio{font-size:13px;line-height:1.8;color:var(--ink2);margin-top:11px;max-width:54ch}
.tb-dateline{margin-top:26px;display:flex;flex-wrap:wrap;gap:8px 22px;justify-content:center;align-items:center;font-family:var(--mono);font-size:12px;color:var(--mu);border-top:1px solid var(--bd);padding-top:22px}
.tb-dateline span{display:inline-flex;align-items:center;gap:8px}
.tb-dateline b{color:var(--ink2);font-weight:600}
.tb-dateline i{width:5px;height:5px;border-radius:50%;background:var(--lime);display:inline-block}

.tb-rev{opacity:0;transform:translateY(26px);transition:opacity .8s var(--ease),transform .9s var(--ease)}
.tb-rev.in{opacity:1;transform:none}

@media(max-width:820px){
  .tb-grid{grid-template-columns:1fr}
  .tb-authcard{flex-direction:column;text-align:center;padding:28px 22px}
  .tb-authcard .bio{margin-left:auto;margin-right:auto}
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

export function TripArticleMockB() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const canvas = root.querySelector('.tb-hnet') as HTMLCanvasElement | null;
    const host = root.querySelector('.tb-hero') as HTMLElement | null;
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
          const count = Math.max(28, Math.min(80, Math.round((W * H) / 15000)));
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

    const els = Array.from(root.querySelectorAll('.tb-rev')) as HTMLElement[];
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
    <div className="tb" ref={ref}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ===== HERO ===== */}
      <header className="tb-hero">
        <div className="tb-hbg" style={{ backgroundImage: `url('${HERO_PHOTO}')` }} />
        <canvas className="tb-hnet" />
        <div className="tb-hshade" />
        <div className="tb-hinner">
          <span className="tb-hkick">ITINERARY · {TRIP.cityEn} · MAP-FIRST</span>
          <h1>
            地図でたどる、<em>パリ完璧の1日</em>。
          </h1>
          <p className="tb-hsub">
            まずはルート全体を地図で。動きをつかんでから、{TRIP.spots}
            つのスポットを順に読む。歩く人のための旅程プラン。
          </p>
          <div className="tb-hauthor">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AUTHOR_AVATAR} alt="" />
            <div>
              <div className="nm">{AUTHOR.name}</div>
              <div className="meta">
                {AUTHOR.city} 在住 {AUTHOR.years}年
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ===== マップ先行（主役）===== */}
      <section className="tb-mapsec">
        <div className="tb-mapwrap">
          <div className="tb-maphead tb-rev">
            <span className="tb-kicker">— The route</span>
            <h2>1日のルートを地図で</h2>
            <p>
              各スポットの「場所」フィールドから自動生成。全{TRIP.spots}
              スポットを順に結んだルートです。下のチップから各地点へ。
            </p>
          </div>
          <div className="tb-mapbig">
            <span className="tb-mapbadge">Google マップ連携</span>
            {/* 全スポットを順に通る directions 埋め込み（APIキー不要）。
                本番では公式 Google Maps Embed API（要APIキー）に差し替え予定。 */}
            <iframe
              title="旅程ルートマップ"
              src={routeEmbedUrl(STOPS)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="tb-chips">
            {STOPS.map((s, i) => (
              <a
                key={i}
                className="tb-chip"
                href={placeMapUrl(s.place)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="n">{i + 1}</span>
                {s.name}
                <span className="tm">{s.time}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ===== スポット番号付きカードのグリッド ===== */}
      <section className="tb-stops">
        <div className="tb-wide">
          <div className="tb-stopshead tb-rev">
            <span className="tb-kicker">— The spots</span>
            <h2>立ち寄りスポット</h2>
            <p>地図の番号と対応。上から順に巡るのがおすすめです。</p>
          </div>
          <div className="tb-grid">
            {STOPS.map((s, i) => (
              <article key={i} className="tb-card tb-rev">
                <div className="tb-cphoto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.photo} alt="" loading="lazy" />
                  <span className="tb-cnum">{i + 1}</span>
                  <span className="tb-ctag">{s.cat}</span>
                  <span className="tb-ctime">
                    <span className="dot" />
                    {s.time}
                    {s.end ? ` – ${s.end}` : ''}
                  </span>
                </div>
                <div className="tb-cbody">
                  <h3>{s.name}</h3>
                  <div className="tb-cplace">
                    <PinIcon />
                    {s.place.name}
                  </div>
                  <p className="tb-ctxt">{s.body}</p>
                  {s.tip ? (
                    <div className="tb-tip">
                      <BulbIcon />
                      <div>
                        <b>ローカルのコツ</b>
                        {s.tip}
                      </div>
                    </div>
                  ) : null}
                  <div className="tb-cfoot">
                    {s.cost ? (
                      <span className="tb-cost">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 7H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6M12 3v2M12 19v2" />
                        </svg>
                        {s.cost}
                      </span>
                    ) : (
                      <span />
                    )}
                    <a
                      className="tb-maplink"
                      href={placeMapUrl(s.place)}
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

      {/* ===== 著者＋日付（末尾）===== */}
      <section className="tb-foot">
        <div className="tb-wide">
          <div className="tb-authcard tb-rev">
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
          <div className="tb-dateline tb-rev">
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
