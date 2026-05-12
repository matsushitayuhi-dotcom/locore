'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  Compass,
  Map as MapIcon,
  Megaphone,
  Bookmark,
  ShoppingBag,
  PenSquare,
  FileText,
  BarChart3,
  MessageCircle,
  User,
  Bell,
  Settings,
  Info,
  Heart,
} from 'lucide-react';

/**
 * グローバル左サイドメニュー。
 *
 * - ヘッダーのハンバーガーボタンで開閉
 * - 「見る」「クリエイター」「アカウント」「Locore について」の 4 セクション
 * - クリエイターセクションは isWriter のときだけ表示
 * - ナビゲーション後は自動で閉じる（pathname 変化を監視）
 * - 開いている間は body のスクロールをロック
 *
 * 親（SiteHeader）から viewerLoggedIn / isWriter を渡してもらう。
 */

type MenuItem = {
  href: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  /** active 判定用の prefix（match）*/
  matchPrefix?: string;
};

const VIEW_ITEMS: MenuItem[] = [
  { href: '/', label: '世界（行き先を選ぶ）', icon: Compass, matchPrefix: '/$' },
  {
    href: '/region/paris',
    label: 'パリのフィード',
    icon: Compass,
    matchPrefix: '/region/paris',
  },
  { href: '/map', label: 'マップ', icon: MapIcon, matchPrefix: '/map' },
  { href: '/board', label: '掲示板', icon: Megaphone, matchPrefix: '/board' },
  { href: '/library', label: 'お気に入り', icon: Bookmark, matchPrefix: '/library' },
  {
    href: '/purchases',
    label: '購入記事',
    icon: ShoppingBag,
    matchPrefix: '/purchases',
  },
  { href: '/trips', label: '旅程', icon: Heart, matchPrefix: '/trips' },
];

const WRITER_ITEMS: MenuItem[] = [
  {
    href: '/writer/articles/new',
    label: '新規投稿',
    icon: PenSquare,
    matchPrefix: '/writer/articles/new',
  },
  {
    href: '/writer/articles',
    label: '投稿記事一覧',
    icon: FileText,
    matchPrefix: '/writer/articles',
  },
  {
    href: '/writer/dashboard',
    label: '売上レポート',
    icon: BarChart3,
    matchPrefix: '/writer/dashboard',
  },
  {
    href: '/chat',
    label: 'メッセージ',
    icon: MessageCircle,
    matchPrefix: '/chat',
  },
];

const ACCOUNT_ITEMS: MenuItem[] = [
  {
    href: '/settings/profile',
    label: 'プロフィール',
    icon: User,
    matchPrefix: '/settings/profile',
  },
  {
    href: '/settings/notifications',
    label: '通知設定',
    icon: Bell,
    matchPrefix: '/settings/notifications',
  },
  {
    href: '/settings/account',
    label: 'アカウント',
    icon: Settings,
    matchPrefix: '/settings/account',
  },
];

const ABOUT_ITEMS: MenuItem[] = [
  {
    href: '/about-service',
    label: 'サービス概要',
    icon: Info,
    matchPrefix: '/about-service',
  },
];

type Props = {
  viewerLoggedIn: boolean;
  isWriter: boolean;
  /** 未読メッセージ件数（メッセージ項目横のバッジ用） */
  unreadChatCount?: number;
};

export function SideMenu({ viewerLoggedIn, isWriter, unreadChatCount = 0 }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname() ?? '/';

  // SSR では document が存在しないので、マウント後に Portal を有効化
  useEffect(() => {
    setMounted(true);
  }, []);

  // pathname が変わったら閉じる（リンククリック後）
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // 開いている間 body スクロール抑止
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Esc キーで閉じる
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="メニューを開く"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition hover:bg-primary-500/10 hover:text-primary-300"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/*
        オーバーレイ + ドロワーは React Portal で body 直下に描画する。
        親 (SiteHeader = sticky z-30) の stacking context に閉じ込められると
        BottomNav (z-40) より下に潜って下半分が隠れてしまうため。
      */}
      {mounted &&
        createPortal(
          <DrawerPanel
            open={open}
            onClose={() => setOpen(false)}
            viewerLoggedIn={viewerLoggedIn}
            isWriter={isWriter}
            unreadChatCount={unreadChatCount}
            pathname={pathname}
          />,
          document.body,
        )}
    </>
  );
}

/**
 * ドロワー本体（オーバーレイ + パネル）。document.body に portal される前提。
 */
function DrawerPanel({
  open,
  onClose,
  viewerLoggedIn,
  isWriter,
  unreadChatCount,
  pathname,
}: {
  open: boolean;
  onClose: () => void;
  viewerLoggedIn: boolean;
  isWriter: boolean;
  unreadChatCount: number;
  pathname: string;
}) {
  return (
    <>
      {open ? (
        <div
          aria-hidden
          onClick={onClose}
          className="fixed inset-0 z-[1000] bg-neutral-900/40 backdrop-blur-sm"
        />
      ) : null}

      <aside
        aria-hidden={!open}
        // h-[100dvh] = モバイル Safari の動的ビューポートにも追従。
        // safe-area-inset-bottom 分も内側で確保する。
        className={
          'fixed right-0 top-0 z-[1001] flex h-[100dvh] w-[320px] max-w-[88vw] flex-col bg-card shadow-xl transition-transform duration-200 ease-out ' +
          (open ? 'translate-x-0' : 'translate-x-full')
        }
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <Link
            href="/"
            className="inline-flex items-baseline font-semibold tracking-tight"
            style={{
              fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
            }}
            onClick={onClose}
          >
            <span className="text-[22px] bg-gradient-to-br from-primary-300 to-primary-500 bg-clip-text text-transparent">
              Locore
            </span>
            <span className="ml-1 rounded-full bg-primary-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-950">
              β
            </span>
          </Link>
          <button
            type="button"
            aria-label="メニューを閉じる"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground/60 hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <nav
          aria-label="サイトナビゲーション"
          className="flex-1 overflow-y-auto px-2 py-3"
        >
          <Section title="見る">
            {VIEW_ITEMS.map((it) => (
              <NavLink key={it.href} item={it} pathname={pathname} />
            ))}
          </Section>

          {viewerLoggedIn && isWriter ? (
            <Section title="クリエイター">
              {WRITER_ITEMS.map((it) => (
                <NavLink
                  key={it.href}
                  item={it}
                  pathname={pathname}
                  badge={it.href === '/chat' ? unreadChatCount : 0}
                />
              ))}
            </Section>
          ) : viewerLoggedIn ? (
            <Section title="クリエイター">
              <Link
                href="/become-writer"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium text-primary-300 hover:bg-primary-500/10"
              >
                <PenSquare className="h-4 w-4" />
                クリエイターになる
              </Link>
            </Section>
          ) : null}

          {viewerLoggedIn ? (
            <Section title="アカウント">
              {ACCOUNT_ITEMS.map((it) => (
                <NavLink key={it.href} item={it} pathname={pathname} />
              ))}
              <form method="post" action="/auth/logout" className="px-3 pt-1">
                <button
                  type="submit"
                  className="text-[12px] text-foreground/55 hover:text-foreground"
                >
                  ログアウト
                </button>
              </form>
            </Section>
          ) : (
            <Section title="アカウント">
              <Link
                href="/auth/login"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium text-primary-300 hover:bg-primary-500/10"
              >
                <User className="h-4 w-4" />
                ログイン
              </Link>
              <Link
                href="/auth/signup"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium text-primary-300 hover:bg-primary-500/10"
              >
                <PenSquare className="h-4 w-4" />
                サインアップ
              </Link>
            </Section>
          )}

          <Section title="Locore について">
            {ABOUT_ITEMS.map((it) => (
              <NavLink key={it.href} item={it} pathname={pathname} />
            ))}
          </Section>
        </nav>

        <footer className="border-t border-border px-4 py-3 text-[10px] text-foreground/45">
          © Locore — 在外邦人がつくる、もう一段深い旅
        </footer>
      </aside>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/45">
        {title}
      </p>
      <ul className="space-y-0.5">
        {Array.isArray(children)
          ? children.map((c, i) => <li key={i}>{c}</li>)
          : children}
      </ul>
    </div>
  );
}

function NavLink({
  item,
  pathname,
  badge = 0,
}: {
  item: MenuItem;
  pathname: string;
  badge?: number;
}) {
  const Icon = item.icon;
  const active = isActive(pathname, item);
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={
          'flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition ' +
          (active
            ? 'bg-primary-500/15 text-primary-300'
            : 'text-foreground/80 hover:bg-primary-500/10 hover:text-foreground')
        }
      >
        <Icon
          className={
            'h-4 w-4 shrink-0 ' +
            (active ? 'text-primary-300' : 'text-foreground/55')
          }
        />
        <span className="flex-1">{item.label}</span>
        {badge > 0 ? (
          <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-accent-500 px-1.5 text-[10px] font-bold leading-none text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

function isActive(pathname: string, item: MenuItem): boolean {
  const m = item.matchPrefix;
  if (!m) return pathname === item.href;
  // '/$' で完全一致（ホームのみ）
  if (m === '/$') return pathname === '/';
  return pathname.startsWith(m);
}
