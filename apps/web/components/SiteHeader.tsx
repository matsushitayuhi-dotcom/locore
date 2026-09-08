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
      {/* h-14 固定 + flex-wrap 無しで、ロゴも右の CTA も shrink-0。つまり溢れたら
          折り返さず横にはみ出す（ヘッダーは layout.tsx の overflow-x-hidden の外なので
          ページ全体が横スクロールする）。320px での実測は約 289px とほぼ余裕が無いため、
          スマホだけ gap / px を詰めて 10px 強の逃げ場を作る。PC は据え置き。
          ※ CTA「無料ではじめる」の文言を伸ばすとすぐ溢れるので注意 */}
      <div className="mx-auto flex h-14 max-w-screen-xl items-center gap-3 px-4 max-sm:gap-2 max-sm:px-3 sm:gap-6 sm:px-6">
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
