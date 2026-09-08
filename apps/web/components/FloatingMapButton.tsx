import Link from 'next/link';
import { MapPin } from 'lucide-react';

/**
 * 旅行者ホーム (/explore) 右下に浮かぶ「地図で見る」アイコン。
 *
 * IA リファクタ (2026-05) で「地図」グローバルタブを廃止し、
 * 地図 UI は記事領域 (/explore) に統合した。代わりに、画面右下に
 * 浮動ボタンを置いて /map に遷移する設計。
 *
 * 下部タブ（BottomNav）を廃止したので画面右下に置く。
 * ホームバーに被らないよう safe-area-inset-bottom を加算する。
 */
export function FloatingMapButton({
  /** 位置クラス。既定は画面右下。 */
  positionClassName = 'bottom-5 right-4',
}: {
  positionClassName?: string;
} = {}) {
  return (
    <Link
      href="/map"
      aria-label="地図で見る"
      className={`fixed ${positionClassName} z-30 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-500 text-neutral-950 shadow-lg ring-2 ring-card transition hover:bg-primary-300 active:scale-95`}
      style={{
        // ホームバーに被らないよう safe-area 分を加算する。
        marginBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <MapPin className="h-5 w-5" aria-hidden />
    </Link>
  );
}
