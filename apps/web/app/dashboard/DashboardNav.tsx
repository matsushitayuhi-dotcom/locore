'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * エキスパートのマイページの左ナビ（docs/expert-dashboard-design.md §2）。
 * 設定ページ群を「日常 → 出品 → 見せ方 → その他」の順に並べ直したもの。
 * /settings 配下のページは従来の SettingsNav のまま（そちらの先頭にダッシュボードへの導線を置く）。
 */

type Item = { href: string; label: string; badge?: number; match?: string };
type Group = { title?: string; items: Item[] };

export function DashboardNav({
  displayName,
  subtitle,
  avatarUrl,
  pendingRequests,
  unreadMessages,
}: {
  displayName: string;
  subtitle: string | null;
  avatarUrl: string | null;
  pendingRequests: number;
  unreadMessages: number;
}) {
  const pathname = usePathname() ?? '/';
  const groups: Group[] = [
    {
      items: [
        { href: '/dashboard', label: 'ダッシュボード', match: '/dashboard' },
        { href: '/bookings?tab=received', label: '相談リクエスト', badge: pendingRequests },
        { href: '/bookings', label: '予定・履歴', match: '/bookings' },
        { href: '/chat', label: 'メッセージ', badge: unreadMessages, match: '/chat' },
      ],
    },
    {
      title: '出品',
      items: [
        { href: '/settings/services', label: '相談メニュー・プラン', match: '/settings/services' },
        { href: '/settings/availability', label: '空き時間', match: '/settings/availability' },
      ],
    },
    {
      title: '見せ方',
      items: [
        { href: '/settings/profile', label: 'プロフィール', match: '/settings/profile' },
        { href: '/settings/profile#sns', label: '発信・メディア' },
        { href: '/settings/verification', label: '在籍確認・資格', match: '/settings/verification' },
        { href: '/settings', label: '公開ステータス' },
      ],
    },
    {
      title: 'その他',
      items: [
        { href: '/settings/account', label: '通知・アカウント', match: '/settings/account' },
      ],
    },
  ];
  return (
    <nav aria-label="マイページ" className="md:sticky md:top-24 md:h-fit">
      <div className="mb-3 flex items-center gap-2.5 px-1">
        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-neutral-900 text-[15px] font-bold text-primary-500">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            displayName.charAt(0)
          )}
        </div>
        <div className="min-w-0">
          <b className="block truncate text-[14px]">{displayName}</b>
          {subtitle ? <small className="block truncate text-[11px] text-neutral-500">{subtitle}</small> : null}
        </div>
      </div>
      {groups.map((g, gi) => (
        <div key={gi} className="mb-2">
          {g.title ? (
            <p className="mb-1 mt-3 px-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">{g.title}</p>
          ) : null}
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const active = it.match ? (it.match === '/settings' ? pathname === '/settings' : pathname === it.match || pathname.startsWith(it.match + '/')) : false;
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    aria-current={active ? 'page' : undefined}
                    className={
                      'flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition ' +
                      (active ? 'bg-neutral-900 font-bold text-white' : 'text-neutral-700 hover:bg-muted hover:text-foreground')
                    }
                  >
                    <span className="flex-1">{it.label}</span>
                    {it.badge ? (
                      <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary-500 px-1.5 text-[10px] font-extrabold text-neutral-950">
                        {it.badge > 99 ? '99+' : it.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
