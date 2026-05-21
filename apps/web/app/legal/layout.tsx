import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Shield, Receipt, Cookie } from 'lucide-react';

/**
 * /legal/* 共通レイアウト。
 *
 * 利用規約 / プライバシー / 特商法 / Cookie の 4 文書を、
 * 左固定の目次 + 中央コンテンツ で見せる。
 *
 * MOC 前提でテンプレート的に書いてあるが、見た目は「ちゃんとした
 * Web サービスの法務ページ」を意識して整えている。
 * 正式版では会社情報を含めて法務確認を受ける前提。
 */

const NAV = [
  { href: '/legal/terms', label: '利用規約', icon: FileText },
  { href: '/legal/privacy', label: 'プライバシーポリシー', icon: Shield },
  { href: '/legal/commercial', label: '特定商取引法に基づく表記', icon: Receipt },
  { href: '/legal/cookies', label: 'Cookie ポリシー', icon: Cookie },
];

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          ホームに戻る
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/55">
              法務情報
            </p>
            <ul className="space-y-1">
              {NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-foreground/75 transition hover:bg-muted hover:text-foreground"
                    >
                      <Icon className="h-3.5 w-3.5 text-foreground/45 group-hover:text-primary-300" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 rounded-md border border-border bg-card p-3 text-[11px] leading-relaxed text-foreground/65">
              <p className="font-semibold text-foreground/75">
                ご質問はお問い合わせから
              </p>
              <p className="mt-1">
                解釈で迷う点があれば、
                <Link href="/contact" className="text-primary-300 hover:underline">
                  運営チーム
                </Link>
                までお寄せください。
              </p>
            </div>
          </aside>

          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </main>
  );
}
