'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, ShieldCheck } from 'lucide-react';
import { ADMIN_NAV } from '../_lib/nav';

/**
 * Admin 専用サイドバー。
 *
 * - デスクトップ: 左に固定表示 (lg:block)
 * - モバイル/タブレット: 上部に hamburger、押すと overlay で展開
 * - アクティブ項目: 左に terracotta バー + 背景薄塗り
 * - stub のページは「準備中」バッジ
 */

export function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/*
        モバイル: 右下に浮く mini-FAB だけ。
        以前は sticky top に「管理メニュー」+「Admin」表記の帯が出ていたが、
        SiteHeader 直下にもう 1 段帯ができてスマホで縦スペースを圧迫していた
        (UAT 指摘「左側の管理メニューとadminの表記が邪魔」)。
        FAB なら本文を一切食わない。
      */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="管理メニューを開く"
        className="fixed bottom-20 right-4 z-30 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-[12px] font-bold text-background shadow-lg ring-1 ring-border lg:hidden"
      >
        <Menu className="h-4 w-4" />
        Admin
      </button>

      {/* デスクトップ: 固定サイドバー */}
      <aside
        className="hidden lg:sticky lg:top-[3.5rem] lg:block lg:h-[calc(100vh-3.5rem)] lg:w-60 lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-border lg:bg-card"
        aria-label="管理ナビゲーション"
      >
        <SidebarBody pathname={pathname} onNavigate={() => {}} />
      </aside>

      {/* モバイル: 全画面オーバーレイドロワー */}
      {open ? (
        <div
          className="fixed inset-0 z-[200] flex lg:hidden"
          aria-modal="true"
          role="dialog"
        >
          <div
            className="flex-1 bg-neutral-900/40"
            onClick={() => setOpen(false)}
            aria-label="閉じる"
          />
          <div className="flex h-full w-[280px] flex-col bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.18em] text-primary-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Locore Admin
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 hover:bg-muted"
                aria-label="閉じる"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarBody
                pathname={pathname}
                onNavigate={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SidebarBody({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <nav className="space-y-5 px-3 py-5">
      <div className="hidden px-2 lg:block">
        <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary-300">
          <ShieldCheck className="h-3 w-3" />
          Locore Admin
        </p>
        <p className="mt-0.5 text-[10px] text-foreground/45">
          editor 専用
        </p>
      </div>

      {ADMIN_NAV.map((section) => (
        <div key={section.label}>
          <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/45">
            {section.label}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== '/admin' &&
                  item.href !== '/calendar' &&
                  pathname.startsWith(`${item.href}/`));
              const isStub = item.status === 'stub';
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={
                      'group flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition ' +
                      (isActive
                        ? 'bg-primary-500/10 font-semibold text-primary-300'
                        : 'text-foreground/75 hover:bg-muted hover:text-foreground') +
                      ' relative'
                    }
                  >
                    {isActive ? (
                      <span
                        aria-hidden
                        className="absolute -left-1 top-1.5 h-5 w-[3px] rounded-r-full bg-primary-500"
                      />
                    ) : null}
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {isStub ? (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/55">
                        準備中
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="border-t border-border pt-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="block px-2 py-1.5 text-[12px] text-foreground/55 hover:text-foreground"
        >
          ← サイト本体に戻る
        </Link>
      </div>
    </nav>
  );
}
