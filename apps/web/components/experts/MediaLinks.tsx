import Link from 'next/link';
import { ArrowUpRight, Play } from 'lucide-react';
import type { SocialLink } from '@/lib/residents/byId';
import { PLATFORM_LABEL, resolveDisplay, youtubeVideoId, type ResolvedDisplay } from '@/lib/media/display';
import { MediaThumb } from '@/components/experts/MediaThumb';

/**
 * /experts/[id] の「発信・メディア」セクション（0088）。
 *
 * 並び（docs/experts-media-display-research.md §4.3、2026-09-06 決定）:
 *   1. Locore の記事（最優先・カード）
 *   2. 外部リンクのうち featured（全幅 16:9）
 *   3. card（2 列）
 *   4. button（縦リスト）
 *   icon（email など）はここには出さず、ヒーローのアイコン列のみ。
 * 画像は外部 URL を referrerPolicy=no-referrer で出し、失敗時は platform の面にフォールバック（MediaThumb）。
 */

export type MediaArticle = {
  id: string;
  title: string;
  coverImageUrl: string | null;
  typeLabel: string;
  dateLabel: string | null;
};

type Bucketed = Record<ResolvedDisplay, SocialLink[]>;

export function bucketLinks(links: SocialLink[]): Bucketed {
  const b: Bucketed = { icon: [], button: [], card: [], featured: [], embed: [] };
  for (const l of links) b[resolveDisplay(l)].push(l);
  return b;
}

/** セクションに出す件数（icon を除く） */
export function countMedia(articles: MediaArticle[], links: SocialLink[]): number {
  const b = bucketLinks(links);
  return articles.length + b.featured.length + b.embed.length + b.card.length + b.button.length;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function PlatformBadge({ platform, label }: { platform: string; label?: string }) {
  return (
    <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-[3px] text-[10px] font-bold text-neutral-900 shadow-sm">
      {label ?? PLATFORM_LABEL[platform] ?? platform}
    </span>
  );
}

function FeaturedItem({ l }: { l: SocialLink }) {
  const isVideo = l.kind === 'video';
  return (
    <a
      href={l.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block overflow-hidden rounded-xl border border-border bg-card transition hover:border-foreground"
    >
      <div className="relative aspect-video">
        <MediaThumb src={l.imageUrl} platform={l.platform} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
        <PlatformBadge platform={l.platform} />
        {isVideo ? (
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-primary-500 text-neutral-950 shadow-lg">
              <Play className="ml-0.5 h-5 w-5" fill="currentColor" aria-hidden />
            </span>
          </span>
        ) : null}
      </div>
      <div className="p-3.5">
        <b className="line-clamp-2 block text-[14.5px] font-semibold leading-[1.5]">{l.title ?? l.url}</b>
        {l.description ? <p className="mt-1 line-clamp-2 text-[12px] leading-[1.6] text-neutral-500">{l.description}</p> : null}
        <small className="mt-1.5 block text-[11px] text-neutral-400">{l.siteName ?? hostOf(l.url)}</small>
      </div>
    </a>
  );
}

/** YouTube 動画の埋め込み（facade: サムネ＋再生ボタン → クリックで iframe） */
function EmbedItem({ l }: { l: SocialLink }) {
  const id = youtubeVideoId(l.url);
  if (!id) return <FeaturedItem l={l} />;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <details className="group">
        <summary className="relative block aspect-video cursor-pointer list-none [&::-webkit-details-marker]:hidden group-open:hidden">
          <MediaThumb src={l.imageUrl ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`} platform="youtube" className="h-full w-full object-cover" />
          <PlatformBadge platform="youtube" />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-primary-500 text-neutral-950 shadow-lg">
              <Play className="ml-0.5 h-5 w-5" fill="currentColor" aria-hidden />
            </span>
          </span>
        </summary>
        <div className="hidden aspect-video group-open:block">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title={l.title ?? 'YouTube'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            className="h-full w-full"
          />
        </div>
      </details>
      <div className="flex items-center justify-between gap-3 p-3.5">
        <b className="line-clamp-1 text-[13.5px] font-semibold">{l.title ?? l.url}</b>
        <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 text-[11.5px] text-neutral-500 hover:text-foreground">
          YouTube で開く <ArrowUpRight className="h-3 w-3" aria-hidden />
        </a>
      </div>
    </div>
  );
}

function CardItem({ l }: { l: SocialLink }) {
  return (
    <a
      href={l.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:border-foreground"
    >
      <div className="relative aspect-[16/9]">
        <MediaThumb src={l.imageUrl} platform={l.platform} className="h-full w-full object-cover" />
        <PlatformBadge platform={l.platform} />
      </div>
      <div className="p-3">
        <b className="line-clamp-2 block text-[13.5px] font-semibold leading-[1.5]">{l.title ?? l.url}</b>
        <small className="mt-1 block text-[11px] text-neutral-400">{l.siteName ?? hostOf(l.url)}</small>
      </div>
    </a>
  );
}

function ArticleCard({ a }: { a: MediaArticle }) {
  return (
    <Link
      href={`/articles/${a.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:border-foreground"
    >
      <div className="relative aspect-[16/9] bg-muted">
        {a.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.coverImageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          // カバー未設定: 黒地に記事種別を大きく置いた面（空のグレー箱を避ける）
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-neutral-900 to-neutral-700 px-4 text-center">
            <span className="text-[13px] font-bold tracking-wide text-primary-500">{a.typeLabel}</span>
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-neutral-900 px-2 py-[3px] text-[10px] font-bold text-primary-500 shadow-sm">
          Locore 記事
        </span>
      </div>
      <div className="p-3">
        <b className="line-clamp-2 block text-[13.5px] font-semibold leading-[1.5]">{a.title}</b>
        <small className="mt-1 block text-[11px] text-neutral-400">
          {a.typeLabel}
          {a.dateLabel ? ` ・ ${a.dateLabel}` : ''}
        </small>
      </div>
    </Link>
  );
}

function ButtonItem({ l }: { l: SocialLink }) {
  const label = PLATFORM_LABEL[l.platform] ?? l.platform;
  return (
    <a
      href={l.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group grid grid-cols-[48px_1fr_auto] items-center gap-3 rounded-xl border border-border-strong bg-card p-2 pr-3.5 transition hover:border-foreground"
    >
      <span className="h-12 w-12 overflow-hidden rounded-lg">
        <MediaThumb src={l.imageUrl} platform={l.platform} className="h-full w-full object-cover" monogram />
      </span>
      <span className="min-w-0">
        <b className="block truncate text-[13.5px] font-semibold">{l.title ?? label}</b>
        <small className="block truncate text-[11px] text-neutral-400">
          {label}
          {l.siteName && l.siteName !== label ? ` ・ ${l.siteName}` : ''}
          {!l.title ? ` ・ ${hostOf(l.url)}` : ''}
        </small>
      </span>
      <ArrowUpRight className="h-4 w-4 text-neutral-400 transition group-hover:text-foreground" aria-hidden />
    </a>
  );
}

export function MediaLinks({ articles, links }: { articles: MediaArticle[]; links: SocialLink[] }) {
  const b = bucketLinks(links);
  const big = [...b.embed.map((l) => ({ l, embed: true })), ...b.featured.map((l) => ({ l, embed: false }))];
  return (
    <div className="flex max-w-[640px] flex-col gap-3.5">
      {articles.length > 0 ? (
        <div className="grid gap-3.5 sm:grid-cols-2">
          {articles.map((a) => (
            <ArticleCard key={a.id} a={a} />
          ))}
        </div>
      ) : null}
      {big.map(({ l, embed }) => (embed ? <EmbedItem key={l.id} l={l} /> : <FeaturedItem key={l.id} l={l} />))}
      {b.card.length > 0 ? (
        <div className="grid gap-3.5 sm:grid-cols-2">
          {b.card.map((l) => (
            <CardItem key={l.id} l={l} />
          ))}
        </div>
      ) : null}
      {b.button.length > 0 ? (
        <div className="grid gap-2">
          {b.button.map((l) => (
            <ButtonItem key={l.id} l={l} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
