import Link from 'next/link';
import { ArrowLeft, SearchX } from 'lucide-react';
import { SearchBox } from '@/components/SearchBox';
import { ArticleGrid } from '@/components/ArticleGrid';
import { searchPublishedArticles } from '@/lib/articles/search';
import { getArticleSocialCounts } from '@/lib/articleLikes/actions';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams?: { q?: string; in?: string };
};

export const metadata = { title: '記事検索 — Locore' };

export default async function SearchPage({ searchParams }: Props) {
  const rawQ = (searchParams?.q ?? '').trim();
  const rawIn = searchParams?.in === 'body' ? 'body' : 'title';

  const results = rawQ
    ? await searchPublishedArticles(rawQ, rawIn, 60)
    : [];
  const socialCounts = await getArticleSocialCounts(results.map((a) => a.id));

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        ホームに戻る
      </Link>

      <header className="mt-4 mb-6">
        <h1 className="text-[24px] font-bold tracking-tight text-foreground sm:text-[28px]">
          書いてある言葉から、辿る
        </h1>
        <p className="mt-1 text-[13px] text-foreground/65">
          店名・地区名・気分を表す言葉、なんでもどうぞ。タイトルだけか本文も含めるか、切り替えられます。
        </p>
      </header>

      <SearchBox defaultQuery={rawQ} defaultIn={rawIn} showLabel />

      <section className="mt-8">
        {rawQ ? (
          <p className="mb-4 text-[13px] text-foreground/70">
            「<strong className="text-primary-300">{rawQ}</strong>」を
            <strong>{rawIn === 'body' ? '本文' : 'タイトル'}</strong>から検索 ・{' '}
            <span className="tabular font-semibold">{results.length}</span> 件
          </p>
        ) : (
          <p className="rounded-lg bg-primary-500/10 px-4 py-3 text-[13px] text-foreground/70">
            検索したい言葉を入力してみてください。
          </p>
        )}

        {rawQ && results.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border bg-card px-6 py-12 text-center text-[13px] text-foreground/65">
            <SearchX className="h-8 w-8 text-foreground/35" />
            <p className="text-[14px] font-medium text-foreground/75">
              ぴったりの記事はまだ見つかりませんでした
            </p>
            <p className="text-[12px] text-foreground/55">
              キーワードを少し変えるか、検索対象を「本文」に切り替えてみてください。
            </p>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <Link
                href="/search"
                className="rounded-full bg-card px-3 py-1.5 text-[12px] font-semibold text-foreground ring-1 ring-border hover:bg-muted"
              >
                条件を変えてもう一度
              </Link>
              <Link
                href={`/search?q=${encodeURIComponent(rawQ)}&in=${rawIn === 'body' ? 'title' : 'body'}`}
                className="rounded-full bg-primary-500 px-3 py-1.5 text-[12px] font-bold text-neutral-950 hover:bg-primary-300"
              >
                {rawIn === 'body' ? 'タイトルで検索' : '本文も含めて検索'}
              </Link>
            </div>
          </div>
        ) : null}

        {results.length > 0 ? (
          <ArticleGrid articles={results} socialCounts={socialCounts} />
        ) : null}
      </section>
    </main>
  );
}
