'use client';

import { useState, type ReactNode } from 'react';

/**
 * /about-service（v7）の「相談する（ユーザー）｜相談にのる（エキスパート）」タブ。
 *
 * 左のヘアラインタイムライン（rail）はパネルの外側に 1 本だけ置くので、
 * タブを切り替えても線は連続し、高さはパネル内容に自動追従する
 * （mockups/v2/about-service-v7.html の .tl / .rail 構造）。
 * パネルの中身はサーバー側で組んで ReactNode で受け取り、ここは state 1 個。
 */
export function AboutHowTabs({
  userPanel,
  expertPanel,
}: {
  userPanel: ReactNode;
  expertPanel: ReactNode;
}) {
  const [tab, setTab] = useState<'user' | 'expert'>('user');

  const btnCls = (on: boolean) =>
    'rounded-full px-5 py-2.5 text-[13px] font-bold transition sm:px-7 sm:text-[14px] ' +
    (on
      ? 'bg-neutral-900 text-white'
      : 'bg-transparent text-neutral-500 hover:text-foreground');

  return (
    <>
      <div
        role="tablist"
        aria-label="使い方の切り替え"
        className="mx-auto mt-[26px] flex w-max max-w-full rounded-full border border-border bg-muted p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'user'}
          onClick={() => setTab('user')}
          className={btnCls(tab === 'user')}
        >
          相談する（ユーザー）
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'expert'}
          onClick={() => setTab('expert')}
          className={btnCls(tab === 'expert')}
        >
          相談にのる（エキスパート）
        </button>
      </div>

      {/* 左タイムライン軸: rail 40px + gap 24px（モバイル 12px + 14px）。
          線は 1px 連続で上下端フェード、上端ライムノード・下端グレードット */}
      <div className="mt-14 grid grid-cols-[12px_1fr] gap-x-3.5 sm:grid-cols-[40px_1fr] sm:gap-x-6">
        <div className="relative" aria-hidden>
          <span className="absolute bottom-0 left-[5px] top-0 w-px bg-[linear-gradient(to_bottom,transparent,var(--color-neutral-200)_34px,var(--color-neutral-200)_calc(100%-34px),transparent)] sm:left-[19px]" />
          <span className="absolute left-[5px] top-5 h-[9px] w-[9px] -translate-x-1/2 rounded-full bg-primary-500 ring-4 ring-primary-100 sm:left-[19px]" />
          <span className="absolute bottom-5 left-[5px] h-[7px] w-[7px] -translate-x-1/2 rounded-full bg-border-strong sm:left-[19px]" />
        </div>
        <div>
          <div hidden={tab !== 'user'}>{userPanel}</div>
          <div hidden={tab !== 'expert'}>{expertPanel}</div>
        </div>
      </div>
    </>
  );
}
