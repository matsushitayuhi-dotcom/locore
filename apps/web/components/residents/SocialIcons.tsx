import type { ReactNode } from 'react';

/**
 * プロフィールのソーシャルアイコン群（自作インライン SVG）。
 *
 * - sns_links の platform / url を受け取り、登録のあるものだけアイコンを描画
 * - グラス調の角丸ボタン → ホバーでライム反転（ヒーローのダーク背景前提）
 * - email は mailto: / 生メールどちらでも mailto リンクに正規化
 *
 * variant:
 *   - 'hero'  … ダーク背景前提の半透明ガラス（既定）
 *   - 'light' … 明るい背景（カード上など）用の枠線スタイル
 */

type Link = { platform: string; url: string };

type Props = {
  links: Link[];
  variant?: 'hero' | 'light';
};

const LABEL: Record<string, string> = {
  instagram: 'Instagram',
  x: 'X',
  threads: 'Threads',
  note: 'note',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  blog: 'Blog',
  website: 'Website',
  email: 'メール',
};

/** 表示順（登録の有無に関わらずこの順で並べる） */
const ORDER = [
  'instagram',
  'x',
  'threads',
  'note',
  'youtube',
  'tiktok',
  'facebook',
  'blog',
  'website',
  'email',
];

function Icon({ platform }: { platform: string }): ReactNode {
  switch (platform) {
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round">
          <rect x="3" y="3" width="18" height="18" rx="5.2" />
          <circle cx="12" cy="12" r="4.1" />
          <circle cx="17.4" cy="6.6" r="1.15" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'x':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2H21.5l-7.5 8.57L22.5 22h-6.9l-5.4-7.06L4.02 22H.76l8.02-9.17L1.5 2h7.07l4.88 6.45L18.244 2Zm-1.21 18h1.79L7.05 3.9H5.13L17.034 20Z" />
        </svg>
      );
    case 'threads':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 22C6.6 22 3 18.4 3 12S6.6 2 12 2c3.4 0 5.9 1.3 7.4 3.7l-1.8 1.2C16.5 5.1 14.6 4.1 12 4.1 7.7 4.1 5.1 7 5.1 12s2.6 7.9 6.9 7.9c3.1 0 4.9-1.6 4.9-3.4 0-1.5-1-2.5-2.7-2.9-.3 1.9-1.5 3.1-3.4 3.1-1.7 0-2.9-1.05-2.9-2.6 0-1.8 1.6-2.8 3.9-2.8.5 0 1 .03 1.4.1v-.5c0-1.2-.7-2-2-2-1 0-1.7.4-2.1 1.3l-1.8-.9c.7-1.5 2.1-2.3 3.9-2.3 2.4 0 4 1.5 4 4v.9c1.8.6 3 2.1 3 4.1 0 3-2.7 5.4-7.1 5.4Zm.3-7c-1.3 0-2 .5-2 1.2 0 .6.5 1 1.3 1 1.1 0 1.8-.8 2-2.1-.4-.07-.8-.1-1.3-.1Z" />
        </svg>
      );
    case 'note':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}>
          <circle cx="12" cy="12" r="9" />
          <path
            d="M9 16V9.6m0 1.7c.55-1.05 1.6-1.6 2.8-1.6 1.55 0 2.4 1.05 2.4 2.7V16"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M23 12s0-3.2-.41-4.73a2.5 2.5 0 0 0-1.76-1.77C19.27 5 12 5 12 5s-7.27 0-8.83.5A2.5 2.5 0 0 0 1.41 7.27C1 8.8 1 12 1 12s0 3.2.41 4.73a2.5 2.5 0 0 0 1.76 1.77C4.73 19 12 19 12 19s7.27 0 8.83-.5a2.5 2.5 0 0 0 1.76-1.77C23 15.2 23 12 23 12Zm-13 3.27V8.73L15.6 12 10 15.27Z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M16.6 5.8c.55 1.4 1.75 2.5 3.25 2.75v2.7c-1.35.03-2.6-.4-3.65-1.15v5.45a5.05 5.05 0 1 1-5.05-5.05c.28 0 .56.02.83.07v2.75a2.35 2.35 0 1 0 1.62 2.23V3h2.6c0 1 .12 1.95.4 2.8Z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M13.1 21v-7.9h2.6l.4-3.05h-3v-1.95c0-.88.3-1.48 1.56-1.48H16.3V3.9c-.46-.06-1.36-.15-2.4-.15-2.37 0-4 1.45-4 4.1v2.3H7.3v3.05h2.6V21h3.2Z" />
        </svg>
      );
    case 'website':
    case 'blog':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3.2 12h17.6M12 3a14.5 14.5 0 0 1 0 18M12 3a14.5 14.5 0 0 0 0 18" />
        </svg>
      );
    case 'email':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2.6" />
          <path d="m4 7.5 8 5.2 8-5.2" />
        </svg>
      );
    default:
      return null;
  }
}

function hrefFor(platform: string, url: string): string {
  if (platform === 'email') {
    if (url.startsWith('mailto:')) return url;
    if (url.includes('@') && !url.includes('/')) return `mailto:${url}`;
  }
  return url;
}

export function SocialIcons({ links, variant = 'hero' }: Props) {
  if (!links || links.length === 0) return null;

  // 同一 platform は最初の 1 件を採用し、ORDER の順に並べる
  const byPlatform = new Map<string, string>();
  for (const l of links) {
    if (l.url && !byPlatform.has(l.platform)) byPlatform.set(l.platform, l.url);
  }
  const ordered = ORDER.filter((p) => byPlatform.has(p)).map((p) => ({
    platform: p,
    url: byPlatform.get(p)!,
  }));
  if (ordered.length === 0) return null;

  const base =
    variant === 'hero'
      ? 'border-white/25 bg-white/10 text-white backdrop-blur hover:bg-primary-500 hover:border-primary-500 hover:text-neutral-950'
      : 'border-border bg-card text-foreground hover:bg-primary-500 hover:border-primary-500 hover:text-neutral-950';

  return (
    <div className="flex flex-wrap gap-2.5">
      {ordered.map(({ platform, url }) => (
        <a
          key={platform}
          href={hrefFor(platform, url)}
          target={platform === 'email' ? undefined : '_blank'}
          rel="noopener noreferrer"
          aria-label={LABEL[platform] ?? platform}
          title={LABEL[platform] ?? platform}
          className={
            'inline-flex h-11 w-11 items-center justify-center rounded-[14px] border transition ' +
            'hover:-translate-y-0.5 [&_svg]:h-[21px] [&_svg]:w-[21px] ' +
            base
          }
        >
          <Icon platform={platform} />
        </a>
      ))}
    </div>
  );
}
