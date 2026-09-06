import { NextResponse } from 'next/server';
import { and, eq, isNull, lte, isNotNull, inArray } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { deleteVerificationDocs } from '@/lib/storage/uploadVerificationDoc';

/**
 * /api/cron/cleanup-verification-files
 *
 * 在籍確認書類（residency_verifications.document_paths）と
 * 資格の合格証明（user_qualifications.proof_paths、0086）の GDPR 配慮自動削除。
 *
 * 動作:
 *   1. CRON_SECRET でリクエストを検証
 *   2. 両テーブルで:
 *        - status IN ('approved', 'rejected')  (処理済み)
 *        - reviewedAt < now - 30 days           (30 日経過)
 *        - filesDeletedAt IS NULL              (まだ削除していない)
 *      の行を取得
 *   3. それぞれのファイルパスを Supabase Storage（verification-docs）から物理削除
 *   4. DB の filesDeletedAt を now() に更新 (履歴は残す)
 *
 * 想定スケジュール: 毎日 (Vercel Hobby なら週 1)
 *   "0 4 * * *"   毎日 04:00 UTC
 *
 * 注意:
 *   - row 自体は消さない。承認/却下の事実は記録として保持
 *   - ファイルだけ削除し、documentPaths を空配列 + filesDeletedAt を埋める
 */

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return runCleanup(req);
}
export async function GET(req: Request) {
  return runCleanup(req);
}

async function runCleanup(req: Request) {
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // ---- 資格の合格証明（0086）。テーブル未適用の環境では黙ってスキップ ----
  let qualCleaned = 0;
  let qualFilesRemoved = 0;
  try {
    const qualTargets = await db
      .select({
        id: schema.userQualifications.id,
        proofPaths: schema.userQualifications.proofPaths,
      })
      .from(schema.userQualifications)
      .where(
        and(
          inArray(schema.userQualifications.status, ['approved', 'rejected']),
          isNotNull(schema.userQualifications.reviewedAt),
          lte(schema.userQualifications.reviewedAt, cutoff),
          isNull(schema.userQualifications.filesDeletedAt),
        ),
      );
    if (qualTargets.length > 0) {
      const paths = qualTargets.flatMap((t) => (t.proofPaths as string[]) ?? []);
      if (paths.length > 0) {
        const ok = await deleteVerificationDocs(paths);
        if (!ok) {
          console.warn(
            '[cleanup-verification-files] qualification proof delete returned false. Marking rows anyway.',
          );
        }
      }
      await db
        .update(schema.userQualifications)
        .set({ filesDeletedAt: new Date(), proofPaths: [], updatedAt: new Date() })
        .where(
          inArray(
            schema.userQualifications.id,
            qualTargets.map((t) => t.id),
          ),
        );
      qualCleaned = qualTargets.length;
      qualFilesRemoved = paths.length;
    }
  } catch (err) {
    console.warn('[cleanup-verification-files] user_qualifications cleanup skipped (0086 未適用?):', err);
  }

  // ---- 在籍確認 / 本人確認書類 ----
  // 対象行を取得
  const targets = await db
    .select({
      id: schema.residencyVerifications.id,
      documentPaths: schema.residencyVerifications.documentPaths,
    })
    .from(schema.residencyVerifications)
    .where(
      and(
        inArray(schema.residencyVerifications.status, ['approved', 'rejected']),
        isNotNull(schema.residencyVerifications.reviewedAt),
        lte(schema.residencyVerifications.reviewedAt, cutoff),
        isNull(schema.residencyVerifications.filesDeletedAt),
      ),
    );

  if (targets.length === 0) {
    return NextResponse.json({
      ok: true,
      cleaned: 0,
      qualificationsCleaned: qualCleaned,
      qualificationFilesRemoved: qualFilesRemoved,
      message: qualCleaned === 0 ? 'nothing to clean' : 'qualification proofs cleaned',
    });
  }

  // 全 paths を flat に集めて 1 回で Storage 削除
  const allPaths = targets.flatMap((t) => (t.documentPaths as string[]) ?? []);
  if (allPaths.length > 0) {
    const ok = await deleteVerificationDocs(allPaths);
    if (!ok) {
      console.warn(
        '[cleanup-verification-files] Storage delete returned false. ' +
          'Continuing to mark DB rows as deleted anyway.',
      );
    }
  }

  // DB 側: filesDeletedAt をセット + documentPaths を空に
  const now = new Date();
  await db
    .update(schema.residencyVerifications)
    .set({ filesDeletedAt: now, documentPaths: [] })
    .where(
      inArray(
        schema.residencyVerifications.id,
        targets.map((t) => t.id),
      ),
    );

  return NextResponse.json({
    ok: true,
    cleaned: targets.length,
    filesRemoved: allPaths.length,
    qualificationsCleaned: qualCleaned,
    qualificationFilesRemoved: qualFilesRemoved,
  });
}
