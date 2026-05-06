import 'server-only';
import { redirect } from 'next/navigation';
import { getCurrentUser, type CurrentUser } from './current-user';

/**
 * 認証必須ガード。`getCurrentUser()` が null なら `/auth/login` にリダイレクトする。
 * Server Component / Server Action から呼ぶ前提。
 *
 * @param redirectTo - 未ログイン時に login 後リダイレクトしてほしいパス（任意）
 */
export async function requireUser(redirectTo?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    const params = new URLSearchParams();
    if (redirectTo) params.set('redirect_to', redirectTo);
    const qs = params.toString();
    redirect(`/auth/login${qs ? `?${qs}` : ''}`);
  }
  return user;
}

/**
 * 書き手ロール必須ガード。reader の場合 `/become-writer` へ誘導。
 */
export async function requireWriter(redirectTo?: string): Promise<CurrentUser> {
  const user = await requireUser(redirectTo);
  if (user.role !== 'resident_writer' && user.role !== 'editor') {
    redirect('/become-writer');
  }
  return user;
}

/**
 * editor ロール必須ガード。editor 以外は 401 風画面 or リダイレクト。
 * 戻り値が null = アクセス不可（呼び出し側で 401 描画する）。
 */
export async function requireEditor(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth/login');
  }
  if (user.role !== 'editor') {
    return null;
  }
  return user;
}
