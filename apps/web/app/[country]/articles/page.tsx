import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { FloatingMapButton } from '@/components/FloatingMapButton';
import { ArticleJournal } from '@/components/articles/ArticleJournal';
import { getPublishedDbArticles } from '@/lib/articles/published';
import { getCountryBySlug, SUPPORTED_COUNTRY_SLUGS } from '@/lib/geo/countrySlug';

export const revalidate = 300;

export function generateStaticParams() {
  return SUPPORTED_COUNTRY_SLUGS.map((country) => ({ country }));
}

type Props = { params: { country: string } };

export async function generateMetadata({ params }: Props) {
  const country = await getCountryBySlug(params.country);
  if (!country) return { title: '見つかりません — Locore' };
  return {
    title: `${country.nameJa}の記事 — Locore`,
    description: `${country.nameJa}（${country.nameEn}）に住む人が書く、暮らし目線の一次情報。`,
  };
}

/** 国別の記事一覧 (/[country]/articles)。例: /france/articles */
export default async function CountryArticlesPage({ params }: Props) {
  const country = await getCountryBySlug(params.country);
  if (!country) notFound();

  const articles = await getPublishedDbArticles(200, undefined, country.code);

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-2">
        <Link
          href={`/${params.country}/community`}
          className="inline-flex items-center gap-1 font-mono text-[12px] font-medium text-primary-700 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {country.nameJa}トップ
        </Link>
      </div>

      <ArticleJournal articles={articles} moreHref="/articles" />

      <FloatingMapButton />
    </main>
  );
}
