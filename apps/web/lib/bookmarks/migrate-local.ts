'use client';

/**
 * ログイン時、localStorage に残っている旧ブックマーク（`locore.bookmarks.v1`）を
 * DB に移行するヘルパー。ベストエフォート。
 *
 * - 失敗しても致命的ではないため、エラーは握りつぶす（ログのみ）
 * - 成功した分は localStorage 側からも消す
 * - UUID でないキー（プロト時代の `art_001` 等）は DB に入らないので除外
 *
 * 呼び出し箇所はログイン直後の Client Component から想定。
 * 例: `useEffect(() => { migrateLocalBookmarks(); }, []);`
 */
import { addBookmark } from './actions';
import { Bookmarks } from '@/lib/storage/local';

const LEGACY_KEY = 'locore.bookmarks.v1';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function migrateLocalBookmarks(): Promise<{
  migrated: number;
  skipped: number;
}> {
  const ids = Bookmarks.list();
  if (ids.length === 0) return { migrated: 0, skipped: 0 };

  let migrated = 0;
  let skipped = 0;

  for (const id of ids) {
    if (!UUID_RE.test(id)) {
      skipped += 1;
      continue;
    }
    try {
      const res = await addBookmark({ articleId: id });
      if (res.ok) migrated += 1;
      else skipped += 1;
    } catch {
      skipped += 1;
    }
  }

  // 成功 / 失敗にかかわらず、いったん localStorage はクリアする
  // （失敗のリトライは UI 側で再実行可能）
  if (migrated > 0 && typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* noop */
    }
  }

  return { migrated, skipped };
}
