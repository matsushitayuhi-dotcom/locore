'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';

const signUpSchema = z.object({
  displayName: z.string().trim().min(1, '表示名を入力してください').max(50),
  email: z.string().trim().email('有効なメールアドレスを入力してください'),
  password: z
    .string()
    .min(8, 'パスワードは 8 文字以上にしてください')
    .max(128, 'パスワードが長すぎます'),
  redirectTo: z.string().optional(),
});

export type SignUpResult = { ok: false; error: string };

/**
 * メール + パスワード + 表示名でサインアップする。
 *
 * - Supabase ダッシュボードで「Email confirmations」が ON の場合：
 *   /auth/verify に遷移して確認メール待ち画面を出す（session は発行されない）
 * - OFF の場合：即セッションが発行され、redirect_to or トップへ
 *
 * users 行は初回 getCurrentUser() で自動 INSERT される。
 */
export async function signUp(input: unknown): Promise<SignUpResult | void> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? '入力内容に誤りがあります',
    };
  }

  const supabase = createSupabaseServerClient();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? '';

  const callbackParams = new URLSearchParams();
  if (parsed.data.redirectTo) {
    callbackParams.set('redirect_to', parsed.data.redirectTo);
  }
  const emailRedirectTo = `${siteUrl || ''}/auth/callback${
    callbackParams.toString() ? `?${callbackParams.toString()}` : ''
  }`;

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        display_name: parsed.data.displayName,
      },
      emailRedirectTo: emailRedirectTo || undefined,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      return {
        ok: false,
        error: 'このメールアドレスは既に登録されています。ログイン画面からお進みください。',
      };
    }
    if (error.message.toLowerCase().includes('weak')) {
      return {
        ok: false,
        error: 'パスワードが弱すぎます。英字・数字・記号を組み合わせてください。',
      };
    }
    return {
      ok: false,
      error: '登録に失敗しました。時間をおいて再度お試しください。',
    };
  }

  revalidatePath('/', 'layout');

  // メール確認が必要な場合は session が null
  const needsConfirm = !data.session;
  if (needsConfirm) {
    redirect(`/auth/verify?email=${encodeURIComponent(parsed.data.email)}`);
  }

  redirect(safeRedirect(parsed.data.redirectTo));
}

function safeRedirect(target?: string): string {
  if (!target) return '/';
  if (target.startsWith('/') && !target.startsWith('//')) {
    return target;
  }
  return '/';
}
