import Link from 'next/link';
import { Briefcase, Home, ShoppingBag, Users, GraduationCap, Hand } from 'lucide-react';
import {
  COMMUNITY_KINDS,
  KIND_LABEL,
  KIND_BASE_PATH,
  type CommunityKind,
} from '@/lib/community/constants';

const ICONS: Record<CommunityKind, typeof Briefcase> = {
  job: Briefcase,
  apartment: Home,
  marketplace: ShoppingBag,
  group: Users,
  lesson: GraduationCap,
  mutual_aid: Hand,
};

/**
 * コミュニティ系 6 ページ共通の上部サブナビ。
 * 各 kind ページの上部に置いて、隣接カテゴリへ移動しやすくする。
 */
export function CommunityNav({ active }: { active: CommunityKind }) {
  return (
    <nav
      aria-label="コミュニティ"
      // sticky top-14 (SiteHeader h-14 = 56px の真下)。
      // CompactFilterBar は更にこの下 (top-[6.5rem] = 104px) に積み重なる。
      // touch-action: pan-x で横スワイプ時の縦方向のぐらつきを防止。
      // スマホは nav 自身の py を 6px→3px に詰め、その分をピルの min-h (36px) に回す。
      // 3*2 + 36 = 42px で現行の nav 高さと同じなので、下に積む
      // CompactFilterBar / JobsBrowser の top-[100px] は影響を受けない。
      className="sticky top-14 z-20 -mx-4 overflow-x-auto bg-background/95 px-4 py-1.5 backdrop-blur max-sm:py-[3px] sm:mx-0 sm:px-0"
      style={{ touchAction: 'pan-x' }}
    >
      {/* スマホでは 6 タブ合計 ~472px > 親 371px で常に横スクロール頼みだった。
          アイコンを畳み左右パディングを詰めて 402px なら 1 行に収める。
          320px では収まらないので overflow-x-auto は保険として残す。
          sticky top-14 / CompactFilterBar の top-[100px] がズレないよう、
          nav の外形高さ (42px) は据え置いたまま、内訳だけ
          py 6px+ピル 30px → py 3px+ピル 36px に組み替えている。 */}
      <ul className="flex gap-2 sm:flex-wrap">
        {COMMUNITY_KINDS.map((k) => {
          const Icon = ICONS[k];
          const on = k === active;
          return (
            <li key={k} className="shrink-0">
              <Link
                href={KIND_BASE_PATH[k]}
                aria-current={on ? 'page' : undefined}
                className={
                  // スマホはタップ領域 36px を確保（nav の py を詰めた分で相殺）
                  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium transition max-sm:min-h-[36px] max-sm:px-2.5 ' +
                  (on
                    ? 'bg-primary-500 text-neutral-950'
                    : 'bg-primary-500/10 text-primary-300 hover:bg-primary-500/15')
                }
              >
                {/* ラベル (2 文字) だけで意味は通るので、スマホではアイコンを隠して幅を稼ぐ */}
                <Icon className="h-3.5 w-3.5 max-sm:hidden" />
                {KIND_LABEL[k]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
