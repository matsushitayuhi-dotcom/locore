'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

/**
 * /community のトップ。「訪れる国を選ぶ」ミニマルな入口。
 *
 * - 背景に回転する点描の地球（canvas / フィボナッチ球）。白背景に映えるオリーブ〜ライム。
 * - 中央に国セレクタ1つ（初期は未選択 → ドロップダウンで50音順から選ぶ）。
 * - いま入れる国はフランスのみ（選ぶと「フランスのコミュニティへ」CTAが出て /france へ）。
 *   他国は「近日」。国が増えたら COUNTRIES に active:true ＋ href を足す。
 *
 * 国旗イラストは使わない方針（テキストのみ）。グローバルヘッダー (SiteHeader) の下に敷く。
 */

type Country = { name: string; active?: boolean; href?: string };

// 50音順。active な国だけ選択可能。
const COUNTRIES: Country[] = [
  { name: 'アメリカ' },
  { name: 'イギリス' },
  { name: 'イタリア' },
  { name: 'オーストラリア' },
  { name: 'カナダ' },
  { name: '韓国' },
  { name: 'シンガポール' },
  { name: 'タイ' },
  { name: 'ドイツ' },
  { name: 'フランス', active: true, href: '/france' },
  { name: 'ベトナム' },
  { name: 'マレーシア' },
];

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700;900&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

.ccp{--bg:#F4F4EF;--bg2:#FBFBF8;--card:#fff;--lime:#A8E01C;--lime-d:#5E8B0E;--ink:#14140f;--mu:#7a7a72;--bd:#E6E6DE;--disp:'Space Grotesk','Zen Kaku Gothic New',sans-serif;--jp:'Zen Kaku Gothic New',sans-serif;--mono:'JetBrains Mono',monospace;position:relative;min-height:calc(100vh - 56px);display:flex;align-items:center;justify-content:center;overflow:hidden;background:radial-gradient(120% 95% at 50% 10%, #ffffff 0%, var(--bg2) 40%, var(--bg) 100%);font-family:var(--jp);color:var(--ink);-webkit-font-smoothing:antialiased;font-feature-settings:"palt" 1}
.ccp *{box-sizing:border-box}
.ccp-globe{position:absolute;inset:0;width:100%;height:100%;z-index:0;display:block;opacity:.85}
.ccp-fade{position:absolute;inset:0;z-index:1;pointer-events:none;background:radial-gradient(56% 50% at 50% 50%, rgba(244,244,239,0) 34%, rgba(247,247,243,.72) 100%)}
.ccp-stage{position:relative;z-index:3;width:100%;text-align:center;padding:48px 24px}
.ccp-kick{font-family:var(--mono);font-size:12px;letter-spacing:.30em;text-transform:uppercase;color:var(--lime-d)}
.ccp-kick::before{content:"";display:inline-block;width:26px;height:1.5px;background:var(--lime-d);vertical-align:middle;margin-right:11px}
.ccp h1{font-family:var(--jp);font-weight:900;color:var(--ink);font-size:clamp(30px,5.6vw,56px);line-height:1.16;letter-spacing:.01em;margin:18px 0 0}
.ccp h1 em{font-style:normal;color:var(--lime-d)}
.ccp-lead{color:var(--mu);font-size:clamp(13px,1.55vw,15.5px);line-height:1.85;margin-top:15px;font-weight:500}
.ccp-picker{position:relative;margin:36px auto 0;width:min(380px,90vw)}
.ccp-pbtn{width:100%;display:flex;align-items:center;gap:12px;background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:16px 18px;cursor:pointer;font-family:var(--jp);box-shadow:0 18px 46px -30px rgba(20,20,15,.4);transition:.16s}
.ccp-pbtn:hover{border-color:var(--lime);box-shadow:0 22px 50px -28px rgba(94,139,14,.4)}
.ccp-pbtn .pin{flex:none;color:var(--lime-d);display:flex}
.ccp-pbtn .val{flex:1;text-align:left;font-weight:700;font-size:18px;color:var(--ink);letter-spacing:.02em}
.ccp-pbtn .val.ph{color:#b6b6ad;font-weight:500}
.ccp-pbtn .chev{flex:none;color:var(--mu);transition:.2s}
.ccp-picker.open .ccp-pbtn .chev{transform:rotate(180deg)}
.ccp-picker.open .ccp-pbtn{border-color:var(--lime)}
.ccp-menu{position:absolute;left:0;right:0;top:calc(100% + 10px);background:var(--card);border:1px solid var(--bd);border-radius:16px;box-shadow:0 34px 80px -30px rgba(20,20,15,.5);overflow:hidden;z-index:6;opacity:0;transform:translateY(-8px);pointer-events:none;transition:.16s;text-align:left}
.ccp-picker.open .ccp-menu{opacity:1;transform:none;pointer-events:auto}
.ccp-mscroll{max-height:300px;overflow-y:auto}
.ccp-mhead{font-family:var(--mono);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#b0b0a6;padding:13px 18px 6px;position:sticky;top:0;background:var(--card)}
.ccp-mrow{display:flex;align-items:center;width:100%;padding:12px 18px;cursor:pointer;transition:.1s;font-weight:500;font-size:15px;color:var(--ink);background:none;border:0;font-family:var(--jp);text-align:left}
.ccp-mrow:hover{background:#f6f9ee}
.ccp-mrow .tag{margin-left:auto;font-family:var(--mono);font-size:11px;color:var(--lime-d)}
.ccp-mrow.soon{color:#b6b6ad;cursor:default}
.ccp-mrow.soon:hover{background:none}
.ccp-mrow.soon .tag{color:#c8c8bf}
.ccp-cta{margin-top:28px;display:inline-flex;align-items:center;gap:10px;background:var(--ink);color:var(--lime);font-family:var(--jp);font-weight:700;font-size:15px;border-radius:999px;padding:14px 28px;text-decoration:none;box-shadow:0 16px 34px -16px rgba(20,20,15,.55);opacity:0;transform:translateY(8px);pointer-events:none;transition:.28s cubic-bezier(.2,.7,.2,1)}
.ccp-cta.show{opacity:1;transform:none;pointer-events:auto}
.ccp-cta:hover{transform:translateY(-2px)}
.ccp-cta svg{width:18px;height:18px}
@keyframes ccprise{to{opacity:1;transform:none}}
.ccp-rise{opacity:0;transform:translateY(14px);animation:ccprise .9s cubic-bezier(.2,.7,.2,1) forwards}
.ccp-d1{animation-delay:.04s}.ccp-d2{animation-delay:.15s}.ccp-d3{animation-delay:.3s}
`;

export function CommunityCountryPicker() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Country | null>(null);

  // 回転する点描の地球
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let DPR = Math.min(2, window.devicePixelRatio || 1);
    let W = 0;
    let H = 0;
    const N = 200;
    const pts: { x: number; y: number; z: number }[] = [];
    const GA = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const t = i * GA;
      pts.push({ x: Math.cos(t) * r, y, z: Math.sin(t) * r });
    }
    const rs = () => {
      DPR = Math.min(2, window.devicePixelRatio || 1);
      W = cv.width = Math.floor(cv.clientWidth * DPR);
      H = cv.height = Math.floor(cv.clientHeight * DPR);
    };
    let ang = 0;
    let raf = 0;
    const frame = () => {
      ctx.clearRect(0, 0, W, H);
      ang += 0.0015;
      const cx = W / 2;
      const cy = H / 2;
      const R = Math.min(W, H) * 0.44; // 大きめの地球
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      const tl = 0.42;
      const ct = Math.cos(tl);
      const st = Math.sin(tl);
      const P = pts.map((p) => {
        const x = p.x * ca - p.z * sa;
        const z = p.x * sa + p.z * ca;
        const yy = p.y;
        const y2 = yy * ct - z * st;
        const z2 = yy * st + z * ct;
        return { sx: cx + x * R, sy: cy + y2 * R, z: z2 };
      });
      const TH = R * 0.4;
      ctx.lineWidth = DPR;
      for (let a = 0; a < P.length; a++) {
        const A = P[a]!;
        for (let b = a + 1; b < P.length; b++) {
          const B = P[b]!;
          const dx = A.sx - B.sx;
          const dy = A.sy - B.sy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < TH) {
            const dep = (A.z + B.z) * 0.5;
            const al = (1 - d / TH) * 0.2 * (0.35 + 0.65 * (dep + 1) / 2);
            ctx.strokeStyle = `rgba(94,139,14,${al.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(A.sx, A.sy);
            ctx.lineTo(B.sx, B.sy);
            ctx.stroke();
          }
        }
      }
      P.forEach((p) => {
        const dep = (p.z + 1) / 2;
        const s = (1.0 + dep * 1.8) * DPR;
        ctx.fillStyle =
          dep > 0.8
            ? `rgba(94,139,14,${(0.42 + dep * 0.45).toFixed(3)})`
            : `rgba(120,170,30,${(0.18 + dep * 0.55).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 0.95 * s, 0, 7);
        ctx.fill();
      });
      raf = requestAnimationFrame(frame);
    };
    rs();
    frame();
    window.addEventListener('resize', rs);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', rs);
    };
  }, []);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <section className="ccp">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <canvas className="ccp-globe" ref={canvasRef} aria-hidden />
      <div className="ccp-fade" aria-hidden />

      <div className="ccp-stage">
        <span className="ccp-kick ccp-rise ccp-d1">Community</span>
        <h1 className="ccp-rise ccp-d2">
          訪れる国を<em>選ぶ。</em>
        </h1>
        <p className="ccp-lead ccp-rise ccp-d2">
          現地に暮らす日本人のコミュニティに、飛び込みましょう！
        </p>

        <div
          className={'ccp-picker ccp-rise ccp-d3' + (open ? ' open' : '')}
          ref={pickerRef}
        >
          <button
            type="button"
            className="ccp-pbtn"
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="pin" aria-hidden>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
                <circle cx="12" cy="10" r="2.6" />
              </svg>
            </span>
            <span className={'val' + (selected ? '' : ' ph')}>
              {selected ? selected.name : '国を選ぶ'}
            </span>
            <svg className="chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          <div className="ccp-menu" role="listbox">
            <div className="ccp-mscroll">
              <div className="ccp-mhead">国を選ぶ（50音順）</div>
              {COUNTRIES.map((c) =>
                c.active ? (
                  <button
                    key={c.name}
                    type="button"
                    className="ccp-mrow"
                    onClick={() => {
                      setSelected(c);
                      setOpen(false);
                    }}
                  >
                    {c.name}
                    <span className="tag">選ぶ →</span>
                  </button>
                ) : (
                  <div key={c.name} className="ccp-mrow soon" aria-disabled>
                    {c.name}
                    <span className="tag">近日</span>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>

        <Link
          href={selected?.href ?? '#'}
          className={'ccp-cta' + (selected ? ' show' : '')}
          aria-hidden={!selected}
          tabIndex={selected ? 0 : -1}
          onClick={() => {
            // 選んだ国を記憶。次に「コミュニティ」を押すとこの国のページへ直行する。
            if (selected?.href) {
              const slug = selected.href.replace(/^\//, '');
              document.cookie = `locore_community_country=${encodeURIComponent(
                slug,
              )}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
            }
          }}
        >
          {selected ? `${selected.name}のコミュニティへ` : 'コミュニティへ'}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="13 6 19 12 13 18" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
