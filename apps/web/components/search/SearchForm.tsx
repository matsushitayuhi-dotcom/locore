'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

/**
 * /search の入口フォーム。/community のトップ (CommunityCountryPicker) と
 * 同じミニマルな世界観に統一した。
 *
 *   - mode="hero"    … 検索前。回転する点描の地球を背景に、中央に
 *                       キーワード入力（＋国セレクト）と検索 CTA だけを置く。
 *   - mode="compact" … 検索後（結果あり）。スリムな検索バーを結果の上に置く。
 *
 * GET フォーム (`method="get" action="/search"`) なので JS 無効でも submit でき、
 * 結果は Server Component 側 (page.tsx) が searchParams から描画する。
 * 旧 UI の「詳細設定（検索対象チェック）」は廃止。areas を送らないことで
 * page.tsx 側は全対象を検索する（= シンプルに全部から探す）。
 */

type CountryOption = { slug: string; code: string; nameJa: string; emoji: string };

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700;900&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

.srch{--bg:#F4F4EF;--bg2:#FBFBF8;--card:#fff;--lime:#A8E01C;--lime-d:#5E8B0E;--ink:#14140f;--mu:#7a7a72;--bd:#E6E6DE;--disp:'Space Grotesk','Zen Kaku Gothic New',sans-serif;--jp:'Zen Kaku Gothic New',sans-serif;--mono:'JetBrains Mono',monospace;position:relative;min-height:calc(100vh - 56px);display:flex;align-items:center;justify-content:center;overflow:hidden;background:radial-gradient(120% 95% at 50% 10%, #ffffff 0%, var(--bg2) 40%, var(--bg) 100%);font-family:var(--jp);color:var(--ink);-webkit-font-smoothing:antialiased;font-feature-settings:"palt" 1}
.srch *{box-sizing:border-box}
.srch-globe{position:absolute;inset:0;width:100%;height:100%;z-index:0;display:block;opacity:.85}
.srch-fade{position:absolute;inset:0;z-index:1;pointer-events:none;background:radial-gradient(56% 50% at 50% 50%, rgba(244,244,239,0) 34%, rgba(247,247,243,.72) 100%)}
.srch-stage{position:relative;z-index:3;width:100%;text-align:center;padding:48px 24px}
.srch-kick{font-family:var(--mono);font-size:12px;letter-spacing:.30em;text-transform:uppercase;color:var(--lime-d)}
.srch-kick::before{content:"";display:inline-block;width:26px;height:1.5px;background:var(--lime-d);vertical-align:middle;margin-right:11px}
.srch h1{font-family:var(--jp);font-weight:900;color:var(--ink);font-size:clamp(30px,5.6vw,56px);line-height:1.16;letter-spacing:.01em;margin:18px 0 0}
.srch h1 em{font-style:normal;color:var(--lime-d)}
.srch-lead{color:var(--mu);font-size:clamp(13px,1.55vw,15.5px);line-height:1.85;margin-top:15px;font-weight:500}
.srch-form{margin:36px auto 0;width:min(440px,92vw);display:flex;flex-direction:column;gap:14px}
.srch-bar{display:flex;align-items:stretch;gap:10px;background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:8px;box-shadow:0 18px 46px -30px rgba(20,20,15,.4);transition:.16s}
.srch-bar:focus-within{border-color:var(--lime);box-shadow:0 22px 50px -28px rgba(94,139,14,.4)}
.srch-country{flex:none;border:0;background:#f6f9ee;border-radius:10px;padding:0 10px;font-family:var(--jp);font-weight:700;font-size:13px;color:var(--lime-d);cursor:pointer;outline:none;max-width:130px}
.srch-input{flex:1;min-width:0;border:0;background:none;font-family:var(--jp);font-size:16px;font-weight:500;color:var(--ink);padding:12px 6px;outline:none}
.srch-input::placeholder{color:#b6b6ad;font-weight:500}
.srch-cta{display:inline-flex;align-items:center;justify-content:center;gap:10px;background:var(--ink);color:var(--lime);font-family:var(--jp);font-weight:700;font-size:15px;border:0;border-radius:999px;padding:14px 28px;cursor:pointer;box-shadow:0 16px 34px -16px rgba(20,20,15,.55);transition:.22s cubic-bezier(.2,.7,.2,1)}
.srch-cta:hover{transform:translateY(-2px)}
.srch-cta svg{width:18px;height:18px}
@keyframes srchrise{to{opacity:1;transform:none}}
.srch-rise{opacity:0;transform:translateY(14px);animation:srchrise .9s cubic-bezier(.2,.7,.2,1) forwards}
.srch-d1{animation-delay:.04s}.srch-d2{animation-delay:.15s}.srch-d3{animation-delay:.3s}

/* compact（検索結果ページ上部のスリムバー） */
.srch-c{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.srch-c-bar{flex:1;min-width:240px;display:flex;align-items:stretch;gap:8px;background:var(--card,#fff);border:1px solid #E6E6DE;border-radius:12px;padding:6px;font-family:'Zen Kaku Gothic New',sans-serif}
.srch-c-bar:focus-within{border-color:#A8E01C}
.srch-c-country{flex:none;border:0;background:#f6f9ee;border-radius:9px;padding:0 9px;font-weight:700;font-size:13px;color:#5E8B0E;cursor:pointer;outline:none;max-width:120px}
.srch-c-input{flex:1;min-width:0;border:0;background:none;font-size:15px;color:#14140f;padding:9px 6px;outline:none}
.srch-c-cta{flex:none;display:inline-flex;align-items:center;gap:7px;background:#14140f;color:#A8E01C;font-weight:700;font-size:14px;border:0;border-radius:999px;padding:0 22px;cursor:pointer;font-family:'Zen Kaku Gothic New',sans-serif}
.srch-c-cta svg{width:16px;height:16px}
`;

function DotGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      const R = Math.min(W, H) * 0.44;
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
            const al = ((1 - d / TH) * 0.2 * (0.35 + (0.65 * (dep + 1)) / 2));
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

  return <canvas className="srch-globe" ref={canvasRef} aria-hidden />;
}

export function SearchForm({
  countries,
  initialQ,
  initialCountry,
  tags = [],
  mode = 'hero',
}: {
  countries: CountryOption[];
  initialQ: string;
  initialCountry: string;
  /** /services のタグ絞り込みからの引き継ぎ（hidden で submit に持ち越す） */
  tags?: string[];
  /** hero = 検索前のフルスクリーン入口 / compact = 結果ページ上部のスリムバー */
  mode?: 'hero' | 'compact';
}) {
  const tagsInput =
    tags.length > 0 ? (
      <input type="hidden" name="tags" value={tags.join(',')} />
    ) : null;

  // ── 結果ページ上部のスリムバー ──
  if (mode === 'compact') {
    return (
      <form method="get" action="/search" className="srch-c">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        {tagsInput}
        <div className="srch-c-bar">
          <select
            name="country"
            defaultValue={initialCountry}
            aria-label="国"
            className="srch-c-country"
          >
            <option value="">すべて</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.emoji} {c.nameJa}
              </option>
            ))}
          </select>
          <input
            type="search"
            name="q"
            defaultValue={initialQ}
            placeholder="キーワードで検索"
            aria-label="キーワード"
            className="srch-c-input"
          />
        </div>
        <button type="submit" className="srch-c-cta">
          検索
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.5" y2="16.5" />
          </svg>
        </button>
      </form>
    );
  }

  // ── 検索前のフルスクリーン入口（/community トップと同じ世界観） ──
  return (
    <section className="srch">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <DotGlobe />
      <div className="srch-fade" aria-hidden />

      <div className="srch-stage">
        <span className="srch-kick srch-rise srch-d1">Search</span>
        <h1 className="srch-rise srch-d2">
          なにを、<em>探す。</em>
        </h1>
        <p className="srch-lead srch-rise srch-d2">
          記事・サービス・ユーザー・コミュニティ投稿を、まとめて検索できます。
        </p>

        <form
          method="get"
          action="/search"
          className="srch-form srch-rise srch-d3"
        >
          {tagsInput}
          <div className="srch-bar">
            <select
              name="country"
              defaultValue={initialCountry}
              aria-label="国"
              className="srch-country"
            >
              <option value="">すべての国</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.emoji} {c.nameJa}
                </option>
              ))}
            </select>
            <input
              type="search"
              name="q"
              defaultValue={initialQ}
              placeholder="例: マレ ビストロ / 翻訳 / 求人"
              aria-label="キーワード"
              autoFocus
              className="srch-input"
            />
          </div>
          <button type="submit" className="srch-cta">
            検索する
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="13 6 19 12 13 18" />
            </svg>
          </button>
        </form>
      </div>
    </section>
  );
}
