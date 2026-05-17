import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { requireEditor } from '@/lib/auth/require-user';
import { AdminSidebar } from './_components/AdminSidebar';

/**
 * Admin 全ページ共通レイアウト。
 *
 * - editor ロール限定
 * - 左固定サイドバー (デスクトップ) / hamburger (モバイル)
 * - 既存の SiteHeader/SiteFooter/BottomNav は root layout から継承
 * - admin の中の各ページは AdminPageHeader を冒頭に置いてパンくず + タイトル
 *
 * 未ログイン → /auth/login
 * editor ではない → /  (一般ホーム)
 */

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const editor = await requireEditor();
  if (!editor) {
    // requireEditor は未ログイン時に /auth/login へ redirect 済み。
    // ここに来るのは「ログインしてるが editor 権限が無い」ケース。
    redirect('/');
  }

  return (
    <div className="bg-background">
      <div className="mx-auto flex max-w-screen-2xl lg:gap-0">
        <AdminSidebar />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
