'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@locore/ui';

/**
 * /residents/[id] のヒーロー（ポートフォリオ風）。
 *
 * - カバー画像をフルブリード背景に。未設定でもライムのネットワーク演出で成立
 * - その上に名前・職業・ティア・在住メタ（ピン等のアイコンは使わない）
 * - CTA（フォロー / メッセージ）とソーシャルアイコンは slot で受け取る
 *   （FollowButton / SocialIcons はサーバ側で組み立てて渡す）
 */

type Props = {
  coverImageUrl: string | null;
  avatarUrl: string | null;
  displayName: string;
  occupation: string | null;
  eyebrow: string;
  tierLabel: string | null;
  isVerified: boolean;
  /** 「Paris, France」「在住 7 年」「出身 東京都」などの文字列（アイコンなし） */
  metaParts: string[];
  cta?: ReactNode;
  socials?: ReactNode;
};

export function ResidentHero({
  coverImageUrl,
  avatarUrl,
  displayName,
  occupation,
  eyebrow,
  tierLabel,
  isVerified,
  metaParts,
  cta,
  socials,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hostRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let DPR = 1;
    let nodes: Array<{ x: number; y: number; vx: number; vy: number; r: number }> = [];
    let raf = 0;

    const init = () => {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = host.clientWidth;
      H = host.clientHeight;
      canvas.width = Math.max(1, Math.floor(W * DPR));
      canvas.height = Math.max(1, Math.floor(H * DPR));
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      let count = Math.round((W * H) / 16000);
      count = Math.max(28, Math.min(80, count));
      nodes = [];
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.28,
          vy: (Math.random() - 0.5) * 0.28,
          r: Math.random() * 1.8 + 1,
        });
      }
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
          if (d < 128) {
            ctx.strokeStyle = `rgba(168,224,28,${(1 - d / 128) * 0.45})`;
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
        ctx.fillStyle = 'rgba(196,240,120,0.95)';
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };

    init();
    frame();
    window.addEventListener('resize', init);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', init);
    };
  }, []);

  return (
    <section
      ref={hostRef}
      className="relative flex min-h-[62vh] items-end overflow-hidden rounded-3xl text-white sm:min-h-[68vh]"
    >
      {/* cover image */}
      {coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverImageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-950 to-[#1a2406]" />
      )}
      {/* network animation */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {/* shade for legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-black/85" />

      {/* content */}
      <div className="relative z-10 w-full p-6 sm:p-10">
        <p className="flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-primary-300">
          <span className="inline-block h-px w-5 bg-primary-300" />
          {eyebrow}
        </p>

        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-7">
          <div className="relative shrink-0">
            <span className="absolute -inset-1.5 rounded-full border-2 border-primary-500" />
            <Avatar
              className="relative ring-4 ring-black/20"
              style={{ height: 120, width: 120 }}
            >
              {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
              <AvatarFallback>
                {displayName[0]?.toUpperCase() ?? '?'}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="min-w-0">
            <h1 className="text-[34px] font-bold leading-[0.98] tracking-tight drop-shadow-sm sm:text-[52px]">
              {displayName}
            </h1>
            {occupation ? (
              <p className="mt-3 text-[16px] font-medium text-primary-200 sm:text-[20px]">
                {occupation}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[12.5px] text-white/85">
              {tierLabel ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-3 py-1 text-[11px] font-semibold tracking-wide text-neutral-950">
                  <span className="h-1.5 w-1.5 rounded-full bg-neutral-950" />
                  {tierLabel}
                </span>
              ) : null}
              {isVerified ? (
                <span className="inline-flex items-center rounded-full border border-primary-500/50 bg-primary-500/15 px-2.5 py-1 text-[11px] font-semibold text-primary-200">
                  在住確認済み
                </span>
              ) : null}
              {metaParts.map((part, i) => (
                <span key={i} className="inline-flex items-center gap-3">
                  {i > 0 ? (
                    <span className="h-[3px] w-[3px] rounded-full bg-white/45" />
                  ) : null}
                  {part}
                </span>
              ))}
            </div>
          </div>
        </div>

        {cta ? <div className="mt-6 flex flex-wrap items-center gap-3">{cta}</div> : null}
        {socials ? <div className="mt-4">{socials}</div> : null}
      </div>
    </section>
  );
}
