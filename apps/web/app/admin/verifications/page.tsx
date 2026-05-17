import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireEditor } from '@/lib/auth/require-user';
import { ShieldCheck, Clock, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { TestEmailButton } from './TestEmailButton';

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
  const editor = await requireEditor();
  if (!editor) {
    return (
      <main className="mx-auto max-w-screen-md px-4 py-12">
        <p className="text-[14px] text-foreground/70">
          このページは編集チームメンバー限定です。
        </p>
      </main>
    );
  }

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
    <main className="mx-auto max-w-screen-lg px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/admin/dashboard"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        運営ダッシュボードに戻る
      </Link>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
            <ShieldCheck className="h-3 w-3" />
            居住確認の管理
          </p>
          <h1
            className="mt-2 text-[28px] font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
          >
            申請レビュー
          </h1>
          <p className="mt-1 text-[13px] text-foreground/65">
            提出された書類を確認して承認 / 却下します。承認すると writer_profiles に
            居住確認バッジが付与されます。
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {pendingCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1.5 text-[12px] font-bold text-amber-700">
              <Clock className="h-3 w-3" />
              未処理 {pendingCount} 件
            </span>
          ) : null}
          <TestEmailButton />
        </div>
      </header>

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
    </main>
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
