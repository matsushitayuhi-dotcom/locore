import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Briefcase,
  Home as HomeIcon,
  ShoppingBag,
  Users,
  GraduationCap,
  HandHelping,
  Megaphone,
  type LucideIcon,
} from 'lucide-react';
import {
  COMMUNITY_KINDS,
  KIND_LABEL,
  KIND_DESCRIPTION,
  KIND_BASE_PATH,
  type CommunityKind,
} from '@/lib/community/constants';
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
    title: `${country.nameJa}のコミュニティ — Locore`,
    description: `${country.nameJa}に住む日本人どうしの掲示板。求人・住居・売買・集まり・習い事・助け合い。`,
  };
}

const KIND_ICON: Record<CommunityKind, LucideIcon> = {
  job: Briefcase,
  apartment: HomeIcon,
  marketplace: ShoppingBag,
  group: Users,
  lesson: GraduationCap,
  mutual_aid: HandHelping,
};

/** 国別コミュニティのハブ (/[country]/community)。例: /france/community */
export default async function CountryCommunityPage({ params }: Props) {
  const country = await getCountryBySlug(params.country);
  if (!country) notFound();

  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
            {country.nameEn} · Community
          </p>
          <h1 className="mt-2 text-[26px] font-bold leading-tight tracking-tight sm:text-[34px]">
            {country.nameJa}のコミュニティ
          </h1>
          <p className="mt-3 text-[13px] leading-[1.85] text-foreground/65 sm:text-[14px]">
            同じ街に住む日本人とつながり、求人・住居・暮らしの情報を交換できる掲示板。
            渡航前の不安から、住んでからの困りごとまで。
          </p>
        </header>

        {/* カテゴリ */}
        <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
          {COMMUNITY_KINDS.map((kind) => {
            const Icon = KIND_ICON[kind];
            return (
              <Link
                key={kind}
                href={KIND_BASE_PATH[kind]}
                className="group flex flex-col gap-2 rounded-2xl bg-card p-5 ring-1 ring-border transition hover:-translate-y-0.5 hover:ring-primary-300"
              >
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-primary-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-[17px] font-bold tracking-tight">
                    {KIND_LABEL[kind]}
                  </span>
                  <ArrowRight className="ml-auto h-4 w-4 text-foreground/30 transition group-hover:translate-x-0.5 group-hover:text-primary-300" />
                </div>
                <p className="text-[12.5px] leading-[1.7] text-foreground/60">
                  {KIND_DESCRIPTION[kind]}
                </p>
              </Link>
            );
          })}

          {/* 掲示板 (新着ニュース) */}
          <Link
            href="/board"
            className="group flex flex-col gap-2 rounded-2xl bg-card p-5 ring-1 ring-border transition hover:-translate-y-0.5 hover:ring-primary-300"
          >
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-primary-300">
                <Megaphone className="h-5 w-5" />
              </span>
              <span className="text-[17px] font-bold tracking-tight">掲示板</span>
              <ArrowRight className="ml-auto h-4 w-4 text-foreground/30 transition group-hover:translate-x-0.5 group-hover:text-primary-300" />
            </div>
            <p className="text-[12.5px] leading-[1.7] text-foreground/60">
              在住者どうしの新着ニュース・お知らせ・ちょっとした相談。
            </p>
          </Link>
        </div>

        {/* 記事 / サービスへの導線 */}
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          <Link
            href={`/${params.country}/articles`}
            className="flex items-center justify-between gap-3 rounded-2xl bg-primary-500/10 px-5 py-4 ring-1 ring-border transition hover:ring-primary-300"
          >
            <span className="text-[14px] font-bold">
              {country.nameJa}の記事を読む
            </span>
            <ArrowRight className="h-4 w-4 text-primary-300" />
          </Link>
          <Link
            href={`/${params.country}/services`}
            className="flex items-center justify-between gap-3 rounded-2xl bg-primary-500/10 px-5 py-4 ring-1 ring-border transition hover:ring-primary-300"
          >
            <span className="text-[14px] font-bold">
              {country.nameJa}のサービスを探す
            </span>
            <ArrowRight className="h-4 w-4 text-primary-300" />
          </Link>
        </div>
      </div>
    </main>
  );
}
