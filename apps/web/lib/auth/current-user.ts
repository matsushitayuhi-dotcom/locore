import 'server-only';
import { eq } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * 現在ログイン中のユーザー（アプリ独自プロフィール込み）。
 * Supabase Auth のセッションを基に `users` 行を返す。
 *
 * - 未ログイン: `null`
 * - ログイン済みだが `users` 行が無い場合（初回サインアップ直後等）: 自動 INSERT してから返す
 *
 * 認証必須ページでは `requireUser()` を使う（null 時に /auth/login へリダイレクト）。
 */
export type CurrentUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  avatarUrl: string | null;
  bio: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const db = getDb();
  const rows = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      displayName: schema.users.displayName,
      role: schema.users.role,
      avatarUrl: schema.users.avatarUrl,
      bio: schema.users.bio,
    })
    .from(schema.users)
    .where(eq(schema.users.id, authUser.id))
    .limit(1);

  if (rows.length > 0) {
    return rows[0]!;
  }

  // users 行がまだ無い場合（初回サインアップ直後）は自動 INSERT
  // - role は 'reader' で開始
  // - displayName は user_metadata.display_name → email のローカル部 → 'ユーザー' の順で fallback
  const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
  const metaDisplayName =
    typeof meta.display_name === 'string' && meta.display_name.trim()
      ? (meta.display_name as string).trim()
      : typeof meta.full_name === 'string' && meta.full_name.trim()
        ? (meta.full_name as string).trim()
        : null;
  const email = authUser.email ?? '';
  const fallbackDisplayName =
    metaDisplayName ??
    (email.includes('@') ? email.slice(0, email.indexOf('@')) : 'ユーザー');
  const avatarUrl =
    typeof meta.avatar_url === 'string' ? (meta.avatar_url as string) : null;

  await db
    .insert(schema.users)
    .values({
      id: authUser.id,
      email,
      displayName: fallbackDisplayName,
      avatarUrl,
      role: 'reader',
    })
    .onConflictDoNothing({ target: schema.users.id });

  // 入れた / 既に入っていた行を読み直す
  const created = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      displayName: schema.users.displayName,
      role: schema.users.role,
      avatarUrl: schema.users.avatarUrl,
      bio: schema.users.bio,
    })
    .from(schema.users)
    .where(eq(schema.users.id, authUser.id))
    .limit(1);

  return created[0] ?? null;
}

/**
 * 互換用 no-op。旧モック実装ではモジュールキャッシュをクリアしていたが、
 * Supabase Auth 化後はリクエストごとに `auth.getUser()` するためキャッシュは無い。
 * 既存呼び出し元の互換性のために残してある。
 */
export function clearCurrentUserCache(): void {
  /* no-op */
}
