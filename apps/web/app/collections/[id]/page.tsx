import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  collections,
  getCollection,
  getArticle,
} from '../../../lib/mock';
import { ArticleGrid } from '../../../components/ArticleGrid';

export function generateStaticParams() {
  return collections.map((c) => ({ id: c.id }));
}

export default function CollectionPage({
  params,
}: {
  params: { id: string };
}) {
  const collection = getCollection(params.id);
  if (!collection) return notFound();
  const articles = collection.articleIds
    .map(getArticle)
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  return (
    <main className="bg-background">
      <header className="border-b border-border">
        <div className="relative aspect-[16/7] w-full bg-muted">
          <Image
            src={collection.coverImageUrl}
            alt={collection.title}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/65 via-neutral-900/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-screen-xl px-4 py-8 text-white sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">
              編集チーム特集
            </p>
            <h1
              className="mt-1 text-[28px] font-semibold leading-[1.2] tracking-tight sm:text-[40px]"
              style={{
                fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
              }}
            >
              {collection.title}
            </h1>
            <p className="mt-1 text-[14px] opacity-85">{collection.subtitle}</p>
          </div>
        </div>
        <div className="mx-auto max-w-screen-md px-4 py-8 sm:px-6">
          <p className="text-[12px] font-medium text-foreground/60">
            キュレーション：<span className="text-foreground">{collection.curatorName}</span>
            <span className="ml-2 text-foreground/40">／ {collection.curatorRole}</span>
          </p>
          <p className="mt-4 text-[16px] leading-[1.95] text-foreground/80">
            {collection.intro}
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6">
        <h2
          className="mb-5 text-[20px] font-semibold tracking-tight"
          style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
        >
          ピックアップ記事（{articles.length}本）
        </h2>
        <ArticleGrid articles={articles} />
      </section>
    </main>
  );
}
