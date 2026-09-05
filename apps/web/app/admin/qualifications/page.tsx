import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { Award, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireEditor } from '@/lib/auth/require-user';
import { AdminPageHeader } from '@/app/admin/_components/AdminPageHeader';
import { qualificationCategoryLabel } from '@/lib/experts/qualifications';

/**
 * /admin/qualifications — 資格・試験スコアの確認申請一覧（editor 専用）。0086。
 */

export const metadata = { title: '資格の確認 — Locore' };
export const dynamic = 'force-dynamic';

export default async function AdminQualificationsPage() {
  const editor = await requireEditor();
  if (!editor) {
    return (
      <main className="mx-auto max-w-screen-md px-4 py-12">
        <p className="text-[14px] text-foreground/70">このページは編集チームメンバー限定です。</p>
      </main>
    );
  }
  const db = getDb();
  let rows: Array<{
    id: string;
    status: 'pending' | 'approved' | 'rejected';
    submittedAt: Date;
    nameJa: string;
    code: string;
    customName: string | null;
    score: string | null;
    category: string;
    userName: string | null;
    userEmail: string | null;
  }> = [];
  let migrationMissing = false;
  try {
    rows = await db
      .select({
        id: schema.userQualifications.id,
        status: schema.userQualifications.status,
        submittedAt: schema.userQualifications.submittedAt,
        nameJa: schema.qualifications.nameJa,
        code: schema.qualifications.code,
        customName: schema.userQualifications.customName,
        score: schema.userQualifications.score,
        category: schema.qualifications.category,
        userName: schema.users.displayName,
        userEmail: schema.users.email,
      })
      .from(schema.userQualifications)
      .innerJoin(schema.qualifications, eq(schema.qualifications.id, schema.userQualifications.qualificationId))
      .leftJoin(schema.users, eq(schema.users.id, schema.userQualifications.userId))
      .orderBy(desc(schema.userQualifications.submittedAt))
      .limit(100);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/does not exist/i.test(msg)) migrationMissing = true;
    else throw err;
  }
  const pendingCount = rows.filter((r) => r.status === 'pending').length;

  return (
    <div>
      <AdminPageHeader
        title="資格・スコアの確認"
        description="提出された合格証明を確認して承認 / 却下します。承認すると公開プロフィールに「確認済み」で表示されます。"
        kicker={
          pendingCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-bold text-amber-700">
              <Clock className="h-3 w-3" />
              未処理 {pendingCount} 件
            </span>
          ) : (
            <p className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
              <Award className="h-3 w-3" />
              資格
            </p>
          )
        }
      />

      {migrationMissing ? (
        <section className="mt-10 rounded-xl border-2 border-dashed border-danger-500/40 bg-danger-500/5 p-6 text-[13px]">
          <p className="font-bold text-danger-500">⚠ DB スキーマが最新ではありません</p>
          <p className="mt-2 font-mono text-[12px]">packages/db/migrations/manual/0086_qualifications.sql</p>
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
                href={`/admin/qualifications/${r.id}`}
                className="flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-muted/40 sm:px-6 sm:py-4"
              >
                <StatusBadge status={r.status} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">
                    {r.userName ?? '匿名'}{' '}
                    <span className="font-normal text-foreground/55">({r.userEmail ?? '—'})</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-foreground/55">
                    {r.code === 'other' && r.customName ? r.customName : r.nameJa}
                    {r.score ? ` ${r.score}` : ''}
                    {' ・ '}
                    {qualificationCategoryLabel(r.category)}
                    {' ・ 申請: '}
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
  if (status === 'approved')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success-500/15 px-2.5 py-1 text-[10px] font-bold text-success-500">
        <CheckCircle2 className="h-3 w-3" /> 承認済
      </span>
    );
  if (status === 'rejected')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-danger-500/15 px-2.5 py-1 text-[10px] font-bold text-danger-500">
        <XCircle className="h-3 w-3" /> 却下
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold text-amber-700">
      <Clock className="h-3 w-3" /> 未処理
    </span>
  );
}
