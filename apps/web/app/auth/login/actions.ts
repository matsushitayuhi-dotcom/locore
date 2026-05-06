'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';

const signInSchema = z.object({
  email: z.string().trim().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
  redirectTo: z.string().optional(),
});

export type SignInResult = { ok: false; error: string };

/**
 * メール + パスワードでログインする。
 * 成功時はリダイレクト（戻り値なし）、失敗時はエラーメッセージを返す。
 */
export async function signIn(input: unknown): Promise<SignInResult | void> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? '入力内容に誤りがあります',
    };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Supabase のエラーメッセージは英語かつ詳細すぎるため一般化
    if (
      error.message.toLowerCase().includes('invalid') ||
      error.message.toLowerCase().includes('credentials')
    ) {
      return {
        ok: false,
        error: 'メールアドレスまたはパスワードが正しくありません',
      };
    }
    if (error.message.toLowerCase().includes('email not confirmed')) {
      return {
        ok: false,
        error: 'メールアドレスがまだ確認されていません。メール内のリンクをクリックしてください。',
      };
    }
    return {
      ok: false,
      error: 'ログインに失敗しました。時間をおいて再度お試しください。',
    };
  }

  revalidatePath('/', 'layout');
  redirect(safeRedirect(parsed.data.redirectTo));
}

function safeRedirect(target?: string): string {
  if (!target) return '/';
  // open redirect 防止：先頭が `/` で始まる相対パスのみ許可
  if (target.startsWith('/') && !target.startsWith('//')) {
    return target;
  }
  return '/';
}
