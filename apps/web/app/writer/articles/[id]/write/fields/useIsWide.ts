'use client';

import { useSyncExternalStore } from 'react';

/**
 * 640px 以上か（0091 / エディタ作り直し）。
 *
 * max-sm:hidden で「両方描いて片方を隠す」ことはしない。
 * 同じ入力欄が DOM に 2 つあると fieldFocus の登録が衝突してキャレットが戻らなくなるため、
 * **表は狭いときのカードと広いときのグリッドのどちらか一方だけを描く**。
 * サーバー側と初回描画は false（＝スマホの形）から始める。
 */
const QUERY = '(min-width: 640px)';

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(QUERY).matches;
}

export function useIsWide(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
