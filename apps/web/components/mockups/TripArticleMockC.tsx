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
 * 旅程記事モックアップ案 C（エディトリアル / 読み物寄り）。
 *
 * 同じエディタ・ブロック（tripData.ts の STOPS）から、雑誌の読み物のように
 * 組んだ別案。大きなドロップキャップのリード、写真は要所のみ（全スポットには
 * 付けず濃淡でリズムを作る）、本文の流れの中にインラインのコールアウト（コツ）。
 * 旅程はタイムラインを主役にせず、本文に溶け込ませた控えめなインライン表現。
 *
 * - 1カラムの読み幅（max 720px）に集中。要所だけフルブリードの写真を差し込む。
 * - スコープ接頭辞は `.tc-`。ライム×クリームは A/B と統一。
 * - Route Map は末尾に小さくまとめる（読み物では地図は従、文章が主）。
 *
 * プレビュー: /mockup/trip-article-c
 *
 * 写真の濃淡: スポット 0/2/4/6 にのみ写真を差し込み（要所のみ）、
 * 1/3/5 はテキストのみにして読み物のリズムを作る。
 */

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700;800;900&display=swap');

.tc{--bg:#F4F4EF;--bg2:#ECECE4;--white:#fff;--ink:#111;--ink2:#2a2a28;--mu:#6E6E6E;--bd:#E7E7E0;--bd2:#D8D8CF;--lime:#A8E01C;--lime-d:#5E8B0E;--lime-l:#E3F7B8;--glow:rgba(168,224,28,.5);--mono:'JetBrains Mono',ui-monospace,monospace;--disp:'Space Grotesk','Noto Sans JP',sans-serif;--jp:'Noto Sans JP',system-ui,sans-serif;--ease:cubic-bezier(.22,1,.36,1);position:relative;background:var(--bg);color:var(--ink);font-family:var(--jp);line-height:1.95;-webkit-font-smoothing:antialiased;overflow-x:clip}
.tc *{box-sizing:border-box;margin:0;padding:0}
.tc a{color:inherit;text-decoration:none}
.tc img{display:block;max-width:100%}
.tc-read{max-width:720px;margin:0 auto;padding:0 24px}
.tc-kicker{font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--lime-d)}

/* ===== HERO（フルブリード・端正）===== */
.tc-hero{position:relative;width:100vw;left:50%;transform:translateX(-50%);min-height:92svh;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;color:#fff;background:#080a10}
.tc-hbg{position:absolute;inset:0;z-index:0;background-size:cover;background-position:center;animation:tcken 26s var(--ease) infinite alternate}
@keyframes tcken{from{transform:scale(1.05)}to{transform:scale(1.15)}}
.tc-hnet{position:absolute;inset:0;z-index:1;width:100%;height:100%}
.tc-hshade{position:absolute;inset:0;z-index:2;background:linear-gradient(180deg,rgba(8,10,16,.34),rgba(8,10,16,.12) 40%,rgba(8,10,16,.66) 80%,rgba(8,10,16,.95))}
.tc-hinner{position:relative;z-index:3;width:100%;max-width:820px;margin:0 auto;padding:0 24px 70px;text-align:center}
.tc-hkick{display:inline-flex;align-items:center;gap:11px;font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:var(--lime)}
.tc-hero h1{color:#fff;font-family:var(--disp);font-weight:700;letter-spacing:-.025em;line-height:1.1;font-size:clamp(34px,5.4vw,68px);margin-top:22px;text-shadow:0 2px 36px rgba(0,0,0,.5)}
.tc-hero h1 em{font-style:italic;color:var(--lime);font-weight:600}
.tc-hsub{margin:22px auto 0;max-width:540px;font-size:clamp(15px,1.7vw,17px);line-height:1.85;color:rgba(255,255,255,.84)}
.tc-hauthor{margin-top:28px;display:inline-flex;align-items:center;gap:12px}
.tc-hauthor img{width:42px;height:42px;border-radius:50%;object-fit:cover;border:1.5px solid rgba(255,255,255,.4)}
.tc-hauthor .nm{font-weight:700;color:#fff;font-size:14px;text-align:left}
.tc-hauthor .meta{font-family:var(--mono);font-size:11.5px;color:rgba(255,255,255,.7);margin-top:2px;text-align:left}

/* ===== 本文（読み物）===== */
.tc-article{padding:74px 0 30px}
.tc-article .tc-kicker{display:block;text-align:center;margin-bottom:22px}
/* ドロップキャップのリード */
.tc-dropcap{font-size:clamp(17px,2vw,20px);line-height:1.95;color:var(--ink);font-family:var(--jp)}
.tc-dropcap::first-letter{float:left;font-family:var(--disp);font-weight:700;font-size:clamp(72px,11vw,108px);line-height:.78;padding:6px 14px 0 0;color:var(--lime-d)}
.tc-p{font-size:16.5px;line-height:1.95;color:var(--ink2);margin-top:26px}
.tc-h2{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:clamp(24px,3vw,34px);letter-spacing:-.02em;line-height:1.25;margin-top:56px}
/* 時刻の小見出しラベル（インラインの旅程表現）*/
.tc-timelabel{display:inline-flex;align-items:center;gap:9px;font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.06em;color:var(--lime-d);margin-top:54px}
.tc-timelabel .t{background:var(--ink);color:var(--lime);padding:4px 11px;border-radius:7px;font-weight:700}
.tc-timelabel .nm{color:var(--mu)}
/* 要所の写真（読み幅をはみ出すフルブリード）*/
.tc-figure{position:relative;width:min(100vw,1100px);left:50%;transform:translateX(-50%);margin:48px auto;max-width:1100px}
.tc-figure .ph{aspect-ratio:21/9;overflow:hidden;border-radius:4px;background:var(--bg2)}
@media(max-width:720px){.tc-figure .ph{aspect-ratio:4/3;border-radius:0}}
.tc-figure img{width:100%;height:100%;object-fit:cover}
.tc-figcap{max-width:720px;margin:12px auto 0;padding:0 24px;font-family:var(--mono);font-size:11.5px;color:var(--mu);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.tc-figcap .pin{color:var(--lime-d);display:inline-flex;align-items:center;gap:5px}
.tc-figcap .pin svg{width:12px;height:12px}
.tc-figcap a{color:var(--lime-d);text-decoration:underline;text-underline-offset:2px}
/* インラインのコールアウト（コツ・注意）*/
.tc-call{margin:30px 0;padding:20px 22px 20px 20px;border-left:3px solid var(--lime);background:var(--lime-l);border-radius:0 14px 14px 0}
.tc-call .lab{font-family:var(--mono);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--lime-d);font-weight:700;display:flex;align-items:center;gap:8px}
.tc-call .lab svg{width:15px;height:15px}
.tc-call p{font-size:14.5px;line-height:1.85;color:var(--ink2);margin-top:9px}
/* インライン費用バッジ（本文末の小さな注記）*/
.tc-costline{margin-top:14px;font-family:var(--mono);font-size:12px;color:var(--mu);display:inline-flex;align-items:center;gap:8px}
.tc-costline b{color:var(--lime-d)}
/* 引用（pull quote）*/
.tc-quote{margin:54px 0;text-align:center}
.tc-quote p{font-family:var(--disp);font-weight:500;font-size:clamp(21px,2.7vw,30px);line-height:1.5;letter-spacing:-.012em;color:var(--ink)}
.tc-quote p em{font-style:normal;color:var(--lime-d);background:linear-gradient(transparent 62%,var(--lime-l) 62%)}
.tc-quote cite{display:block;margin-top:16px;font-family:var(--mono);font-size:12px;font-style:normal;color:var(--mu)}
.tc-hr{width:60px;height:2px;background:var(--lime);border:none;margin:54px auto}

/* ===== 末尾の小さな Route Map ===== */
.tc-mapsec{padding:50px 0 40px}
.tc-mapsec h3{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:20px;letter-spacing:-.015em;text-align:center}
.tc-mapsec .sub{text-align:center;color:var(--mu);font-family:var(--mono);font-size:12px;margin-top:8px}
.tc-mapframe{position:relative;margin-top:22px;border-radius:18px;overflow:hidden;border:1px solid var(--bd);height:360px;background:#dfe4e8}
.tc-mapframe iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block}
.tc-mapbadge{position:absolute;top:14px;left:14px;z-index:3;font-family:var(--mono);font-size:10.5px;font-weight:600;color:#0b0c09;background:var(--lime);padding:7px 13px;border-radius:999px;box-shadow:0 6px 16px -6px var(--glow)}

/* ===== 著者＋日付 ===== */
.tc-foot{padding:30px 0 90px}
.tc-byline{display:flex;gap:18px;align-items:center;border-top:1px solid var(--bd);border-bottom:1px solid var(--bd);padding:26px 0}
.tc-byline img{width:64px;height:64px;border-radius:50%;object-fit:cover;flex:none;border:2px solid var(--lime)}
.tc-byline .k{font-family:var(--mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--lime-d)}
.tc-byline h3{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:18px;margin-top:5px}
.tc-byline .role{font-family:var(--mono);font-size:11.5px;color:var(--mu);margin-top:3px}
.tc-byline .bio{font-size:12.5px;line-height:1.75;color:var(--ink2);margin-top:9px}
.tc-dateline{margin-top:24px;display:flex;flex-wrap:wrap;gap:8px 22px;justify-content:center;align-items:center;font-family:var(--mono);font-size:12px;color:var(--mu)}
.tc-dateline span{display:inline-flex;align-items:center;gap:8px}
.tc-dateline b{color:var(--ink2);font-weight:600}
.tc-dateline i{width:5px;height:5px;border-radius:50%;background:var(--lime);display:inline-block}

.tc-rev{opacity:0;transform:translateY(24px);transition:opacity .8s var(--ease),transform .9s var(--ease)}
.tc-rev.in{opacity:1;transform:none}

@media(max-width:720px){
  .tc-byline{flex-direction:column;text-align:center}
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

export function TripArticleMockC() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const canvas = root.querySelector('.tc-hnet') as HTMLCanvasElement | null;
    const host = root.querySelector('.tc-hero') as HTMLElement | null;
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
          const count = Math.max(26, Math.min(76, Math.round((W * H) / 16000)));
          nodes = Array.from({ length: count }, () => ({
            x: Math.random() * W,
            y: Math.random() * H,
            vx: (Math.random() - 0.5) * 0.24,
            vy: (Math.random() - 0.5) * 0.24,
            r: Math.random() * 1.6 + 1,
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
              if (d < 130) {
                ctx.strokeStyle = `rgba(168,224,28,${(1 - d / 130) * 0.38})`;
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

    const els = Array.from(root.querySelectorAll('.tc-rev')) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add('in');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -5% 0px' },
    );
    els.forEach((el) => io.observe(el));

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (onResize) window.removeEventListener('resize', onResize);
      io.disconnect();
    };
  }, []);

  return (
    <div className="tc" ref={ref}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ===== HERO ===== */}
      <header className="tc-hero">
        <div className="tc-hbg" style={{ backgroundImage: `url('${HERO_PHOTO}')` }} />
        <canvas className="tc-hnet" />
        <div className="tc-hshade" />
        <div className="tc-hinner">
          <span className="tc-hkick">ITINERARY · {TRIP.cityEn} · ESSAY</span>
          <h1>
            ある一日の、<em>パリ</em>。
            <br />
            朝のパンから夜の川まで
          </h1>
          <p className="tc-hsub">
            時刻表のように巡るのではなく、物語のように歩く。10年暮らした私の、
            いちばん好きな一日の過ごし方を、そのまま書きました。
          </p>
          <div className="tc-hauthor">
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

      {/* ===== 本文（読み物）===== */}
      <article className="tc-article">
        <div className="tc-read">
          <span className="tc-kicker tc-rev">— Essay</span>
          <p className="tc-dropcap tc-rev">
            朝のパリは、パン屋の匂いから始まる。まだシャッターの下りた通りを抜けて、
            10区の名店までの数分間。ここから先の一日を、観光ではなく「暮らしの延長」
            として歩いてみてほしい。これは、友人が訪ねてきたら私が必ず案内する、
            いちばん好きな順番の記録だ。
          </p>
        </div>

        {/* 朝（写真あり = 要所）*/}
        <div className="tc-read">
          <div className="tc-timelabel tc-rev">
            <span className="t">{STOPS[0]?.time}</span>
            <span className="nm">{STOPS[0]?.name}</span>
          </div>
          <h2 className="tc-h2 tc-rev">まずは、焼きたてのパンを</h2>
          <p className="tc-p tc-rev">{STOPS[0]?.body}</p>
        </div>
        {STOPS[0] ? (
          <figure className="tc-figure tc-rev">
            <div className="ph">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={STOPS[0].photo} alt="" loading="lazy" />
            </div>
            <figcaption className="tc-figcap">
              <span className="pin">
                <PinIcon />
                {STOPS[0].place.name}
              </span>
              ·
              <a href={placeMapUrl(STOPS[0].place)} target="_blank" rel="noopener noreferrer">
                地図で見る
              </a>
            </figcaption>
          </figure>
        ) : null}
        {STOPS[0]?.tip ? (
          <div className="tc-read">
            <div className="tc-call tc-rev">
              <div className="lab">
                <BulbIcon />
                ローカルのコツ
              </div>
              <p>{STOPS[0].tip}</p>
            </div>
          </div>
        ) : null}

        {/* 運河の散歩（テキストのみ＝濃淡）*/}
        <div className="tc-read">
          <div className="tc-timelabel tc-rev">
            <span className="t">{STOPS[1]?.time}</span>
            <span className="nm">{STOPS[1]?.name}</span>
          </div>
          <p className="tc-p tc-rev">{STOPS[1]?.body}</p>
        </div>

        {/* 引用 */}
        <div className="tc-read">
          <blockquote className="tc-quote tc-rev">
            <p>
              観光客の<em>半歩内側</em>を歩くだけで、
              <br />
              街はまるで違う顔を見せてくれる。
            </p>
            <cite>— {STOPS[2]?.name} にて</cite>
          </blockquote>
        </div>

        {/* 美術館（写真あり）*/}
        <div className="tc-read">
          <div className="tc-timelabel tc-rev">
            <span className="t">{STOPS[2]?.time}</span>
            <span className="nm">{STOPS[2]?.name}</span>
          </div>
          <h2 className="tc-h2 tc-rev">絵に包まれる、午前の時間</h2>
          <p className="tc-p tc-rev">{STOPS[2]?.body}</p>
        </div>
        {STOPS[2] ? (
          <figure className="tc-figure tc-rev">
            <div className="ph">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={STOPS[2].photo} alt="" loading="lazy" />
            </div>
            <figcaption className="tc-figcap">
              <span className="pin">
                <PinIcon />
                {STOPS[2].place.name}
              </span>
              ·
              <a href={placeMapUrl(STOPS[2].place)} target="_blank" rel="noopener noreferrer">
                地図で見る
              </a>
            </figcaption>
          </figure>
        ) : null}
        {STOPS[2]?.cost ? (
          <div className="tc-read">
            <span className="tc-costline tc-rev">
              入場 <b>{STOPS[2].cost}</b> · 木曜は21時まで開館
            </span>
          </div>
        ) : null}

        {/* 昼（テキストのみ）*/}
        <div className="tc-read">
          <div className="tc-timelabel tc-rev">
            <span className="t">{STOPS[3]?.time}</span>
            <span className="nm">{STOPS[3]?.name}</span>
          </div>
          <h2 className="tc-h2 tc-rev">昼は、迷わずビストロへ</h2>
          <p className="tc-p tc-rev">{STOPS[3]?.body}</p>
          {STOPS[3]?.tip ? (
            <div className="tc-call tc-rev">
              <div className="lab">
                <BulbIcon />
                予約のこと
              </div>
              <p>{STOPS[3].tip}</p>
            </div>
          ) : null}
        </div>

        <div className="tc-read">
          <hr className="tc-hr tc-rev" />
        </div>

        {/* マレ（写真あり）*/}
        <div className="tc-read">
          <div className="tc-timelabel tc-rev">
            <span className="t">{STOPS[4]?.time}</span>
            <span className="nm">{STOPS[4]?.name}</span>
          </div>
          <h2 className="tc-h2 tc-rev">午後は、迷うために歩く</h2>
          <p className="tc-p tc-rev">{STOPS[4]?.body}</p>
        </div>
        {STOPS[4] ? (
          <figure className="tc-figure tc-rev">
            <div className="ph">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={STOPS[4].photo} alt="" loading="lazy" />
            </div>
            <figcaption className="tc-figcap">
              <span className="pin">
                <PinIcon />
                {STOPS[4].place.name}
              </span>
              ·
              <a href={placeMapUrl(STOPS[4].place)} target="_blank" rel="noopener noreferrer">
                地図で見る
              </a>
            </figcaption>
          </figure>
        ) : null}

        {/* 夕方（テキストのみ）*/}
        <div className="tc-read">
          <div className="tc-timelabel tc-rev">
            <span className="t">{STOPS[5]?.time}</span>
            <span className="nm">{STOPS[5]?.name}</span>
          </div>
          <p className="tc-p tc-rev">{STOPS[5]?.body}</p>
        </div>

        {/* 夜（写真あり = フィナーレ）*/}
        <div className="tc-read">
          <div className="tc-timelabel tc-rev">
            <span className="t">{STOPS[6]?.time}</span>
            <span className="nm">{STOPS[6]?.name}</span>
          </div>
          <h2 className="tc-h2 tc-rev">一日の終わりは、川から</h2>
          <p className="tc-p tc-rev">{STOPS[6]?.body}</p>
        </div>
        {STOPS[6] ? (
          <figure className="tc-figure tc-rev">
            <div className="ph">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={STOPS[6].photo} alt="" loading="lazy" />
            </div>
            <figcaption className="tc-figcap">
              <span className="pin">
                <PinIcon />
                {STOPS[6].place.name}
              </span>
              ·
              <a href={placeMapUrl(STOPS[6].place)} target="_blank" rel="noopener noreferrer">
                地図で見る
              </a>
            </figcaption>
          </figure>
        ) : null}
        {STOPS[6]?.tip ? (
          <div className="tc-read">
            <div className="tc-call tc-rev">
              <div className="lab">
                <BulbIcon />
                ベストな一便
              </div>
              <p>{STOPS[6].tip}</p>
            </div>
          </div>
        ) : null}
      </article>

      {/* ===== 末尾の小さな Route Map ===== */}
      <section className="tc-mapsec">
        <div className="tc-read">
          <h3 className="tc-rev">この一日のルート</h3>
          <p className="sub tc-rev">
            全{TRIP.spots}スポット · 各「場所」フィールドから自動生成
          </p>
          <div className="tc-mapframe tc-rev">
            <span className="tc-mapbadge">Google マップ連携</span>
            {/* 全スポットを順に通る directions 埋め込み（APIキー不要）。
                本番では公式 Google Maps Embed API（要APIキー）に差し替え予定。 */}
            <iframe
              title="旅程ルートマップ"
              src={routeEmbedUrl(STOPS)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      {/* ===== 著者＋日付 ===== */}
      <section className="tc-foot">
        <div className="tc-read">
          <div className="tc-byline tc-rev">
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
          <div className="tc-dateline tc-rev">
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
