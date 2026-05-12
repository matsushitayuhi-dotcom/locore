'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage, getInitials } from '@locore/ui';

type Props = {
  user: {
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: string;
  };
};

/**
 * ヘッダー右側のアバター + ドロップダウンメニュー。
 * ログアウトは /auth/logout への POST フォーム submit で行う。
 */
export function UserMenu({ user }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const initials = getInitials(user.displayName ?? user.email ?? 'U');
  const isWriter = user.role === 'resident_writer' || user.role === 'editor';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Avatar size="sm" className="ring-1 ring-border">
          {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-md border border-border bg-card text-[13px] shadow-md"
        >
          <div className="border-b border-border px-3 py-2">
            <p className="truncate font-medium text-foreground">
              {user.displayName ?? 'ユーザー'}
            </p>
            <p className="truncate text-[11px] text-foreground/55">{user.email}</p>
          </div>

          <ul className="py-1">
            <MenuItem href="/settings/profile" onSelect={() => setOpen(false)}>
              プロフィール
            </MenuItem>
            <MenuItem href="/settings/notifications" onSelect={() => setOpen(false)}>
              通知設定
            </MenuItem>
            <MenuItem href="/settings/account" onSelect={() => setOpen(false)}>
              アカウント
            </MenuItem>
            {isWriter ? (
              <MenuItem href="/writer/articles" onSelect={() => setOpen(false)}>
                クリエイターダッシュボード
              </MenuItem>
            ) : (
              <MenuItem href="/become-writer" onSelect={() => setOpen(false)}>
                クリエイターになる
              </MenuItem>
            )}
          </ul>

          <form
            method="post"
            action="/auth/logout"
            className="border-t border-border"
          >
            <button
              type="submit"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
            >
              ログアウト
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  href,
  onSelect,
  children,
}: {
  href: string;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        role="menuitem"
        href={href}
        onClick={onSelect}
        className="block px-3 py-2 text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
      >
        {children}
      </Link>
    </li>
  );
}
