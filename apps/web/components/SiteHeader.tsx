import Link from 'next/link';
import { HeaderUserArea } from './HeaderUserArea';
import { ExpertsNavLink } from './nav/ExpertsNavLink';

/**
 * グローバルトップバー。
 *
 * 2026-09 (v2): 中央ナビをエキスパート相談の導線に刷新。
 *   - エキスパートを探す (/experts) / 使い方 (/about-service) のみ
 *   - 旧コンセプトの記事 / サービス / ユーザー / 検索リンクは撤去
 *     （ページ・コンポーネント自体は残す。ナビから外して非表示にするだけ）
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
          <ExpertsNavLink />
          <Link
            href="/about-service"
            className="text-[14px] font-medium text-white/80 transition hover:text-white"
          >
            使い方
          </Link>
        </nav>

        <HeaderUserArea />
      </div>
    </header>
  );
}
