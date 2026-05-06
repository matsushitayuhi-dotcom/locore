import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, eq } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/auth/current-user';
import { computeSla, slaToneClass } from '@/lib/contact/utils';
import { ReportStatusEditor } from './ReportStatusEditor';

export const metadata = {
  title: '通報詳細',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_LABEL: Record<string, string> = {
  open: '未対応',
  investigating: '調査中',
  resolved: '対応済',
  dismissed: '却下',
};

const TARGET_TYPE_LABEL: Record<string, string> = {
  article: '記事',
  user: 'ユーザー',
  review: 'レビュー',
  light_diary: 'ライト旅行記',
  other: 'お問い合わせ',
};

export default async function AdminReportDetailPage({
  params,
}: {
  params: { id: string };
}) {
  if (!UUID_RE.test(params.id)) notFound();

  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return <Forbidden />;
  }
  if (user.role !== 'editor') return <Forbidden />;

  const db = getDb();
  const rows = await db
    .select()
    .from(schema.reports)
    .where(eq(schema.reports.id, params.id))
    .limit(1);

  const report = rows[0];
  if (!report) notFound();

  // 監査ログ（同一 report への変更履歴）
  const logs = await db
    .select({
      id: schema.auditLogs.id,
      action: schema.auditLogs.action,
      metadata: schema.auditLogs.metadata,
      createdAt: schema.auditLogs.createdAt,
      actorId: schema.auditLogs.actorId,
    })
    .from(schema.auditLogs)
    .where(
      and(
        eq(schema.auditLogs.targetType, 'reports'),
        eq(schema.auditLogs.targetId, report.id),
      ),
    )
    .orderBy(asc(schema.auditLogs.createdAt));

  const sla = computeSla(report.createdAt);

  // contact.submitted のメタデータからお問い合わせ用の連絡先を引く
  const contactSubmittedLog = logs.find((l) => l.action === 'contact.submitted');
  const contactMeta = contactSubmittedLog?.metadata as
    | { email?: string; name?: string | null; subject?: string; category?: string }
    | undefined;

  return (
    <main className="bg-background">
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href="/admin/reports"
          className="text-[12px] text-foreground/60 hover:underline"
        >
          ← 一覧に戻る
        </Link>

        <header className="mt-3 mb-6">
          <div className="flex items-center gap-3">
            <h1
              className="text-[24px] font-semibold tracking-tight"
              style={{
                fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
              }}
            >
              通報詳細
            </h1>
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium tabular ${slaToneClass(
                sla.tone,
              )}`}
            >
              {sla.label}
            </span>
          </div>
          <p className="mt-2 font-mono text-[12px] text-foreground/50">{report.id}</p>
        </header>

        <div className="space-y-3 rounded-md border border-border bg-card p-5 text-[14px]">
          <Row label="種別">
            {TARGET_TYPE_LABEL[report.targetType] ?? report.targetType}
          </Row>
          <Row label="対象 ID">
            <span className="font-mono text-[12px]">{report.targetId}</span>
          </Row>
          <Row label="理由">{report.reason}</Row>
          <Row label="状態">{STATUS_LABEL[report.status] ?? report.status}</Row>
          <Row label="受信日時">
            {new Intl.DateTimeFormat('ja-JP', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }).format(report.createdAt)}
          </Row>
          <Row label="通報者">
            {report.reporterId ? (
              <span className="font-mono text-[12px]">{report.reporterId}</span>
            ) : (
              '匿名'
            )}
          </Row>
          {contactMeta ? (
            <>
              <Row label="連絡先メール">{contactMeta.email ?? '—'}</Row>
              {contactMeta.name ? <Row label="名前">{contactMeta.name}</Row> : null}
            </>
          ) : null}
        </div>

        <div className="mt-5 rounded-md border border-border bg-card p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/50">
            本文
          </p>
          <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-[14px] leading-relaxed text-foreground/80">
            {report.body ?? '（本文なし）'}
          </pre>
        </div>

        <div className="mt-5 rounded-md border border-border bg-card p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/50">
            ステータス更新・メモ
          </p>
          <div className="mt-3">
            <ReportStatusEditor
              reportId={report.id}
              currentStatus={report.status}
            />
          </div>
        </div>

        <div className="mt-5 rounded-md border border-border bg-card p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/50">
            監査ログ
          </p>
          {logs.length === 0 ? (
            <p className="mt-2 text-[13px] text-foreground/60">ログはありません。</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {logs.map((l) => {
                const meta = (l.metadata ?? {}) as Record<string, unknown>;
                const notes = typeof meta.notes === 'string' ? meta.notes : null;
                return (
                  <li
                    key={l.id}
                    className="rounded-sm border border-border bg-background px-3 py-2 text-[12px]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-foreground/80">
                        {l.action}
                      </span>
                      <span className="tabular text-foreground/50">
                        {new Intl.DateTimeFormat('ja-JP', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(l.createdAt)}
                      </span>
                    </div>
                    {notes ? (
                      <p className="mt-1 whitespace-pre-wrap text-foreground/70">
                        {notes}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-start gap-3">
      <span className="text-[12px] text-foreground/50">{label}</span>
      <span className="text-foreground/85">{children}</span>
    </div>
  );
}

function Forbidden() {
  return (
    <main className="bg-background">
      <section className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <p className="text-[60px] font-semibold text-foreground/30">401</p>
        <h1 className="mt-2 text-[20px] font-semibold tracking-tight">
          アクセス権がありません
        </h1>
        <p className="mt-2 text-[13px] text-foreground/60">
          この画面は editor 権限を持つ運営アカウントのみ閲覧できます。
        </p>
      </section>
    </main>
  );
}
