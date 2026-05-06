import 'server-only';
import { getDb } from '@/lib/db/client';
import { schema } from '@locore/db';
import { eq } from 'drizzle-orm';

/**
 * 認証実装まではモック。seed の Tier S 書き手を「現在のユーザー」として返す。
 * Supabase Auth 統合時に `auth().getUser()` 等に置き換える。
 */
const MOCK_CURRENT_USER_EMAIL = 'junko@locore.dev';

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  avatarUrl: string | null;
  bio: string | null;
};

let _cached: CurrentUser | null = null;

export async function getCurrentUser(): Promise<CurrentUser> {
  if (_cached) return _cached;

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
    .where(eq(schema.users.email, MOCK_CURRENT_USER_EMAIL))
    .limit(1);

  if (rows.length === 0) {
    throw new Error(
      `Mock current user '${MOCK_CURRENT_USER_EMAIL}' not found. ` +
        'Run `pnpm --filter @locore/db db:seed` first.',
    );
  }

  _cached = rows[0]!;
  return _cached;
}

/** テスト・開発用：キャッシュをクリアして次回 DB から取り直す */
export function clearCurrentUserCache() {
  _cached = null;
}
