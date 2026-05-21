import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { schema } from '@locore/db';
import { Badge } from '@locore/ui';
import { getDb } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/auth/current-user';
import { computeSla, slaToneClass } from '@/lib/contact/utils';

export const metadata = {
  title: '通報・お問い合わせ管理',
};

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'open', label: '未対応' },
  { value: 'investigating', label: '調査中' },
  { value: 'resolved', label: '対応済' },
  { value: 'dismissed', label: '却下' },
];

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

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'editor') {
    return <Forbidden />;
  }

  const db = getDb();
  const filter = searchParams?.status ?? 'open';

  const baseQuery = db
    .select({
      id: schema.reports.id,
      targetType: schema.reports.targetType,
      targetId: schema.reports.targetId,
      reason: schema.reports.reason,
      body: schema.reports.body,
      status: schema.reports.status,
      reporterId: schema.reports.reporterId,
      createdAt: schema.reports.createdAt,
    })
    .from(schema.reports)
    .orderBy(desc(schema.reports.createdAt))
    .limit(100);

  const rows =
    filter === 'all'
      ? await baseQuery
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : await baseQuery.where(eq(schema.reports.status, filter as any));

  return (
    <main className="bg-background">
      <section className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6">
        <header className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/50">
            Admin
          </p>
          <h1
            className="mt-2 text-[28px] font-semibold tracking-tight sm:text-[32px]"
          >
            通報・お問い合わせ管理
          </h1>
          <p className="mt-2 text-[13px] text-foreground/60">
            SLA: 72 時間（PRD §10.2）。残り時間は緑→黄→赤、超過は濃赤で表示します。
          </p>
        </header>

        <nav className="mb-6 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <Link
                key={f.value}
                href={`/admin/reports?status=${f.value}`}
                className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${
                  active
                    ? 'border-primary-700 bg-primary-700 text-neutral-0'
                    : 'border-border bg-card text-foreground/70 hover:bg-muted'
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </nav>

        {rows.length === 0 ? (
          <div className="rounded-md border border-border bg-card p-8 text-center text-[14px] text-foreground/60">
            該当する通報はありません。
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-[13px]">
              <thead className="bg-muted">
                <tr>
                  <Th>SLA</Th>
                  <Th>種別</Th>
                  <Th>理由</Th>
                  <Th>本文</Th>
                  <Th>状態</Th>
                  <Th>受信</Th>
                  <Th>通報者</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => {
                  const sla = computeSla(r.createdAt);
                  return (
                    <tr key={r.id} className="bg-card">
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium tabular ${slaToneClass(
                            sla.tone,
                          )}`}
                          title={`期限まで ${Math.round(sla.remainingMs / 60000)} 分`}
                        >
                          {sla.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-foreground/80">
                        {TARGET_TYPE_LABEL[r.targetType] ?? r.targetType}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-[10px]">
                          {r.reason}
                        </Badge>
                      </td>
                      <td className="max-w-[280px] truncate px-3 py-2 text-foreground/70">
                        {(r.body ?? '').replace(/\n/g, ' ').slice(0, 80) ||
                          '（本文なし）'}
                      </td>
                      <td className="px-3 py-2 text-foreground/80">
                        {STATUS_LABEL[r.status] ?? r.status}
                      </td>
                      <td className="px-3 py-2 tabular text-foreground/60">
                        {formatDateTime(r.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-foreground/60">
                        {r.reporterId ? '会員' : '匿名'}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/admin/reports/${r.id}`}
                          className="text-[12px] text-primary-300 hover:underline"
                        >
                          詳細 →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/60">
      {children}
    </th>
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

function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}
