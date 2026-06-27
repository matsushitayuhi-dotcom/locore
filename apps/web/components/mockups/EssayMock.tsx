'use client';

import { useEffect, useRef } from 'react';
import {
  AUTHOR,
  AUTHOR_AVATAR,
  ESSAY,
  ESSAY_HERO,
  ESSAY_PHOTOS,
  ESSAY_RELATED,
  ESSAY_VIDEO_ID,
} from './tripData';

/**
 * 記事タイプ: 読み物（standard / essay）。
 *
 * 仕様 docs/editor-spec.md §6-3:
 *   Hero → 本文（paragraph / image / video / quote / callout / divider の自由な
 *   連なり） → 著者カード → 関連記事 → 日付フッター
 *   ※ place ブロック・地図は一切持たない。
 *
 * エディトリアル基調（ドロップキャップのリード、要所の写真、YouTube 動画埋め込み、
 * インラインの引用・コールアウト・区切り）。ヒーローはフルブリード・ライム×クリーム・
 * network canvas を全タイプで統一。スコープ接頭辞 `.es-`。見出しは color 明示。
 *
 * プレビュー: /mockup/essay
 */

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700;800;900&display=swap');

.es{--bg:#F4F4EF;--bg2:#ECECE4;--white:#fff;--ink:#111;--ink2:#2a2a28;--mu:#6E6E6E;--bd:#E7E7E0;--bd2:#D8D8CF;--lime:#A8E01C;--lime-d:#5E8B0E;--lime-l:#E3F7B8;--glow:rgba(168,224,28,.5);--mono:'JetBrains Mono',ui-monospace,monospace;--disp:'Space Grotesk','Noto Sans JP',sans-serif;--jp:'Noto Sans JP',system-ui,sans-serif;--ease:cubic-bezier(.22,1,.36,1);position:relative;background:var(--bg);color:var(--ink);font-family:var(--jp);line-height:1.95;-webkit-font-smoothing:antialiased;overflow-x:clip}
.es *{box-sizing:border-box;margin:0;padding:0}
.es a{color:inherit;text-decoration:none}
.es img{display:block;max-width:100%}
.es-read{max-width:720px;margin:0 auto;padding:0 24px}
.es-wide{max-width:1180px;margin:0 auto;padding:0 24px}
.es-kicker{font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--lime-d)}

/* ===== HERO（フルブリード）===== */
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

/* ===== 本文（読み物）===== */
.es-article{padding:74px 0 30px}
.es-article .es-kicker{display:block;text-align:center;margin-bottom:22px}
.es-dropcap{font-size:clamp(17px,2vw,20px);line-height:1.95;color:var(--ink);font-family:var(--jp)}
.es-dropcap::first-letter{float:left;font-family:var(--disp);font-weight:700;font-size:clamp(72px,11vw,108px);line-height:.78;padding:6px 14px 0 0;color:var(--lime-d)}
.es-p{font-size:16.5px;line-height:1.95;color:var(--ink2);margin-top:26px}
.es-h2{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:clamp(24px,3vw,34px);letter-spacing:-.02em;line-height:1.25;margin-top:56px}
/* image ブロック（記事より少し広い・中央寄せ）。
   ※ left:50%+translateX と margin:auto の二重センタリングはずれの原因になるため使わない。
   max-width＋margin-inline:auto＋左右paddingで、ビューポートを超えず中央に揃える。 */
.es-figure{position:relative;width:100%;max-width:1000px;margin:48px auto;padding:0 24px}
.es-figure .ph{aspect-ratio:21/9;overflow:hidden;border-radius:14px;background:var(--bg2)}
@media(max-width:720px){.es-figure{padding:0}.es-figure .ph{aspect-ratio:4/3;border-radius:0}}
.es-figure img{width:100%;height:100%;object-fit:cover;display:block}
.es-figcap{max-width:720px;margin:12px auto 0;padding:0 24px;font-family:var(--mono);font-size:11.5px;color:var(--mu)}
/* video ブロック（YouTube 埋め込み・16:9 レスポンシブ枠・中央寄せ）*/
.es-video{position:relative;width:100%;max-width:1000px;margin:48px auto;padding:0 24px}
@media(max-width:720px){.es-video{padding:0 24px}}
.es-vframe{position:relative;aspect-ratio:16/9;width:100%;border-radius:14px;overflow:hidden;background:#000;box-shadow:0 24px 60px -30px rgba(0,0,0,.5)}
.es-vframe iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block}
.es-vbadge{position:absolute;top:12px;left:12px;z-index:3;font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.06em;color:#0b0c09;background:var(--lime);padding:6px 11px;border-radius:999px}
.es-vcap{max-width:720px;margin:12px auto 0;padding:0 24px;font-family:var(--mono);font-size:11.5px;color:var(--mu)}
/* インラインのコールアウト（コツ・注意）*/
.es-call{margin:30px 0;padding:20px 22px 20px 20px;border-left:3px solid var(--lime);background:var(--lime-l);border-radius:0 14px 14px 0}
.es-call .lab{font-family:var(--mono);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--lime-d);font-weight:700;display:flex;align-items:center;gap:8px}
.es-call .lab svg{width:15px;height:15px}
.es-call p{font-size:14.5px;line-height:1.85;color:var(--ink2);margin-top:9px}
/* 引用（pull quote）*/
.es-quote{margin:54px 0;text-align:center}
.es-quote p{font-family:var(--disp);font-weight:500;font-size:clamp(21px,2.7vw,30px);line-height:1.5;letter-spacing:-.012em;color:var(--ink)}
.es-quote p em{font-style:normal;color:var(--lime-d);background:linear-gradient(transparent 62%,var(--lime-l) 62%)}
.es-quote cite{display:block;margin-top:16px;font-family:var(--mono);font-size:12px;font-style:normal;color:var(--mu)}
.es-hr{width:60px;height:2px;background:var(--lime);border:none;margin:54px auto}

/* ===== 著者＋日付 ===== */
.es-foot{padding:40px 0 30px}
.es-byline{display:flex;gap:18px;align-items:center;border-top:1px solid var(--bd);border-bottom:1px solid var(--bd);padding:26px 0}
.es-byline img{width:64px;height:64px;border-radius:50%;object-fit:cover;flex:none;border:2px solid var(--lime)}
.es-byline .k{font-family:var(--mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--lime-d)}
.es-byline h3{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:18px;margin-top:5px}
.es-byline .role{font-family:var(--mono);font-size:11.5px;color:var(--mu);margin-top:3px}
.es-byline .bio{font-size:12.5px;line-height:1.75;color:var(--ink2);margin-top:9px}

/* ===== 関連 ===== */
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

/* ===== 日付フッター ===== */
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

function BulbIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 21h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
    </svg>
  );
}

export function EssayMock() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const canvas = root.querySelector('.es-hnet') as HTMLCanvasElement | null;
    const host = root.querySelector('.es-hero') as HTMLElement | null;
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

    const els = Array.from(root.querySelectorAll('.es-rev')) as HTMLElement[];
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
    <div className="es" ref={ref}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ===== HERO ===== */}
      <header className="es-hero">
        <div className="es-hbg" style={{ backgroundImage: `url('${ESSAY_HERO}')` }} />
        <canvas className="es-hnet" />
        <div className="es-hshade" />
        <div className="es-hinner">
          <span className="es-hkick">{ESSAY.titleKick}</span>
          <h1>
            パリの<em>朝</em>は、
            <br />
            いつも少しだけ遅れてくる
          </h1>
          <p className="es-hsub">
            10年暮らしても、この街には慣れない。慣れないままでいられることが、
            たぶん私がここにいる理由なのだと思う。
          </p>
          <div className="es-hauthor">
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
        <div className="es-scroll">
          読む
          <span className="ln" />
        </div>
      </header>

      {/* ===== 本文（paragraph / image / video / quote / callout / divider）===== */}
      <article className="es-article">
        {/* editorsNote 的なキッカー＋ドロップキャップのリード */}
        <div className="es-read">
          <span className="es-kicker es-rev">— Essay</span>
          <p className="es-dropcap es-rev">
            朝、カーテンを開けると、向かいの建物の窓がまだ眠っている。パリの一日は、
            東京よりずっとゆっくり始まる。カフェのシャッターが上がるのは8時前、
            けれど本当に街が動き出すのは、二杯目のコーヒーを淹れるころだ。私はその、
            まだ何も始まっていない時間がいちばん好きだ。
          </p>
        </div>

        {/* paragraph */}
        <div className="es-read">
          <p className="es-p es-rev">
            引っ越してきた最初の冬、私はこの「遅さ」に苛立っていた。約束の時間に人が来ない。
            店は気まぐれに閉まる。役所の手続きは、同じ書類を三度求められた。効率という
            ものさしを当てるたびに、この街は落第点だった。
          </p>
        </div>

        {/* image ブロック（要所）*/}
        <figure className="es-figure es-rev">
          <div className="ph">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ESSAY_PHOTOS.cafe} alt="" loading="lazy" />
          </div>
          <figcaption className="es-figcap">
            朝のカフェ。二杯目を頼むころ、ようやく街が目を覚ます。
          </figcaption>
        </figure>

        {/* heading + paragraph */}
        <div className="es-read">
          <h2 className="es-h2 es-rev">「効率」を手放すまで</h2>
          <p className="es-p es-rev">
            けれど、ある日気づいた。遅れてくる友人は、遅れた分だけ申し訳なさそうに、
            そして嬉しそうに、長く話していく。気まぐれに閉まる店は、開いている日の
            常連客をちゃんと覚えている。効率を手放すと、その隙間に流れ込んでくるものが
            あった。
          </p>
        </div>

        {/* callout（コツ）*/}
        <div className="es-read">
          <div className="es-call es-rev">
            <div className="lab">
              <BulbIcon />
              暮らしのコツ
            </div>
            <p>
              フランスで焦らないコツは、予定を「点」ではなく「幅」で持つこと。
              13時の約束は「13時から13時半のどこか」。それだけで、ずいぶん楽になる。
            </p>
          </div>
        </div>

        {/* video ブロック（YouTube 埋め込み）*/}
        <div className="es-video es-rev">
          <div className="es-vframe">
            <span className="es-vbadge">VIDEO</span>
            {/* video ブロック。provider=youtube。プライバシー強化ドメインで埋め込み。 */}
            <iframe
              title="パリの街並み"
              src={`https://www.youtube-nocookie.com/embed/${ESSAY_VIDEO_ID}`}
              loading="lazy"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <div className="es-vcap">
            音のない動画でも伝わる、夕方の光のこと。
          </div>
        </div>

        {/* quote（pull quote）*/}
        <div className="es-read">
          <blockquote className="es-quote es-rev">
            <p>
              慣れないままでいられることが、
              <br />
              たぶん、<em>ここにいる理由</em>。
            </p>
            <cite>— 移住して3年目の手帳から</cite>
          </blockquote>
        </div>

        {/* divider */}
        <div className="es-read">
          <hr className="es-hr es-rev" />
        </div>

        {/* paragraph + image */}
        <div className="es-read">
          <p className="es-p es-rev">
            いまでも、私はこの街のことをよく知らない。地図には載っている通りでも、
            曲がった先に何があるかは、歩いてみるまでわからない。10年かけて、
            その「わからなさ」を楽しめるようになった。それだけが、たしかな成長だ。
          </p>
        </div>
        <figure className="es-figure es-rev">
          <div className="ph">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ESSAY_PHOTOS.street} alt="" loading="lazy" />
          </div>
          <figcaption className="es-figcap">
            曲がった先に何があるかは、歩いてみるまでわからない。
          </figcaption>
        </figure>
        <div className="es-read">
          <p className="es-p es-rev">
            今日もカフェのシャッターが上がるのを待ちながら、二杯目のコーヒーを淹れる。
            まだ何も始まっていない、私のいちばん好きな時間が、また巡ってくる。
          </p>
        </div>
      </article>

      {/* ===== 著者カード ===== */}
      <section className="es-foot">
        <div className="es-read">
          <div className="es-byline es-rev">
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
      <section className="es-related">
        <div className="es-wide">
          <div className="head es-rev">
            <span className="es-kicker">— You might also like</span>
            <h2 style={{ marginTop: 10 }}>ほかの読み物</h2>
          </div>
          <div className="es-rgrid">
            {ESSAY_RELATED.map((r, i) => (
              <a key={i} className="es-rcard es-rev" href="#">
                <div className="es-rcov">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.img} alt="" loading="lazy" />
                </div>
                <div className="es-rb">
                  <div className="c">{r.cat}</div>
                  <h3>{r.t}</h3>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 日付フッター ===== */}
      <section className="es-dates">
        <div className="es-wide">
          <div className="es-dateline es-rev">
            <span>
              公開 <b>{ESSAY.publishedAt}</b>
            </span>
            <i />
            <span>
              最終更新 <b>{ESSAY.updatedAt}</b>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
