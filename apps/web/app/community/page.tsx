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
  CalendarDays,
  type LucideIcon,
} from 'lucide-react';
import {
  COMMUNITY_KINDS,
  KIND_LABEL,
  KIND_DESCRIPTION,
  KIND_BASE_PATH,
  type CommunityKind,
} from '@/lib/community/constants';

export const revalidate = 300;

export const metadata = {
  title: 'コミュニティ — Locore',
  description:
    '同じ街に住む日本人とつながる掲示板。求人・住居・売買・集まり・習い事・助け合い、新着ニュースとイベント。',
};

const KIND_ICON: Record<CommunityKind, LucideIcon> = {
  job: Briefcase,
  apartment: HomeIcon,
  marketplace: ShoppingBag,
  group: Users,
  lesson: GraduationCap,
  mutual_aid: HandHelping,
};

/**
 * /community — コミュニティのハブ（カテゴリ掲示板の入口）。
 * 各カテゴリは国フィルタ付きのグローバル一覧（/jobs?country= 等）。
 */
export default function CommunityHubPage() {
  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-700">
            Community
          </p>
          <h1 className="mt-2 text-[26px] font-bold leading-tight tracking-tight sm:text-[34px]">
            同じ街の人と、つながる
          </h1>
          <p className="mt-3 text-[13px] leading-[1.85] text-foreground/65 sm:text-[14px]">
            求人・住居・売買・集まり・習い事・助け合い。渡航前の不安から、
            住んでからの困りごとまで、同じ街に住む日本人どうしで交換できる掲示板です。
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
        </div>

        {/* 掲示板・カレンダー */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4">
          <Link
            href="/board"
            className="group flex items-center gap-2.5 rounded-2xl bg-card p-5 ring-1 ring-border transition hover:-translate-y-0.5 hover:ring-primary-300"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-primary-300">
              <Megaphone className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-[15px] font-bold tracking-tight">
                掲示板・新着
              </span>
              <span className="text-[12px] text-foreground/60">
                在住者どうしのお知らせ・相談
              </span>
            </span>
            <ArrowRight className="ml-auto h-4 w-4 text-foreground/30 transition group-hover:translate-x-0.5 group-hover:text-primary-300" />
          </Link>
          <Link
            href="/calendar"
            className="group flex items-center gap-2.5 rounded-2xl bg-card p-5 ring-1 ring-border transition hover:-translate-y-0.5 hover:ring-primary-300"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-primary-300">
              <CalendarDays className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-[15px] font-bold tracking-tight">
                イベントカレンダー
              </span>
              <span className="text-[12px] text-foreground/60">
                現地のイベント・予定
              </span>
            </span>
            <ArrowRight className="ml-auto h-4 w-4 text-foreground/30 transition group-hover:translate-x-0.5 group-hover:text-primary-300" />
          </Link>
        </div>
      </div>
    </main>
  );
}
