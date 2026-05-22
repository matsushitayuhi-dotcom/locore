import Link from 'next/link';
import { Logo } from './Logo';

/**
 * サイト全体のフッター。
 *
 * リンク先は全て実在ページにつながっている (旧版にあった
 * /writers/wr_junko モック直書きや href="#" は廃止)。
 * 法務 4 文書は /legal/* 配下に新設。
 */
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-surface-muted/40">
      <div className="mx-auto grid max-w-screen-xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <Link href="/" aria-label="Locore ホームへ">
            <Logo variant="wordmark" height={26} />
          </Link>
          <p className="mt-3 text-[13px] leading-relaxed text-foreground/60">
            在外邦人がつくる、もう一段深い旅。<br />
            Quiet Premium / Editorial First / Map as Stage.
          </p>
        </div>
        <FooterColumn
          title="サービス"
          links={[
            { href: '/explore', label: '旅行者ホーム' },
            { href: '/expat', label: '駐在員ホーム' },
            { href: '/articles', label: '記事を読む' },
            { href: '/map', label: 'マップ' },
          ]}
        />
        <FooterColumn
          title="参加する"
          links={[
            { href: '/founders', label: 'Founders 枠（先着50人）' },
            { href: '/become-writer', label: '駐在員として参加' },
            { href: '/residents', label: '駐在員を探す' },
            { href: '/board', label: '新着ニュース' },
          ]}
        />
        <FooterColumn
          title="運営・サポート"
          links={[
            { href: '/about', label: 'Locore とは' },
            { href: '/contact', label: 'お問い合わせ' },
            { href: '/legal/terms', label: '利用規約' },
            { href: '/legal/privacy', label: 'プライバシー' },
            { href: '/legal/commercial', label: '特定商取引法' },
            { href: '/legal/cookies', label: 'Cookie ポリシー' },
          ]}
        />
      </div>
      <div className="border-t border-border/60 px-4 py-4 text-center text-[11px] text-foreground/40 sm:px-6">
        © Locore Inc. {new Date().getFullYear()} — Built with care from Tokyo, Paris, NYC.
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/50">
        {title}
      </p>
      <ul className="space-y-2 text-[13px] text-foreground/70">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="transition hover:text-foreground">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
