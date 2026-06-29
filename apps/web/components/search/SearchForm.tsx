'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

/**
 * /search の入口フォーム。/community のトップ (CommunityCountryPicker) と
 * 同じミニマルな世界観に統一した。
 *
 *   - mode="hero"    … 検索前。回転する点描の地球を背景に、中央に
 *                       キーワード入力（＋国セレクト）と検索 CTA を置く。
 *   - mode="compact" … 検索後（結果あり）。スリムな検索バーを結果の上に置く。
 *
 * どちらのモードでも「カテゴリで絞り込む」トグルを備える。開くと検索対象
 * （記事 / サービス / ユーザー / コミュニティ 6 種）をピルで選べる。チェックを
 * areas=... として GET 送信し、page.tsx 側が対象を絞る。折りたたみ中も
 * チェックボックスは DOM に残す（display:none でも submit される）ため、
 * パネルを閉じたまま検索しても選択は保持される。
 *
 * GET フォーム (`method="get" action="/search"`) なので JS 無効でも submit でき、
 * 結果は Server Component 側 (page.tsx) が searchParams から描画する。
 */

type CountryOption = { slug: string; code: string; nameJa: string; emoji: string };
type ScopeOption = { value: string; label: string };
type ScopeGroup = { title: string; options: ScopeOption[] };

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

/* カテゴリ絞り込み（共通）。色はライム基調で hero / compact 両方で使う */
.srch-filt{font-family:'Zen Kaku Gothic New',sans-serif}
.srch-filt-toggle{display:inline-flex;align-items:center;gap:7px;background:none;border:0;cursor:pointer;font-family:inherit;font-weight:700;font-size:13px;color:#5E8B0E;padding:4px 2px}
.srch-filt-toggle .chev{width:15px;height:15px;transition:.2s}
.srch-filt.open .srch-filt-toggle .chev{transform:rotate(180deg)}
.srch-filt-badge{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#A8E01C;color:#14140f;font-size:10px;font-weight:700;line-height:1}
.srch-filt-panel{display:none;margin-top:12px;background:#fff;border:1px solid #E6E6DE;border-radius:14px;padding:14px 16px;box-shadow:0 18px 46px -34px rgba(20,20,15,.4);text-align:left}
.srch-filt.open .srch-filt-panel{display:block}
.srch-grp+.srch-grp{margin-top:12px}
.srch-grp-h{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#b0b0a6;margin:0 0 8px}
.srch-pills{display:flex;flex-wrap:wrap;gap:7px}
.srch-pill{display:inline-flex;align-items:center;gap:5px;border:1px solid #E6E6DE;background:#fff;color:#7a7a72;border-radius:999px;padding:6px 13px;font-size:13px;font-weight:600;cursor:pointer;transition:.12s;user-select:none}
.srch-pill:hover{border-color:#cfe79a;background:#f9fcf0}
.srch-pill:has(input:checked){background:#A8E01C;border-color:#A8E01C;color:#14140f}
.srch-pill input{position:absolute;opacity:0;width:0;height:0;pointer-events:none}
.srch-pill .dot{width:6px;height:6px;border-radius:999px;background:#cfcfc6;transition:.12s}
.srch-pill:has(input:checked) .dot{background:#14140f}
.srch-filt-acts{display:flex;gap:14px;margin-top:12px;padding-top:11px;border-top:1px solid #f0f0e9}
.srch-filt-act{background:none;border:0;cursor:pointer;font-family:inherit;font-size:12px;font-weight:700;color:#7a7a72}
.srch-filt-act:hover{color:#14140f}

/* compact（検索結果ページ上部のスリムバー） */
.srch-c-wrap{font-family:'Zen Kaku Gothic New',sans-serif}
.srch-c{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.srch-c-bar{flex:1;min-width:240px;display:flex;align-items:stretch;gap:8px;background:#fff;border:1px solid #E6E6DE;border-radius:12px;padding:6px}
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

/**
 * 「カテゴリで絞り込む」トグル＋ピル群。hero / compact 共通。
 * チェックボックス (name="areas") は折りたたみ中も DOM に残す。
 */
function CategoryFilter({
  scopeGroups,
  selectedScopes,
  filterActive,
}: {
  scopeGroups: ScopeGroup[];
  selectedScopes: Set<string>;
  filterActive: boolean;
}) {
  const [open, setOpen] = useState(filterActive);
  const rootRef = useRef<HTMLDivElement>(null);

  const setAll = (checked: boolean) => {
    rootRef.current
      ?.querySelectorAll<HTMLInputElement>('input[name="areas"]')
      .forEach((el) => {
        el.checked = checked;
      });
  };

  const selectedCount = scopeGroups.reduce(
    (n, g) => n + g.options.filter((o) => selectedScopes.has(o.value)).length,
    0,
  );

  return (
    <div className={'srch-filt' + (open ? ' open' : '')} ref={rootRef}>
      <button
        type="button"
        className="srch-filt-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        カテゴリで絞り込む
        {filterActive ? <span className="srch-filt-badge">{selectedCount}</span> : null}
        <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div className="srch-filt-panel">
        {scopeGroups.map((group) => (
          <div className="srch-grp" key={group.title}>
            <p className="srch-grp-h">{group.title}</p>
            <div className="srch-pills">
              {group.options.map((o) => (
                <label className="srch-pill" key={o.value}>
                  <input
                    type="checkbox"
                    name="areas"
                    value={o.value}
                    defaultChecked={selectedScopes.has(o.value)}
                  />
                  <span className="dot" aria-hidden />
                  {o.label}
                </label>
              ))}
            </div>
          </div>
        ))}
        <div className="srch-filt-acts">
          <button type="button" className="srch-filt-act" onClick={() => setAll(true)}>
            すべて選択
          </button>
          <button type="button" className="srch-filt-act" onClick={() => setAll(false)}>
            選択を解除
          </button>
        </div>
      </div>
    </div>
  );
}

export function SearchForm({
  countries,
  initialQ,
  initialCountry,
  tags = [],
  scopeGroups,
  selectedScopes,
  filterActive = false,
  mode = 'hero',
}: {
  countries: CountryOption[];
  initialQ: string;
  initialCountry: string;
  /** /services のタグ絞り込みからの引き継ぎ（hidden で submit に持ち越す） */
  tags?: string[];
  /** 詳細フィルターのピル定義（見出し付き） */
  scopeGroups: ScopeGroup[];
  /** 現在 ON になっている scope value の集合 */
  selectedScopes: Set<string>;
  /** areas を明示指定して一部に絞っている状態か（初期展開とバッジに使う） */
  filterActive?: boolean;
  /** hero = 検索前のフルスクリーン入口 / compact = 結果ページ上部のスリムバー */
  mode?: 'hero' | 'compact';
}) {
  const tagsInput =
    tags.length > 0 ? (
      <input type="hidden" name="tags" value={tags.join(',')} />
    ) : null;

  const filter = (
    <CategoryFilter
      scopeGroups={scopeGroups}
      selectedScopes={selectedScopes}
      filterActive={filterActive}
    />
  );

  // ── 結果ページ上部のスリムバー ──
  if (mode === 'compact') {
    return (
      <form method="get" action="/search" className="srch-c-wrap">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        {tagsInput}
        <div className="srch-c">
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
        </div>
        <div className="mt-3">{filter}</div>
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

          {filter}

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
