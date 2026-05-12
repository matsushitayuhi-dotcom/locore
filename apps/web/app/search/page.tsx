import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
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
          記事検索
        </h1>
        <p className="mt-1 text-[13px] text-foreground/65">
          タイトル or 本文を選んで検索できます。
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
            検索キーワードを入力してください。
          </p>
        )}

        {rawQ && results.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-card px-6 py-12 text-center text-[13px] text-foreground/55">
            該当する記事が見つかりませんでした。
            <br />
            別のキーワードや、検索対象（タイトル / 本文）を切り替えてお試しください。
          </div>
        ) : null}

        {results.length > 0 ? (
          <ArticleGrid articles={results} socialCounts={socialCounts} />
        ) : null}
      </section>
    </main>
  );
}
