'use client';

import { useEffect, useRef, type RefObject } from 'react';
import type { Writer } from '@/lib/mock';

/* =========================================================================
 * Phase A 新レンダラ共通ユーティリティ（client）。
 *
 * - HeroNetCanvas: 全タイプ共通のヒーロー network canvas（ランディング/モック同系）。
 * - useReveal: スクロールで `.in` を付与する IntersectionObserver フック。
 * - 地図埋め込み URL: 実データの lat/lng から directions / pins を組む
 *   （tripData.ts の routeEmbedUrl / pinsEmbedUrl の実データ版・APIキー不要）。
 *   本番は公式 Google Maps Embed API（要APIキー）に差し替え予定。
 * - アイコン・日付整形・著者メタ。
 * ========================================================================= */

export type LatLng = { lat: number; lng: number };

export function hasCoords(lat?: number | null, lng?: number | null): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    // 0,0 は「座標なし」のプレースホルダ（loader が coords 欠落時に 0,0 で埋める）
    !(lat === 0 && lng === 0)
  );
}

/** order に沿った directions 埋め込み（APIキー不要）。座標2点未満は単一地図に。 */
export function routeEmbedUrl(pts: LatLng[]): string {
  const coords = pts.filter((p) => hasCoords(p.lat, p.lng));
  if (coords.length < 2) {
    const c = coords[0];
    const q = c ? `${c.lat},${c.lng}` : 'Paris';
    return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=13&output=embed`;
  }
  const saddr = `${coords[0]!.lat},${coords[0]!.lng}`;
  const daddr = coords
    .slice(1)
    .map((p) => `${p.lat},${p.lng}`)
    .join(' to: ');
  return `https://maps.google.com/maps?saddr=${encodeURIComponent(
    saddr,
  )}&daddr=${encodeURIComponent(daddr)}&output=embed`;
}

/** 順不同のピン集約マップ。中心座標へ寄せた単純地図（APIキー不要）。 */
export function pinsEmbedUrl(pts: LatLng[]): string {
  const coords = pts.filter((p) => hasCoords(p.lat, p.lng));
  if (coords.length === 0) {
    return `https://maps.google.com/maps?q=Paris&z=12&output=embed`;
  }
  const lat = coords.reduce((a, p) => a + p.lat, 0) / coords.length;
  const lng = coords.reduce((a, p) => a + p.lng, 0) / coords.length;
  return `https://maps.google.com/maps?q=${lat},${lng}&z=13&output=embed`;
}

/** ISO 文字列 → 「2026年5月18日」。失敗時は空文字。 */
export function fmtDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 著者メタ「◯◯ 在住 N年 · 駐在員 X」。クレジット式は出さない（spec §7）。 */
export function authorMeta(writer: Writer): string {
  const parts: string[] = [];
  if (writer.city) parts.push(`${writer.city} 在住`);
  if (writer.residencyYears) parts.push(`${writer.residencyYears}年`);
  const head = parts.join(' ');
  return writer.tier ? `${head} · 駐在員 ${writer.tier}` : head;
}

/* ===================== reveal フック ===================== */

export function useReveal(ref: RefObject<HTMLElement>, selector: string): void {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll(selector)) as HTMLElement[];
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
    return () => io.disconnect();
  }, [ref, selector]);
}

/* ===================== network canvas ===================== */

/**
 * ヒーロー背景の動くライム network canvas。`.tj-hnet` / `.pg-hnet` / `.es-hnet`
 * など、host となる hero（最も近い position:relative の overflow:hidden 親）に
 * 重ねる前提。className は各タイプの canvas クラスを渡す。
 *
 * React 18 では ref callback の戻り値（cleanup）が無視されるため、useEffect で
 * RAF / resize を確実に破棄する。
 */
export function HeroNetCanvas({ className }: { className: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const host = canvas.parentElement;
    if (!host) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let DPR = 1;
    let raf = 0;
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
    const onResize = () => init();
    window.addEventListener('resize', onResize);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <canvas className={className} ref={canvasRef} />;
}

/* ===================== アイコン ===================== */

export function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function BulbIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 21h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
    </svg>
  );
}

export function CostIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 7H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6M12 3v2M12 19v2" />
    </svg>
  );
}

export function ModeIcon({ mode }: { mode: string }) {
  if (mode === 'metro' || mode === 'train' || mode === 'bus')
    return (
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="ic">
        <rect x="4" y="3" width="16" height="14" rx="3" />
        <path d="M4 11h16M8 21l2-3M16 21l-2-3" />
        <circle cx="8.5" cy="14" r="1" fill="currentColor" stroke="none" />
        <circle cx="15.5" cy="14" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="ic">
      <circle cx="12" cy="4" r="2" />
      <path d="M9 21l1.5-6L8 12l2-5 3 1 2 3M10.5 15 8 21M13.5 13 16 21" />
    </svg>
  );
}
