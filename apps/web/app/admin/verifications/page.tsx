import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { Clock, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { TestEmailButton } from './TestEmailButton';
import { AdminPageHeader } from '../_components/AdminPageHeader';

/**
 * /admin/verifications — 居住確認の申請一覧 (editor 専用)。
 *
 * - 全申請を新しい順
 * - status バッジで一目で状態を確認
 * - 詳細 (/admin/verifications/[id]) へリンク
 */

export const metadata = { title: '居住確認の管理 — Locore' };
export const dynamic = 'force-dynamic';

export default async function AdminVerificationsPage() {
  // 認証は /admin/layout.tsx で済んでいる
  const db = getDb();
  let rows: Array<{
    id: string;
    userId: string;
    status: 'pending' | 'approved' | 'rejected';
    submittedAt: Date;
    reviewedAt: Date | null;
    documentType: string;
    country: string | null;
    city: string | null;
    userName: string | null;
    userEmail: string | null;
  }> = [];
  let migrationMissing = false;
  try {
    rows = await db
      .select({
        id: schema.residencyVerifications.id,
        userId: schema.residencyVerifications.userId,
        status: schema.residencyVerifications.status,
        submittedAt: schema.residencyVerifications.submittedAt,
        reviewedAt: schema.residencyVerifications.reviewedAt,
        documentType: schema.residencyVerifications.documentType,
        country: schema.residencyVerifications.country,
        city: schema.residencyVerifications.city,
        userName: schema.users.displayName,
        userEmail: schema.users.email,
      })
      .from(schema.residencyVerifications)
      .leftJoin(schema.users, eq(schema.users.id, schema.residencyVerifications.userId))
      .orderBy(desc(schema.residencyVerifications.submittedAt))
      .limit(100);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/does not exist/i.test(msg)) {
      migrationMissing = true;
    } else {
      throw err;
    }
  }

  const pendingCount = rows.filter((r) => r.status === 'pending').length;

  return (
    <div>
      <AdminPageHeader
        title="本人確認の申請レビュー"
        description="提出された書類を確認して承認 / 却下します。承認すると writer_profiles に居住確認バッジが付与されます。"
        kicker={
          pendingCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-bold text-amber-700">
              <Clock className="h-3 w-3" />
              未処理 {pendingCount} 件
            </span>
          ) : (
            <p className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
              <ShieldCheck className="h-3 w-3" />
              本人確認
            </p>
          )
        }
        actions={<TestEmailButton />}
      />

      {migrationMissing ? (
        <section className="mt-10 rounded-xl border-2 border-dashed border-danger-500/40 bg-danger-500/5 p-6 text-[13px]">
          <p className="font-bold text-danger-500">
            ⚠ DB スキーマが最新ではありません
          </p>
          <p className="mt-2 text-foreground/75">
            居住確認テーブルに必要なカラムがありません。Supabase の SQL Editor で
            以下のマイグレーションを順に流してください:
          </p>
          <ul className="mt-2 list-disc pl-6 font-mono text-[12px]">
            <li>packages/db/migrations/manual/0041_residency_verification_enhancements.sql</li>
            <li>packages/db/migrations/manual/0042_verification_identity_fields.sql</li>
          </ul>
        </section>
      ) : rows.length === 0 ? (
        <section className="mt-10 rounded-xl border border-dashed border-border bg-card p-10 text-center text-[13px] text-foreground/55">
          まだ申請はありません。
        </section>
      ) : (
        <ul className="mt-8 divide-y divide-border rounded-xl bg-card ring-1 ring-border">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/admin/verifications/${r.id}`}
                className="flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-muted/40 sm:px-6 sm:py-4"
              >
                <StatusBadge status={r.status} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">
                    {r.userName ?? '匿名'}{' '}
                    <span className="font-normal text-foreground/55">
                      ({r.userEmail ?? '—'})
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-foreground/55">
                    {r.documentType} ・ {r.city ?? ''} {r.country ?? ''} ・ 申請:{' '}
                    {r.submittedAt.toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <span className="text-[11px] text-foreground/55">レビュー →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success-500/15 px-2.5 py-1 text-[10px] font-bold text-success-500">
        <CheckCircle2 className="h-3 w-3" /> 承認済
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-danger-500/15 px-2.5 py-1 text-[10px] font-bold text-danger-500">
        <XCircle className="h-3 w-3" /> 却下
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold text-amber-700">
      <Clock className="h-3 w-3" /> 未処理
    </span>
  );
}
