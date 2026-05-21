import Link from 'next/link';
import { Plus } from 'lucide-react';

/**
 * コミュニティ 6 ページ共通の「投稿する」Floating Action Button。
 *
 * - スマホ: 画面右下に固定 (BottomNav の上)
 * - PC (md+): 同じ位置だが、ホバーで横にラベル展開
 * - aria-label に投稿動作を入れて読み上げ対応
 */
export function PostFab({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={
        'fixed bottom-[88px] right-4 z-30 inline-flex items-center gap-1.5 rounded-full bg-primary-700 px-4 py-3 ' +
        'text-[13px] font-bold text-white shadow-lg ring-2 ring-background transition ' +
        'hover:bg-primary-500 active:scale-95 md:bottom-6'
      }
      style={{
        // BottomNav (h-14 + safe-area) の上に重ねる
        marginBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <Plus className="h-5 w-5" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
