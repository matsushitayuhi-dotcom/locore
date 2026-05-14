import 'server-only';
import { cookies } from 'next/headers';

/**
 * ユーザーの利用モード（旅行者 / 駐在員）を cookie で保持する。
 *
 * - 入口スプラッシュ画面で選択して cookie をセット
 * - 以降はサーバコンポーネントでこれを読んで、適切なホームへリダイレクト
 * - SideMenu のモード切替からいつでも変更可
 */

export const MODE_COOKIE = 'locore_mode';
export const MODES = ['traveler', 'resident'] as const;
export type ViewerMode = (typeof MODES)[number];

const ONE_YEAR = 60 * 60 * 24 * 365;

/** 現在のモードを cookie から読む。未設定なら null */
export function getViewerMode(): ViewerMode | null {
  const c = cookies().get(MODE_COOKIE)?.value;
  if (c === 'traveler' || c === 'resident') return c;
  return null;
}

/** モードに応じたホームのパス */
export function homePathFor(mode: ViewerMode): '/explore' | '/expat' {
  return mode === 'resident' ? '/expat' : '/explore';
}

/** Server Action 内で cookie をセット（splash 画面の選択ボタンで使う） */
export function setViewerMode(mode: ViewerMode) {
  cookies().set(MODE_COOKIE, mode, {
    maxAge: ONE_YEAR,
    httpOnly: false, // SideMenu のクライアント側 mode switcher で読みたいので false
    sameSite: 'lax',
    path: '/',
  });
}
