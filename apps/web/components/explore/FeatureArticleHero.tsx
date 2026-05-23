import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { LocalTierBadge } from '@locore/ui';
import type { Article } from '@/lib/mock';

/**
 * /explore の「今週の特集」を雑誌表紙風に 1 本だけ大きく見せるカード。
 *
 * レイアウト:
 *   - 左 (sm+): カバー画像 (aspect 4/3)
 *   - 右 (sm+): タイトル / 著者 / ローカル度バッジ / リード文 / CTA
 *   - sm 未満: 縦積み、カバー上、テキスト下
 */
export function FeatureArticleHero({ article }: { article: Article }) {
  const lead =
    article.body
      ?.replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180) ?? '';

  return (
    <Link
      href={`/articles/${article.id}`}
      className="group grid overflow-hidden rounded-2xl bg-card ring-1 ring-border transition hover:ring-primary-300 sm:grid-cols-5"
    >
      {/* カバー画像 */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted sm:col-span-3 sm:aspect-auto">
        {article.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.coverImageUrl}
            alt={article.title}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : null}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-neutral-950/85 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur">
          FEATURE
        </span>
      </div>

      {/* テキスト */}
      <div className="flex flex-col justify-between gap-4 p-5 sm:col-span-2 sm:p-7">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary-300">
            {article.area ?? 'Locore'}
          </p>
          <h3 className="mt-2 text-[22px] font-bold leading-[1.3] tracking-tight sm:text-[26px]">
            {article.title}
          </h3>
          {lead ? (
            <p className="mt-3 line-clamp-4 text-[13px] leading-[1.85] text-foreground/70">
              {lead}
              {lead.length >= 180 ? '…' : ''}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="inline-flex items-center gap-1.5 text-[12px] font-medium text-foreground/65">
            {article.writerName ? (
              <span className="font-bold text-foreground/80">
                {article.writerName}
              </span>
            ) : null}
            {article.writerYears != null && article.writerYears > 0 ? (
              <span className="text-foreground/45">
                在住 {article.writerYears} 年
              </span>
            ) : null}
          </p>
          <LocalTierBadge score={article.localScoreAverage ?? 70} size="sm" />
          <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-bold text-primary-300 transition group-hover:gap-2">
            読む
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
