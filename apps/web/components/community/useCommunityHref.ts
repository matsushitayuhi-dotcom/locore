'use client';

import { useEffect, useState } from 'react';

/**
 * 「コミュニティ」ナビの遷移先を返すフック。
 *
 * /community で国を選ぶと cookie `locore_community_country=<slug>` を記憶する
 * （CommunityCountryPicker）。以降はこのフックがそれを読み、ナビの「コミュニティ」を
 * 選択済みの国ページ（例 /france）に直行させる。未選択なら国セレクト画面 /community。
 *
 * SSR/初回描画では cookie を読めないため /community を返し、マウント後に差し替える
 * （ハイドレーション不一致を避ける）。
 */
const COOKIE = 'locore_community_country';

export function useCommunityHref(): string {
  const [href, setHref] = useState('/community');
  useEffect(() => {
    const m = document.cookie.match(
      new RegExp('(?:^|; )' + COOKIE + '=([^;]+)'),
    );
    if (m && m[1]) {
      const slug = decodeURIComponent(m[1]).replace(/[^a-z0-9-]/gi, '');
      if (slug) setHref('/' + slug);
    }
  }, []);
  return href;
}
