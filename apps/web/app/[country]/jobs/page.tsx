import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CommunityDisclaimer } from '@/components/community/CommunityDisclaimer';
import { listCommunityPosts } from '@/lib/community/db';
import { getRegionsWithContent } from '@/lib/geo/region-content';
import { getCountryBySlug, SUPPORTED_COUNTRY_SLUGS } from '@/lib/geo/countrySlug';
import {
  JobsBrowser,
  type JobRegion,
  type JobListPost,
} from '../../jobs/JobsBrowser';

/**
 * /[country]/jobs — 国別の求人一覧。例: /france/jobs
 *
 * /jobs と同じく searchParams を一切読まず、サーバーは「その国の最新求人を
 * 最大 30 件」取得して静的レンダリング (revalidate=300)。フィルタは
 * JobsBrowser (client) が担当する。国は countryCode でサーバー側で絞り込む。
 */
export const revalidate = 300;

export function generateStaticParams() {
  return SUPPORTED_COUNTRY_SLUGS.map((country) => ({ country }));
}

type Props = { params: { country: string } };

export async function generateMetadata({ params }: Props) {
  const country = await getCountryBySlug(params.country);
  if (!country) return { title: '見つかりません — Locore' };
  return {
    title: `${country.nameJa}の求人 — Locore`,
    description: `${country.nameJa}（${country.nameEn}）の在住者コミュニティの求人掲示板。`,
  };
}

const CANDIDATE_REGIONS: JobRegion[] = [
  { slug: 'paris', label: 'パリ＆近郊' },
  { slug: 'lyon', label: 'リヨン' },
  { slug: 'marseille', label: 'マルセイユ' },
  { slug: 'bordeaux', label: 'ボルドー' },
  { slug: 'toulouse', label: 'トゥールーズ' },
  { slug: 'strasbourg', label: 'ストラスブール' },
  { slug: 'lille', label: 'リール' },
  { slug: 'montpellier', label: 'モンペリエ' },
  { slug: 'nantes', label: 'ナント' },
  { slug: 'rennes', label: 'レンヌ' },
];

const META_KEYS = [
  'employment_type',
  'category',
  'language_requirements',
  'remote_ok',
  'audience',
  'salary_period',
  'region_slug',
] as const;

export default async function CountryJobsPage({ params }: Props) {
  const country = await getCountryBySlug(params.country);
  if (!country) notFound();

  const [rawPosts, slugsWithContent] = await Promise.all([
    listCommunityPosts({ kind: 'job', limit: 30, countryCode: country.code }),
    getRegionsWithContent(),
  ]);

  const posts: JobListPost[] = rawPosts.map((p) => {
    const m = (p.metadata ?? {}) as Record<string, unknown>;
    const meta: Record<string, unknown> = {};
    for (const k of META_KEYS) {
      if (m[k] !== undefined) meta[k] = m[k];
    }
    return {
      id: p.id,
      title: p.title,
      photo: p.photos?.[0] ?? null,
      locationText: p.locationText,
      priceAmount: p.priceAmount,
      priceCurrency: p.priceCurrency,
      priceUnit: p.priceUnit,
      createdAt: p.createdAt,
      expiresAt: p.expiresAt,
      meta: meta as JobListPost['meta'],
    };
  });

  const regions = CANDIDATE_REGIONS.filter((r) => slugsWithContent.has(r.slug));

  return (
    <main className="mx-auto max-w-screen-lg px-4 pb-12 pt-4 sm:px-6">
      <div className="mb-3">
        <Link
          href={`/${params.country}/community`}
          className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {country.nameJa}トップ
        </Link>
      </div>

      <h1 className="mb-1 text-[20px] font-bold leading-tight tracking-tight sm:text-[24px]">
        {country.nameJa}の求人
      </h1>

      <div className="mt-3">
        <Suspense fallback={<div className="min-h-[40vh]" />}>
          <JobsBrowser posts={posts} regions={regions} />
        </Suspense>
      </div>

      <details className="mt-8 rounded-lg border border-border bg-card text-[12px] text-foreground/65">
        <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-semibold text-foreground/55">
          ⚠️ ご利用上の注意
        </summary>
        <div className="border-t border-border p-3">
          <CommunityDisclaimer kind="job" />
        </div>
      </details>
    </main>
  );
}
