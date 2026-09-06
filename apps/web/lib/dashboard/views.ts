import 'server-only';
import { sql } from 'drizzle-orm';
import { headers } from 'next/headers';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';

/**
 * 公開プロフィール（/experts/[id]）の閲覧を日次で集計する（0090・profile_view_daily）。
 *
 * - 本人・editor は数えない（呼び出し側で判定）
 * - bot らしい UA（bot / crawler / spider / preview / headless）は数えない
 * - IP・UA・個人は保存しない。行は (user_id, day) の件数だけ
 * - 失敗しても描画に影響させない（未適用環境は黙ってスキップ）
 */
export async function recordProfileView(expertId: string): Promise<void> {
  try {
    const ua = headers().get('user-agent') ?? '';
    if (/bot|crawler|spider|preview|headless|lighthouse|slurp|facebookexternalhit/i.test(ua)) return;
    const db = getDb();
    const day = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10); // 日本時間の日付
    await db
      .insert(schema.profileViewDaily)
      .values({ userId: expertId, day, views: 1 })
      .onConflictDoUpdate({
        target: [schema.profileViewDaily.userId, schema.profileViewDaily.day],
        set: { views: sql`${schema.profileViewDaily.views} + 1` },
      });
  } catch {
    /* 0090 未適用 or 一時的なエラー: 無視 */
  }
}
