import Link from 'next/link';
import { HeaderUserArea } from './HeaderUserArea';
import { ServicesNavLink } from './nav/ServicesNavLink';
import { ArticlesNavLink } from './nav/ArticlesNavLink';
import { ResidentsNavLink } from './nav/ResidentsNavLink';
import { SearchNavLink } from './nav/SearchNavLink';

/**
 * グローバルトップバー。
 *
 * 2026-06: ランディング (/) のダークナビとデザインを統一。
 *   - 背景はダーク (#0b0d13)、ロゴは "Lo<span>core</span>"（core がライム）
 *   - 中央ナビ: 記事 / サービス / コミュニティ / 検索（ランディングと同一の導線）
 *   - 高さは h-14 (56px) を維持（CommunityNav 等の sticky オフセットが依存）
 *
 * 認証依存パーツは HeaderUserArea (client, /api/me) に切り出し、本体は cookie を
 * 読まない静的シェルのままにして公開ページの Edge Cache を有効化する。
 */
export function SiteHeader() {
  return (
    <header className="w-full border-b border-white/10 bg-[#0b0d13]">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Link
          href="/"
          className="shrink-0 text-[22px] font-bold tracking-tight text-white"
          aria-label="Locore ホームへ"
        >
          Lo<span className="text-primary-500">core</span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-7 md:flex">
          <ArticlesNavLink />
          <ServicesNavLink />
          <ResidentsNavLink />
          <SearchNavLink />
        </nav>

        <HeaderUserArea />
      </div>
    </header>
  );
}
