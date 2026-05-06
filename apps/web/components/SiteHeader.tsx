import Link from 'next/link';
import { Avatar, AvatarFallback } from '@locore/ui';
import { Compass, MapIcon, LayoutList, Sparkles } from '@locore/ui/icons';

const NAV = [
  { href: '/', label: 'フィード', icon: Compass },
  { href: '/map', label: 'マップ', icon: MapIcon },
  { href: '/trips', label: '旅程', icon: LayoutList },
  { href: '/collections/col_paris_spring_2026', label: '特集', icon: Sparkles },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="font-serif text-[22px] font-semibold tracking-tight text-foreground"
          style={{ fontFamily: 'var(--font-serif), var(--font-serif-jp), serif' }}
        >
          Locore
          <span className="ml-1 align-top text-[10px] font-medium uppercase tracking-[0.2em] text-foreground/40">
            β
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-5 text-sm md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-foreground/70 transition hover:text-foreground"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/founders"
            className="hidden rounded-full border border-secondary-500/40 bg-secondary-50 px-3 py-1.5 text-xs font-medium text-secondary-700 transition hover:bg-secondary-50/70 sm:inline-flex"
          >
            Founders 枠 →
          </Link>
          <Link href="/writers/wr_junko" aria-label="プロフィールへ">
            <Avatar size="sm" className="ring-1 ring-border">
              <AvatarFallback>J</AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>

      {/* Mobile nav strip */}
      <nav className="flex gap-3 overflow-x-auto border-t border-border/60 px-4 py-2 text-[13px] md:hidden">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="whitespace-nowrap rounded-full border border-border/60 bg-card px-3 py-1 text-foreground/70"
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
