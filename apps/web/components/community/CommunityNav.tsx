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
      className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
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
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition ' +
                  (on
                    ? 'bg-primary-500 text-neutral-950'
                    : 'bg-primary-500/10 text-primary-300 hover:bg-primary-500/15')
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {KIND_LABEL[k]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
