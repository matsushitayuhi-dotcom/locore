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
    // サーバーログには常に Supabase の生エラーを出す (Vercel Functions logs で確認できる)
    console.error(
      '[auth/signIn] supabase error:',
      JSON.stringify({
        message: error.message,
        status: error.status,
        name: error.name,
        code: (error as { code?: string }).code,
      }),
    );

    const msg = error.message?.toLowerCase() ?? '';

    if (msg.includes('invalid') || msg.includes('credentials')) {
      return {
        ok: false,
        error: 'メールアドレスまたはパスワードが正しくありません',
      };
    }
    if (msg.includes('email not confirmed')) {
      return {
        ok: false,
        error:
          'メールアドレスがまだ確認されていません。メール内のリンクをクリックしてください。',
      };
    }
    if (msg.includes('rate limit') || msg.includes('too many')) {
      return {
        ok: false,
        error: 'ログイン試行が多すぎます。数分待ってから再度お試しください。',
      };
    }
    // それ以外: 開発用に Supabase の元メッセージをそのまま出す (本番でも
    // 「○○: ...」形式なので機微情報は含まれない)
    return {
      ok: false,
      error: `ログインに失敗しました: ${error.message}`,
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
