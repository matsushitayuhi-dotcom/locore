import Link from 'next/link';
import { LocalTierBadge } from '@locore/ui';
import type { Article } from '@/lib/mock';

/**
 * 雑誌風 2 列グリッド — /explore と /articles の「スポット紹介」「旅程プラン」用。
 *
 * デザイン方針:
 *  - 縦長カバー (aspect-[3/4]) で「雑誌の見開き」感
 *  - スマホでも 2 列を確保 (grid-cols-2)
 *  - sm: 2 列維持、md+: 3 列に拡張
 *  - カードは Link で記事詳細へ
 *  - エリアは uppercase 小さく、タイトルは 2 行クランプ
 *  - 著者名と LocalTierBadge を画像下にコンパクトに
 *
 * Server Component — クリック処理は <Link> に任せて軽量に保つ。
 */

type Props = {
  articles: Article[];
  /** 何件まで描画するか (既定 6) */
  limit?: number;
  socialCounts?: Map<string, { likeCount: number; bookmarkCount: number }>;
};

function formatArea(area: string): string {
  if (!area) return 'パリ';
  if (area.includes('・')) return area;
  if (area === 'パリ' || area.startsWith('パリ')) return area;
  return `パリ・${area}`;
}

export function ArticleMagazineGrid({ articles, limit = 6 }: Props) {
  const sliced = articles.slice(0, limit);

  if (sliced.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-card px-6 py-10 text-center text-[13px] text-foreground/55">
        該当する記事がまだありません。
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
      {sliced.map((article) => (
        <MagazineArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}

function MagazineArticleCard({ article }: { article: Article }) {
  const area = formatArea(article.area);
  return (
    <Link
      href={`/articles/${article.id}`}
      className="group flex flex-col gap-2 transition active:scale-[0.98]"
    >
      {/* 縦長カバー (3:4) — 雑誌風 */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-muted">
        {article.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.coverImageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] font-medium uppercase tracking-wider text-foreground/30">
            No Cover
          </div>
        )}

        {/* 種別タグ (左上) */}
        {article.articleType ? (
          <span
            className={
              'absolute left-2 top-2 inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-md ' +
              (article.articleType === 'itinerary'
                ? 'bg-primary-500 text-neutral-950'
                : 'bg-neutral-950/70 text-neutral-50')
            }
          >
            {article.articleType === 'itinerary'
              ? '旅程'
              : article.articleType === 'spot_guide'
                ? 'スポット'
                : article.articleType === 'expat_info'
                  ? '駐在者'
                  : 'フォト'}
          </span>
        ) : null}

        {/* ローカル度バッジ (左下) */}
        <div className="absolute bottom-2 left-2">
          <LocalTierBadge score={article.localScoreAverage} size="sm" onDark />
        </div>
      </div>

      {/* 画像下: 都市 (uppercase) / タイトル / 著者 */}
      <div className="flex flex-col gap-0.5 px-0.5">
        <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
          {area}
        </p>
        <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground sm:text-[14px]">
          {article.title}
        </h3>
        {article.writerName ? (
          <p className="truncate text-[11px] text-foreground/55">
            {article.writerName}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
