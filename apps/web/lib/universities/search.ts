'use server';

import 'server-only';
import { sql } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';

/**
 * 大学マスタ（universities・0081）のオートコンプリート検索。
 * 公開読み取り（認証不要）・limit 20。name_ja / name_en の部分一致
 * （0081 の trgm gin を活用）で、前方一致を優先して返す。
 */

export type UniversityHit = {
  wikidataId: string | null;
  nameJa: string | null;
  nameEn: string | null;
  countryCode: string | null;
  /** 表示用国名（日本語） */
  country: string | null;
};

export async function searchUniversities(
  qRaw: string,
): Promise<UniversityHit[]> {
  const q = String(qRaw ?? '').trim().slice(0, 80);
  if (q.length < 1) return [];
  try {
    const db = getDb();
    const like = `%${q}%`;
    const prefix = `${q}%`;
    const rows = await db
      .select({
        wikidataId: schema.universities.wikidataId,
        nameJa: schema.universities.nameJa,
        nameEn: schema.universities.nameEn,
        countryCode: schema.universities.countryCode,
        country: schema.universities.country,
      })
      .from(schema.universities)
      .where(
        sql`(${schema.universities.nameJa} ILIKE ${like} OR ${schema.universities.nameEn} ILIKE ${like})`,
      )
      .orderBy(
        // 前方一致を先に、次に日本語名あり、短い名前（本体校）を優先
        sql`(${schema.universities.nameJa} ILIKE ${prefix} OR ${schema.universities.nameEn} ILIKE ${prefix}) DESC`,
        sql`(${schema.universities.nameJa} IS NOT NULL) DESC`,
        sql`char_length(coalesce(${schema.universities.nameJa}, ${schema.universities.nameEn})) ASC`,
        schema.universities.nameEn,
      )
      .limit(20);
    return rows;
  } catch (err) {
    console.warn('[searchUniversities] failed (0081 未適用?):', err);
    return [];
  }
}
