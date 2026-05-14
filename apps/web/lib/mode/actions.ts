'use server';

import { redirect } from 'next/navigation';
import { setViewerMode, homePathFor, type ViewerMode } from './cookie';

/**
 * モード選択用の Server Action。
 * splash 画面のボタン form action として直接渡せる。
 */
export async function chooseViewerMode(formData: FormData): Promise<void> {
  const raw = formData.get('mode');
  const mode: ViewerMode = raw === 'resident' ? 'resident' : 'traveler';
  setViewerMode(mode);
  redirect(homePathFor(mode));
}

/**
 * SideMenu のモード切替から呼ぶ用。
 * formData 経由ではなく直接 mode を渡せる版。
 */
export async function switchViewerMode(mode: ViewerMode): Promise<void> {
  setViewerMode(mode);
  redirect(homePathFor(mode));
}
