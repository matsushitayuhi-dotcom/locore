import Link from 'next/link';
import { FileText, Shield, Receipt, Cookie, ArrowRight } from 'lucide-react';

export const metadata = {
  title: '法務情報 — Locore',
  description:
    'Locore の利用規約・プライバシーポリシー・特定商取引法に基づく表記・Cookie ポリシーを掲載しています。',
};

const DOCS = [
  {
    href: '/legal/terms',
    icon: FileText,
    title: '利用規約',
    description:
      'Locore をご利用いただく前に、皆さまとサービスの基本的な約束ごとを記載しています。',
  },
  {
    href: '/legal/privacy',
    icon: Shield,
    title: 'プライバシーポリシー',
    description:
      'お預かりする個人情報の取り扱い、第三者提供、開示請求の方法などをまとめています。',
  },
  {
    href: '/legal/commercial',
    icon: Receipt,
    title: '特定商取引法に基づく表記',
    description:
      '有料記事・サービス販売事業者として、特定商取引法に基づいて開示する事項です。',
  },
  {
    href: '/legal/cookies',
    icon: Cookie,
    title: 'Cookie ポリシー',
    description:
      'サイトの動作に必要な Cookie と、分析目的の Cookie の使い分けを記載しています。',
  },
];

export default function LegalIndexPage() {
  return (
    <article>
      <header className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
          Legal
        </p>
        <h1
          className="mt-2 text-[28px] font-bold tracking-tight sm:text-[32px]"
        >
          法務情報
        </h1>
        <p className="mt-3 max-w-prose text-[14px] leading-[1.9] text-foreground/70">
          Locore の運営に関わる法務文書を 1 箇所にまとめました。
          ご不明な点はお問い合わせフォームからご連絡ください。
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2">
        {DOCS.map((d) => {
          const Icon = d.icon;
          return (
            <li key={d.href}>
              <Link
                href={d.href}
                className="group flex h-full flex-col gap-2 rounded-xl border border-border bg-card p-5 transition hover:border-primary-300 hover:shadow-md"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-500/10 text-primary-300">
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="text-[15px] font-bold text-foreground">{d.title}</h2>
                <p className="text-[12px] leading-relaxed text-foreground/65">
                  {d.description}
                </p>
                <span className="mt-auto inline-flex items-center gap-1 text-[12px] font-semibold text-primary-300">
                  読む
                  <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
