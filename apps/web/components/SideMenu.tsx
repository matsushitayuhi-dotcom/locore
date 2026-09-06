'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import {
  Menu,
  X,
  Search,
  Heart,
  Briefcase,
  PenSquare,
  MessageCircle,
  User,
  Bell,
  Settings,
  Info,
  BookOpen,
  CalendarCheck,
  CalendarClock,
  Inbox,
  Sparkles,
} from 'lucide-react';

/**
 * グローバル左サイドメニュー。
 *
 * - ヘッダーのハンバーガーボタンで開閉
 * - 2026-09-06 に並びを設計し直した（上ほど日常的に使うもの）:
 *     1. さがす           エキスパートを探す
 *     2. マイページ       マイ相談 / メッセージ / お気に入りのエキスパート（ログイン時）
 *     3. エキスパート向け 相談リクエスト / 相談メニュー / 空き時間 / ブログを書く（isWriter 時。
 *                         未登録のログインユーザーには「エキスパートとして参加」）
 *     4. 設定             プロフィール編集 / 通知 / アカウント / ログアウト
 *     5. Locore について  使い方 / Locore について（いちばん下）
 *   重複していた「メッセージ」「プロフィール」（エキスパート向けと設定の両方にあった）は 1 か所に。
 *   お気に入りは旧「保存ライブラリ」（記事・スポット）から「お気に入りのエキスパート」（/favorites）に。
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
  /** β版では未提供。リンクにせず「準備中」バッジ付きのグレー表示にする */
  disabled?: boolean;
};

// グローバルナビは SiteHeader 側でも出している（PC は中央 nav、モバイルは
// ここの「ナビゲーション」セクション）。PC では SideMenu はサブ機能扱いだが、
// モバイルでは唯一のナビ手段になるのでモード分岐込みで両方持つ。
//
// 旅行者: ホーム / 場所 (※ /world) / 地図 / 検索
//   - 「場所」は SideMenu からは drill-down できないので、暫定で /world に飛ばす
//     (全国一覧)。PC ヘッダの PlaceMenu で drill-down する想定。
// 駐在員: ホーム / 場所 (※ /world) / アパート / 売買 / 求人 / イベント / 習い事 / 助け合い / 検索

// 2026-09 (v2): エキスパート相談のナビに刷新。旧コンセプト（記事 / コミュニティ /
// サービス / 地図 / 保存ライブラリ）はナビから外して非表示にする（ページ自体は残す）。

/** 1. さがす */
const NAV_ITEMS: MenuItem[] = [
  {
    href: '/experts',
    label: 'エキスパートを探す',
    icon: Search,
    matchPrefix: '/experts',
  },
];

/** 2. マイページ（ログイン時） */
const USER_ITEMS: MenuItem[] = [
  {
    href: '/bookings',
    label: 'マイ相談',
    icon: CalendarCheck,
    matchPrefix: '/bookings',
  },
  {
    href: '/chat',
    label: 'メッセージ',
    icon: MessageCircle,
    matchPrefix: '/chat',
  },
  {
    href: '/favorites',
    label: 'お気に入りのエキスパート',
    icon: Heart,
    matchPrefix: '/favorites',
  },
];

/** 3. エキスパート向け（isWriter 時）。メッセージ・プロフィール編集は他セクションと重複するので置かない */
const WRITER_ITEMS: MenuItem[] = [
  {
    href: '/bookings?tab=received',
    label: '相談リクエスト',
    icon: Inbox,
  },
  {
    href: '/settings/services',
    label: '相談メニュー',
    icon: Briefcase,
    matchPrefix: '/settings/services',
  },
  {
    href: '/settings/availability',
    label: '空き時間',
    icon: CalendarClock,
    matchPrefix: '/settings/availability',
  },
  {
    href: '/writer/articles/new',
    label: 'ブログを書く',
    icon: PenSquare,
    matchPrefix: '/writer/articles/new',
  },
];

/** 4. 設定 */
const ACCOUNT_ITEMS: MenuItem[] = [
  {
    href: '/settings/profile',
    label: 'プロフィール編集',
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

/** 5. Locore について（いちばん下） */
const ABOUT_ITEMS: MenuItem[] = [
  {
    href: '/about-service',
    label: '使い方',
    icon: BookOpen,
    matchPrefix: '/about-service',
  },
  {
    href: '/about',
    label: 'Locore について',
    icon: Info,
    matchPrefix: '/about',
  },
];

type Props = {
  viewerLoggedIn: boolean;
  isWriter: boolean;
  /** 未読メッセージ件数（メッセージ項目横のバッジ用） */
  unreadChatCount?: number;
};

export function SideMenu({
  viewerLoggedIn,
  isWriter,
  unreadChatCount = 0,
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
        className="inline-flex h-11 min-h-[44px] w-11 min-w-[44px] items-center justify-center rounded-full text-white/80 transition active:scale-[0.92] hover:bg-white/10 hover:text-white"
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
        // safe-area-inset-top/bottom 分も内側で確保する (ノッチ / ホームバー被り防止)。
        className={
          'fixed right-0 top-0 z-[1001] flex h-[100dvh] w-[320px] max-w-[88vw] flex-col bg-card shadow-xl transition-transform duration-200 ease-out ' +
          (open ? 'translate-x-0' : 'translate-x-full')
        }
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
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
            className="inline-flex h-11 min-h-[44px] w-11 min-w-[44px] items-center justify-center rounded-full text-foreground/60 transition active:scale-[0.92] hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <nav
          aria-label="サイトナビゲーション"
          className="flex-1 overflow-y-auto px-2 py-3"
        >
          {/* 1. さがす（PC では SiteHeader 中央 nav と冗長だが、モバイルではここが唯一のナビ） */}
          <Section title="さがす">
            {NAV_ITEMS.map((it) => (
              <NavLink key={it.href} item={it} pathname={pathname} />
            ))}
          </Section>

          {/* 2. マイページ */}
          {viewerLoggedIn ? (
            <Section title="マイページ">
              {USER_ITEMS.map((it) => (
                <NavLink
                  key={it.href}
                  item={it}
                  pathname={pathname}
                  badge={it.href === '/chat' ? unreadChatCount : 0}
                />
              ))}
            </Section>
          ) : null}

          {/* 3. エキスパート向け */}
          {viewerLoggedIn && isWriter ? (
            <Section title="エキスパート向け">
              {WRITER_ITEMS.map((it) => (
                <NavLink key={it.href} item={it} pathname={pathname} />
              ))}
            </Section>
          ) : viewerLoggedIn ? (
            <Section title="エキスパート">
              <Link
                href="/become-writer"
                className="flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium text-primary-300 hover:bg-primary-500/10"
              >
                <Sparkles className="h-4 w-4" />
                エキスパートとして参加
              </Link>
            </Section>
          ) : null}

          {/* 4. 設定 / アカウント */}
          {viewerLoggedIn ? (
            <Section title="設定">
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
                className="flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium text-primary-300 hover:bg-primary-500/10"
              >
                <User className="h-4 w-4" />
                ログイン
              </Link>
              <Link
                href="/auth/signup?redirect_to=%2Fexperts"
                className="flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium text-primary-300 hover:bg-primary-500/10"
              >
                <Sparkles className="h-4 w-4" />
                無料ではじめる
              </Link>
            </Section>
          )}

          {/* 5. Locore について（いちばん下） */}
          <Section title="Locore について">
            {ABOUT_ITEMS.map((it) => (
              <NavLink key={it.href} item={it} pathname={pathname} />
            ))}
          </Section>
        </nav>

        <footer className="border-t border-border px-4 py-3 text-[10px] text-foreground/45">
          © Locore — 留学先の先輩に、30分から相談
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

  // β版では未提供の項目はリンクにせず、グレー表示＋「準備中」バッジで示す。
  if (item.disabled) {
    return (
      <li>
        <div
          aria-disabled
          className="flex min-h-[44px] cursor-not-allowed items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium text-foreground/35"
        >
          <Icon className="h-4 w-4 shrink-0 text-foreground/30" />
          <span className="flex-1">{item.label}</span>
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-foreground/45">
            β版準備中
          </span>
        </div>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={
          // タップ領域 44px 確保 + アプリ風 active scale
          'flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium transition active:scale-[0.98] ' +
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
