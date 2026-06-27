'use client';

import Link from 'next/link';
import { UserMenu } from './auth/UserMenu';
import { SideMenu } from './SideMenu';
import { useViewer } from './viewer/ViewerProvider';

/**
 * ヘッダー右側のログイン依存パーツ（アバター or ログインボタン + サイドメニュー）。
 *
 * SiteHeader を静的化するために、認証状態に依存する部分だけをこのクライアント
 * コンポーネントに切り出した。状態は ViewerProvider (/api/me) から取得する。
 *
 * 初回（loading 中・未ログイン）はログインボタンを表示し、取得後にアバターへ
 * 差し替わる。クローラやキャッシュ済み HTML は常に未ログイン状態を見るため、
 * ページ自体は誰に対しても同一 HTML となりキャッシュ可能。
 */
export function HeaderUserArea() {
  const { user, unreadChatCount, isWriter } = useViewer();

  return (
    <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
      {user ? (
        <UserMenu
          user={{
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            role: user.role,
          }}
        />
      ) : (
        <>
          <Link
            href="/auth/login"
            className="hidden text-[14px] font-medium text-white/85 transition hover:text-white sm:inline"
          >
            ログイン
          </Link>
          <Link
            href="/auth/signup?redirect_to=%2Farticles"
            className="inline-flex items-center rounded-full bg-primary-500 px-3.5 py-1.5 text-[13px] font-bold text-neutral-950 transition hover:bg-primary-400 active:scale-[0.98]"
          >
            無料ではじめる
          </Link>
        </>
      )}

      <SideMenu
        viewerLoggedIn={!!user}
        isWriter={isWriter}
        unreadChatCount={unreadChatCount}
      />
    </div>
  );
}
