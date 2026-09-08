import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';
import type { ArticleBlock } from '@/lib/articles/blocks';
import { headingsOf, midCtaIndex, readingMinutes, blocksToPlainText } from '@/lib/articles/blocks';
import { getEditorialAuthor, getRelatedEditorial, resolveLinkCards, type RelatedArticle } from '@/lib/articles/editorial';
import { SPECIALTY_GROUPS } from '@/lib/experts/specialties';
import { Prose } from '@/components/articles/Prose';
import { Toc } from '@/components/articles/Toc';

/**
 * ブログ記事ページ（エディトリアル版・案 B）。docs/blog-article-page-research.md §2・§5・§6。
 * 冒頭: テーマ・国 → タイトル → サブタイトル → 著者行 → 写真（任意）→ リード → 本文（途中に相談導線）
 * 末尾: 著者 → 同じ先輩の記事 → 同じテーマの記事。PC は右レールに目次、スマホは下部固定バー。
 */
export async function EditorialArticle({
  article,
  blocks,
  writerId,
  countryNameJa,
  isOwner,
}: {
  article: { id: string; title: string; subtitle: string | null; lead: string | null; topic: string | null; coverImageUrl: string | null; publishedAt: Date | null; status: string };
  blocks: ArticleBlock[];
  writerId: string;
  countryNameJa: string | null;
  isOwner: boolean;
}) {
  const [author, related, linkCards] = await Promise.all([
    getEditorialAuthor(writerId),
    getRelatedEditorial(article.id, writerId, article.topic),
    resolveLinkCards(blocks),
  ]);
  const topicLabel = article.topic ? SPECIALTY_GROUPS.find((g) => g.code === article.topic)?.label ?? null : null;
  const minutes = readingMinutes(blocksToPlainText(blocks) + (article.lead ?? ''));
  const date = article.publishedAt ? fmtDate(article.publishedAt) : null;
  const headings = headingsOf(blocks);
  const consultHref = author?.isExpert ? `/experts/${author.id}` : null;
  const price = author?.minPriceJpy != null ? `¥${author.minPriceJpy.toLocaleString('ja-JP')}〜` : null;

  const midCta =
    author && consultHref ? (
      <div className="my-[3em] flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-y border-border py-[18px] text-[13.5px]">
        <Avatar author={author} size={32} />
        {/* flex-1 は basis:0 なので、min-w が無いと 320px でも折り返さず文字が細長く潰れる。
            スマホは basis を「1 行目の残り幅」ちょうどにして、CTA を必ず次行へ落とす
            （rem 固定だと 402px では折り返しの引き金にならず、ml-[44px] が行中の空白として残る） */}
        <div className="min-w-[11rem] flex-1 max-sm:basis-[calc(100%_-_48px)]">
          <b className="block">この記事を書いた先輩に、30 分で相談できます</b>
          <small className="text-[12px] text-neutral-500">
            {[author.name, author.schoolLabel ? `${shortSchool(author.schoolLabel)} ${author.enrollmentLabel ?? ''}`.trim() : null, price].filter(Boolean).join(' · ')}
          </small>
        </div>
        <Link href={consultHref} className="ml-auto whitespace-nowrap border-b-2 border-primary-500 pb-0.5 text-[13px] font-bold text-foreground no-underline max-sm:ml-[44px]">
          相談する →
        </Link>
      </div>
    ) : null;

  return (
    <main className="bg-background text-foreground">
      <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-x-14 px-5 pb-32 pt-8 sm:px-8 sm:pt-14 lg:grid-cols-[200px_640px_1fr]">
        {/* ===== 冒頭 ===== */}
        <div className="min-w-0 lg:col-start-2">
          {article.status !== 'published' ? (
            <div className="mb-6 rounded-xl bg-neutral-900 px-4 py-2.5 text-[12.5px] font-bold text-primary-500">
              下書きのプレビュー（本人と編集チームだけが見られます）
            </div>
          ) : null}
          <p className="text-[11.5px] uppercase tracking-[0.18em] text-neutral-500 max-sm:text-[11px]">
            {topicLabel ? <b className="font-bold tracking-[0.06em] text-foreground">{topicLabel}</b> : <b className="font-bold tracking-[0.06em] text-foreground">読みもの</b>}
            {countryNameJa ? <> &nbsp;·&nbsp; {countryNameJa}</> : null}
          </p>
          <h1 className="mt-[18px] text-[40px] font-bold leading-[1.32] tracking-[-0.025em] max-sm:mt-3 max-sm:text-[26px] max-sm:leading-[1.38] max-sm:tracking-[-0.02em]">{article.title}</h1>
          {article.subtitle ? <p className="mt-[18px] text-[18px] leading-[1.75] text-neutral-700 max-sm:mt-3 max-sm:text-[15.5px] max-sm:leading-[1.7]">{article.subtitle}</p> : null}

          {author ? (
            <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-[18px] text-[12.5px] text-neutral-500 max-sm:mt-5 max-sm:text-[12px]">
              <Link href={consultHref ?? `/users/${author.id}`} className="flex min-w-0 items-center gap-3 no-underline">
                <Avatar author={author} size={36} />
                {/* 学校名が長いと 1 文字ずつ縦積みになるので、縮む側に min-w-0 */}
                <span className="min-w-0">
                  <b className="text-[13.5px] font-bold text-foreground">{author.name}</b>
                  {author.schoolLabel ? (
                    <>
                      <span className="text-neutral-300"> / </span>
                      {shortSchool(author.schoolLabel)} {author.enrollmentLabel ?? ''}
                    </>
                  ) : null}
                  {author.verified ? (
                    <>
                      <span className="text-neutral-300"> / </span>在籍確認済み
                    </>
                  ) : null}
                </span>
              </Link>
              <span className="ml-auto shrink-0 whitespace-nowrap max-sm:ml-0 max-sm:w-full max-sm:pl-[48px]">
                {[date, `${minutes} 分`].filter(Boolean).join(' · ')}
              </span>
            </div>
          ) : null}

          {article.coverImageUrl ? (
            <div className="mt-9 overflow-hidden rounded bg-neutral-100 aspect-[3/2] max-sm:mt-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={article.coverImageUrl} alt="" className="h-full w-full object-cover" />
            </div>
          ) : null}

          {article.lead ? <p className="mt-11 text-[19px] leading-[1.85] text-neutral-800 first-letter:font-bold max-sm:mt-7 max-sm:text-[17px]">{article.lead}</p> : null}

          {/* ===== 本文 ===== */}
          <div className="mt-9 max-sm:mt-6">
            <Prose blocks={blocks} linkCards={linkCards} midCta={midCta} midCtaAt={midCtaIndex(blocks)} />
          </div>

          {/* ===== 末尾: 著者 ===== */}
          {author ? (
            <section className="mt-[72px] grid grid-cols-[88px_1fr] gap-6 border-t border-foreground pt-8 max-sm:mt-14 max-sm:grid-cols-1 max-sm:gap-3.5">
              <Avatar author={author} size={88} className="max-sm:h-16 max-sm:w-16" />
              <div>
                <div className="text-[11px] tracking-[0.18em] text-neutral-500">この記事を書いた先輩</div>
                <h3 className="mt-1.5 text-[22px] tracking-[-0.01em] max-sm:text-[20px]">{author.name}</h3>
                <div className="mt-1 text-[13.5px] leading-[1.7] text-neutral-700">
                  {[author.schoolLabel ? `${author.schoolLabel} ${author.enrollmentLabel ?? ''}`.trim() : null, [author.countryNameJa, author.cityNameJa].filter(Boolean).join('・') || null].filter(Boolean).join(' · ')}
                  {author.verified ? (
                    <>
                      {' · '}
                      <span className="inline-flex items-center gap-1 font-bold text-foreground">
                        <BadgeCheck className="h-3.5 w-3.5 text-primary-700" aria-hidden />
                        在籍確認済み
                      </span>
                    </>
                  ) : null}
                </div>
                {author.specialties.length ? <div className="mt-3 text-[12.5px] text-neutral-500">{author.specialties.join(' · ')}</div> : null}
                {author.bio ? <p className="mt-3 line-clamp-3 text-[13.5px] leading-[1.8] text-neutral-700">{author.bio}</p> : null}
                <div className="mt-5 flex flex-wrap items-center gap-x-[18px] gap-y-2.5">
                  {consultHref ? (
                    <Link href={consultHref} className="rounded-full bg-primary-500 px-5 py-3 text-[13.5px] font-extrabold text-neutral-900 no-underline transition hover:bg-primary-400">
                      30 分で相談する{price ? ` · ${price}` : ''}
                    </Link>
                  ) : null}
                  <Link href={consultHref ?? `/users/${author.id}`} className="-my-2 py-2 text-[13px] text-neutral-700 underline decoration-neutral-300 underline-offset-4">
                    プロフィールを見る
                  </Link>
                  {consultHref ? <small className="text-[12px] text-neutral-500">チャットでの事前相談は無料</small> : null}
                </div>
              </div>
            </section>
          ) : null}

          {/* ===== 関連 ===== */}
          {related.byAuthor.length > 0 ? <RelatedList title={`${author?.name ?? '同じ先輩'}の他の記事`} items={related.byAuthor} showAuthor={false} /> : null}
          {related.byTopic.length > 0 ? <RelatedList title="同じテーマの記事" items={related.byTopic} showAuthor /> : null}
          {isOwner ? (
            <p className="mt-10 text-[12px] text-neutral-400">
              <Link href={`/writer/articles/${article.id}/write`} className="underline underline-offset-4">この記事を編集する</Link>
            </p>
          ) : null}
        </div>

        {/* ===== 右レール: 目次 ===== */}
        <aside className="hidden lg:col-start-3 lg:row-start-1 lg:block">
          <div className="sticky top-24 pt-[420px]">
            <Toc items={headings} />
          </div>
        </aside>
      </div>

      {/* ===== スマホ: 下部固定バー ===== */}
      {author && consultHref ? (
        // 下部タブを廃止したので画面下端に置く。ホームバー分だけ内側に余白を持たせる。
        <div
          className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2.5 border-t border-border bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden"
          style={{ paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))' }}
        >
          {/* 名前が長くても「相談する」が 1 文字ずつに割れないよう、ボタンは shrink-0 */}
          <div className="min-w-0 flex-1 text-[12.5px] leading-[1.45]">
            <b>{author.name}</b> さんに相談 {price ? <span className="text-[11px] text-neutral-500">30 分 {price}</span> : null}
          </div>
          <Link href={consultHref} className="ml-auto shrink-0 whitespace-nowrap rounded-full bg-primary-500 px-4 py-2.5 text-[13px] font-extrabold text-neutral-900 no-underline">
            相談する
          </Link>
        </div>
      ) : null}
    </main>
  );
}

function RelatedList({ title, items, showAuthor }: { title: string; items: RelatedArticle[]; showAuthor: boolean }) {
  return (
    <section className="mt-16 max-sm:mt-12">
      <h2 className="mb-1.5 text-[11.5px] font-semibold tracking-[0.18em] text-neutral-500">{title}</h2>
      {items.map((a, i) => (
        <Link key={a.id} href={`/articles/${a.id}`} className="grid grid-cols-[36px_1fr_auto] items-baseline gap-3.5 border-b border-border py-4 no-underline max-sm:grid-cols-[22px_1fr_auto] max-sm:gap-2.5">
          <span className="text-[12px] tabular-nums text-neutral-400">{String(i + 1).padStart(2, '0')}</span>
          <span className="min-w-0 text-[16px] font-bold leading-[1.5] tracking-[-0.01em] text-foreground">
            {a.title}
            <small className="mt-0.5 block text-[12.5px] font-normal text-neutral-500">
              {[a.topic ? SPECIALTY_GROUPS.find((g) => g.code === a.topic)?.label ?? a.topic : null, showAuthor ? a.writerName : null, a.publishedAt ? fmtDate(new Date(a.publishedAt)) : null].filter(Boolean).join(' · ')}
            </small>
          </span>
          <span className="whitespace-nowrap text-[12px] text-neutral-400">{a.minutes} 分</span>
        </Link>
      ))}
    </section>
  );
}

function Avatar({ author, size, className = '' }: { author: { name: string; avatarUrl: string | null }; size: number; className?: string }) {
  return (
    <span className={`grid flex-none place-items-center overflow-hidden rounded-full bg-neutral-900 font-bold text-primary-500 ${className}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}>
      {author.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={author.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        author.name.charAt(0)
      )}
    </span>
  );
}

function shortSchool(label: string): string {
  // 「ハーバード・ビジネス・スクール（Harvard Business School）」→ 日本語部分だけ
  return label.replace(/（[^）]*）$/, '');
}

function fmtDate(d: Date): string {
  const j = new Date(d.getTime() + 9 * 3600_000);
  return `${j.getUTCFullYear()}.${String(j.getUTCMonth() + 1).padStart(2, '0')}.${String(j.getUTCDate()).padStart(2, '0')}`;
}
