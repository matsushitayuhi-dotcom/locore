import Link from 'next/link';
import { BookOpen, Briefcase, Users, ArrowRight } from 'lucide-react';

/**
 * /explore の「3 サービス紹介」セクション。
 *
 * - ロコア トラベル: 記事 (旅程 / スポット / 写真ジャーナル)
 * - ロコア サービス: 駐在員出品 (買付 / 案内 / 撮影 / 通訳 …)
 * - ロコア コミュニティ: 在外邦人掲示板 (求人 / 住居 / 売買 …)
 *
 * 「Locore は他の旅行メディアと違って 3 つのサービスがある」を 1 セクションで伝える。
 */
const SERVICES: Array<{
  key: string;
  name: string;
  short: string;
  description: string;
  icon: typeof BookOpen;
  href: string;
  accent: string;
  tag: string;
}> = [
  {
    key: 'travel',
    name: 'ロコア トラベル',
    short: '記事を読む',
    description:
      '駐在員が書く旅程プラン・スポット紹介・写真ジャーナル。住んでいる人の輪郭で都市を見せる。',
    icon: BookOpen,
    href: '/articles',
    accent: 'bg-amber-500/15 text-amber-700',
    tag: 'SERVICE 01',
  },
  {
    key: 'service',
    name: 'ロコア サービス',
    short: 'サービスを頼む',
    description:
      '買付・案内・撮影・通訳・コンサル。現地に住む駐在員に直接頼める有償サービス。',
    icon: Briefcase,
    href: '/services',
    accent: 'bg-primary-500/15 text-primary-700',
    tag: 'SERVICE 02',
  },
  {
    key: 'community',
    name: 'ロコア コミュニティ',
    short: '在外邦人で繋がる',
    description:
      '求人・住居・売買・集まり・習い事・助け合い。同じ街に住む駐在員同士の相互扶助。',
    icon: Users,
    href: '/expat',
    accent: 'bg-blue-500/15 text-blue-700',
    tag: 'SERVICE 03',
  },
];

export function ThreeServicesIntro() {
  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-[20px] font-bold leading-tight tracking-tight sm:text-[24px]">
          ロコアでできる、3 つのこと。
        </h2>
      </div>
      <ul className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        {SERVICES.map((s) => {
          const Icon = s.icon;
          return (
            <li key={s.key}>
              <Link
                href={s.href}
                className="group flex h-full flex-col rounded-2xl bg-card p-5 ring-1 ring-border transition hover:bg-primary-500/5 hover:ring-primary-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={
                      'inline-flex h-9 w-9 items-center justify-center rounded-full ' +
                      s.accent
                    }
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/40">
                    {s.tag}
                  </span>
                </div>
                <h3 className="mt-4 text-[17px] font-bold leading-tight tracking-tight">
                  {s.name}
                </h3>
                <p className="mt-1 text-[12px] font-semibold text-primary-300">
                  {s.short}
                </p>
                <p className="mt-3 text-[13px] leading-[1.85] text-foreground/70">
                  {s.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-foreground/55 transition group-hover:text-primary-300">
                  詳しく見る
                  <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
