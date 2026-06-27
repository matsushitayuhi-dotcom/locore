import Link from 'next/link';
import { MapPin } from 'lucide-react';

/**
 * 旅行者ホーム (/explore) 右下に浮かぶ「地図で見る」アイコン。
 *
 * IA リファクタ (2026-05) で「地図」グローバルタブを廃止し、
 * 地図 UI は記事領域 (/explore) に統合した。代わりに、画面右下に
 * 浮動ボタンを置いて /map に遷移する設計。
 *
 * BottomNav (h-14 / md 未満で固定) と被らないよう bottom-20 (= 80px)
 * を採用。safe-area-inset-bottom も追加で加算する。
 */
export function FloatingMapButton({
  /** 位置クラス。BottomNav が無いページ（/articles 等）では 'bottom-5 right-5'
   *  のように画面右下へ寄せる。既定は BottomNav を避ける 'bottom-20 right-4'。 */
  positionClassName = 'bottom-20 right-4',
}: {
  positionClassName?: string;
} = {}) {
  return (
    <Link
      href="/map"
      aria-label="地図で見る"
      className={`fixed ${positionClassName} z-30 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-500 text-neutral-950 shadow-lg ring-2 ring-card transition hover:bg-primary-300 active:scale-95`}
      style={{
        // BottomNav と safe-area の両方を考慮。bottom-20 (80px) に
        // env(safe-area-inset-bottom) を加算する。
        marginBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <MapPin className="h-5 w-5" aria-hidden />
    </Link>
  );
}
