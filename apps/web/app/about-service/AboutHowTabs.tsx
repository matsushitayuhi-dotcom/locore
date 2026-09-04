'use client';

import { useState, type ReactNode } from 'react';

/**
 * /about-service の「相談する｜相談にのる（エキスパート）」ピル型タブ。
 * パネルの中身はサーバー側で組んで ReactNode で受け取り、ここは state 1 個の
 * 表示切替だけを担う（mockups/v2/about-service-v2.html の swTab 相当）。
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
    'rounded-full px-[26px] py-2 text-[13.5px] font-bold transition sm:px-[26px] ' +
    (on
      ? 'bg-primary-500 text-neutral-950 shadow-xs'
      : 'bg-transparent text-neutral-500 hover:text-foreground');

  return (
    <>
      <div
        role="tablist"
        aria-label="使い方の切り替え"
        className="mx-auto mt-[26px] flex w-max max-w-full rounded-full border border-border bg-card p-1 shadow-xs"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'user'}
          onClick={() => setTab('user')}
          className={btnCls(tab === 'user')}
        >
          相談する
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
      <div className="mt-9" hidden={tab !== 'user'}>
        {userPanel}
      </div>
      <div className="mt-9" hidden={tab !== 'expert'}>
        {expertPanel}
      </div>
    </>
  );
}
