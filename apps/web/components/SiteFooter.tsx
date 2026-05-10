import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="mx-auto grid max-w-screen-xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <p
            className="text-[20px] font-semibold tracking-tight"
            style={{ fontFamily: 'var(--font-serif), var(--font-serif-jp), serif' }}
          >
            Locore
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-foreground/60">
            在外邦人がつくる、もう一段深い旅。<br />
            Quiet Premium / Editorial First / Map as Stage.
          </p>
        </div>
        <FooterColumn
          title="サービス"
          links={[
            { href: '/', label: 'フィード' },
            { href: '/map', label: 'マップ' },
            { href: '/trips', label: '旅程' },
            { href: '/library', label: 'お気に入り' },
          ]}
        />
        <FooterColumn
          title="参加する"
          links={[
            { href: '/founders', label: 'Founders 枠（先着50人）' },
            { href: '/writers/wr_junko', label: 'クリエイターとして' },
            { href: '/collections/col_paris_spring_2026', label: '特集を読む' },
          ]}
        />
        <FooterColumn
          title="運営・サポート"
          links={[
            { href: '/contact', label: 'お問い合わせ' },
            { href: '#', label: '利用規約' },
            { href: '#', label: 'プライバシー' },
            { href: '#', label: '特定商取引法' },
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
