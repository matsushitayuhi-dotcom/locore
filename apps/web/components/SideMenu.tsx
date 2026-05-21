'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import {
  Menu,
  X,
  Home as HomeIcon,
  Compass,
  Map as MapIcon,
  Search,
  Briefcase,
  Building2,
  ShoppingCart,
  Users,
  GraduationCap,
  HandHelping,
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

// グローバルナビは SiteHeader 側でも出している（PC は中央 nav、モバイルは
// ここの「ナビゲーション」セクション）。PC では SideMenu はサブ機能扱いだが、
// モバイルでは唯一のナビ手段になるのでモード分岐込みで両方持つ。
//
// 旅行者: ホーム / 場所 (※ /world) / 地図 / 検索
//   - 「場所」は SideMenu からは drill-down できないので、暫定で /world に飛ばす
//     (全国一覧)。PC ヘッダの PlaceMenu で drill-down する想定。
// 駐在員: ホーム / 場所 (※ /world) / アパート / 売買 / 求人 / イベント / 習い事 / 助け合い / 検索

const TRAVELER_NAV_ITEMS: (mode: 'traveler' | 'resident' | null) => MenuItem[] = (
  mode,
) => [
  {
    href: mode === 'resident' ? '/expat' : '/explore',
    label: 'ホーム',
    icon: HomeIcon,
    matchPrefix: mode === 'resident' ? '/expat' : '/explore',
  },
  { href: '/world', label: '場所で探す', icon: Compass, matchPrefix: '/world' },
  { href: '/map', label: '地図から探す', icon: MapIcon, matchPrefix: '/map' },
  { href: '/search', label: '検索', icon: Search, matchPrefix: '/search' },
];

const RESIDENT_NAV_ITEMS: MenuItem[] = [
  { href: '/expat', label: 'ホーム', icon: HomeIcon, matchPrefix: '/expat' },
  { href: '/world', label: '場所で探す', icon: Compass, matchPrefix: '/world' },
  { href: '/apartments', label: 'アパート', icon: Building2, matchPrefix: '/apartments' },
  { href: '/marketplace', label: '売買', icon: ShoppingCart, matchPrefix: '/marketplace' },
  { href: '/jobs', label: '求人', icon: Briefcase, matchPrefix: '/jobs' },
  { href: '/groups', label: 'イベント', icon: Users, matchPrefix: '/groups' },
  { href: '/lessons', label: '習い事', icon: GraduationCap, matchPrefix: '/lessons' },
  { href: '/help', label: '助け合い', icon: HandHelping, matchPrefix: '/help' },
  { href: '/search', label: '検索', icon: Search, matchPrefix: '/search' },
];

// 旅行者モードのユーザー固有項目
const TRAVELER_USER_ITEMS: MenuItem[] = [
  {
    href: '/library',
    label: 'お気に入り',
    icon: Bookmark,
    matchPrefix: '/library',
  },
  { href: '/trips', label: '旅程', icon: Heart, matchPrefix: '/trips' },
  {
    href: '/purchases',
    label: '購入した記事',
    icon: ShoppingBag,
    matchPrefix: '/purchases',
  },
];

// 駐在員モードのユーザー固有項目。
// コミュニティ掲示板 (アパート / 売買 / 求人 / イベント / 習い事 / 助け合い) は
// 上部の「ナビゲーション」セクション (RESIDENT_NAV_ITEMS) に移したのでここには出さない。
const RESIDENT_USER_ITEMS: MenuItem[] = [
  {
    href: '/library',
    label: 'お気に入り',
    icon: Bookmark,
    matchPrefix: '/library',
  },
  {
    href: '/purchases',
    label: '購入した記事',
    icon: ShoppingBag,
    matchPrefix: '/purchases',
  },
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
  /** 現在のモード（splash 未選択なら null） */
  currentMode?: 'traveler' | 'resident' | null;
};

export function SideMenu({
  viewerLoggedIn,
  isWriter,
  unreadChatCount = 0,
  currentMode = null,
}: Props) {
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
            currentMode={currentMode}
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
  currentMode,
}: {
  open: boolean;
  onClose: () => void;
  viewerLoggedIn: boolean;
  isWriter: boolean;
  unreadChatCount: number;
  pathname: string;
  currentMode: 'traveler' | 'resident' | null;
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
            className="inline-flex items-center gap-1.5"
            onClick={onClose}
            aria-label="Locore ホームへ"
          >
            <Logo variant="wordmark" height={26} />
            <span className="rounded-full bg-primary-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-950">
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
          {/* PC では SiteHeader 中央 nav と冗長だが、モバイルではここが唯一のナビ。
              モードで内容を分岐 (新着ニュースは両モードとも撤去済み) */}
          <Section title="ナビゲーション">
            {(currentMode === 'resident'
              ? RESIDENT_NAV_ITEMS
              : TRAVELER_NAV_ITEMS(currentMode)
            ).map((it) => (
              <NavLink key={it.href} item={it} pathname={pathname} />
            ))}
          </Section>

          <Section title={currentMode === 'resident' ? '駐在員のあなたへ' : 'あなたの本棚'}>
            {(currentMode === 'resident'
              ? RESIDENT_USER_ITEMS
              : TRAVELER_USER_ITEMS
            ).map((it) => (
              <NavLink
                key={it.href}
                item={it}
                pathname={pathname}
              />
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
