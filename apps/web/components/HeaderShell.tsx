'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * SiteHeader の外側ラッパー (Client Component)。
 *
 * - スクロールダウンで非表示、スクロールアップ / トップ近くで再表示
 * - アプリ風の「コンテンツに集中させる」UX
 * - sticky-top + transform で実装。height は変えないので下のコンテンツが
 *   ガタガタしない
 * - safe-area-inset-top に追従させて、ノッチ機種でステータスバーに被らない
 *
 * SiteHeader 自体は async server component なので、その JSX を children として
 * 受け取り、見た目だけここで操る。
 */
export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const lastYRef = useRef(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    lastYRef.current = window.scrollY;

    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        const last = lastYRef.current;
        const delta = y - last;

        // 画面上部 80px 以内は常に表示 (戻る場所をなくさない)
        if (y < 80) {
          setHidden(false);
        } else if (delta > 6) {
          // 一定量スクロールダウンしたら隠す
          setHidden(true);
        } else if (delta < -6) {
          // 戻し方向にスクロールしたら再表示
          setHidden(false);
        }

        lastYRef.current = y;
        tickingRef.current = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={
        'sticky top-0 z-30 w-full transition-transform duration-200 ease-out ' +
        (hidden ? '-translate-y-full' : 'translate-y-0')
      }
      style={{
        // ノッチ機種でステータスバー帯に色を伸ばす (アプリ風)。
        // ヘッダーをランディングと同じダークバーに統一したので、safe-area 帯も
        // ダークで塗る。
        paddingTop: 'env(safe-area-inset-top, 0px)',
        backgroundColor: '#0b0d13',
      }}
    >
      {children}
    </div>
  );
}
