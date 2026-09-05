import 'server-only';
import { inArray } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { isSpecialtyCode } from './specialties';

/**
 * users.specialties（manual/0080）を userId ごとにまとめて引く。
 * lib/experts/list.ts（共有ファイル）を触らずに /experts 側で合流させるための薄いヘルパ。
 * カラム未適用・DB 未設定の環境では空 Map を返して表示を壊さない。
 */
export async function getSpecialtiesByUser(
  userIds: ReadonlyArray<string>,
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (userIds.length === 0) return map;
  try {
    const db = getDb();
    const rows = await db
      .select({ id: schema.users.id, specialties: schema.users.specialties })
      .from(schema.users)
      .where(inArray(schema.users.id, [...userIds]));
    for (const r of rows) {
      const list = Array.isArray(r.specialties) ? r.specialties : [];
      map.set(
        r.id,
        list.filter((c): c is string => typeof c === 'string' && isSpecialtyCode(c)),
      );
    }
  } catch (err) {
    console.warn('[experts] specialties fetch failed (0080 未適用?):', err);
  }
  return map;
}
