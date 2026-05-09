import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getCollectionWithArticles } from '@/lib/collections/db';
import { ArticleGrid } from '../../../components/ArticleGrid';

export const dynamic = 'force-dynamic';

export default async function CollectionPage({
  params,
}: {
  params: { id: string };
}) {
  const resolved = await getCollectionWithArticles(params.id);
  if (!resolved) return notFound();
  const { collection, articles } = resolved;

  return (
    <main className="bg-background">
      <header className="border-b border-primary-100">
        <div className="relative aspect-[16/7] w-full bg-primary-50/40">
          <Image
            src={collection.coverImageUrl}
            alt={collection.title}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary-900/70 via-primary-900/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-screen-xl px-4 py-8 text-white sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">
              編集チーム特集
            </p>
            <h1 className="mt-1 text-[28px] font-bold leading-[1.2] tracking-tight sm:text-[40px]">
              {collection.title}
            </h1>
            {collection.subtitle ? (
              <p className="mt-1 text-[14px] opacity-85">{collection.subtitle}</p>
            ) : null}
          </div>
        </div>
        <div className="mx-auto max-w-screen-md px-4 py-8 sm:px-6">
          <p className="text-[12px] font-medium text-foreground/60">
            キュレーション：
            <span className="text-foreground">{collection.curatorName}</span>
            <span className="ml-2 text-foreground/40">／ {collection.curatorRole}</span>
          </p>
          {collection.intro ? (
            <p className="mt-4 whitespace-pre-line text-[16px] leading-[1.85] text-neutral-700">
              {collection.intro}
            </p>
          ) : null}
        </div>
      </header>

      <section className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6">
        <h2 className="mb-5 text-[20px] font-bold tracking-tight">
          ピックアップ記事（{articles.length}本）
        </h2>
        <ArticleGrid articles={articles} />
      </section>
    </main>
  );
}
