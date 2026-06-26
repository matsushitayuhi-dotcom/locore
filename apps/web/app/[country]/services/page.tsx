import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { listServices, listAllTagsForServices } from '@/lib/services/list';
import { getActiveCitiesForPicker } from '@/lib/geo/countries';
import { ServicesBrowser } from '../../services/ServicesBrowser';
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
    title: `${country.nameJa}のサービス — Locore`,
    description: `${country.nameJa}の駐在員が提供する観光アテンド・通訳・買付・撮影・相談などのサービス。`,
  };
}

/** 国別のサービス一覧 (/[country]/services)。例: /france/services */
export default async function CountryServicesPage({ params }: Props) {
  const country = await getCountryBySlug(params.country);
  if (!country) notFound();

  const [{ services }, cities, allTags] = await Promise.all([
    listServices({ countryCode: country.code, limit: 200 }),
    getActiveCitiesForPicker(),
    listAllTagsForServices(),
  ]);

  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-xl px-4 py-4 sm:px-6 sm:py-8">
        <div className="mb-3">
          <Link
            href={`/${params.country}/community`}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {country.nameJa}トップ
          </Link>
        </div>
        <h1 className="mb-4 text-[20px] font-bold leading-tight tracking-tight sm:text-[24px]">
          {country.nameJa}のサービス
        </h1>

        <Suspense fallback={<div className="min-h-[50vh]" />}>
          <ServicesBrowser
            services={services}
            cities={cities}
            allTags={allTags}
          />
        </Suspense>
      </div>
    </main>
  );
}
