import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { ArrowLeft, ExternalLink, MapPin, Calendar, User, FileText } from 'lucide-react';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireEditor } from '@/lib/auth/require-user';
import { getSignedDocUrl } from '@/lib/storage/uploadVerificationDoc';
import { ReviewForm } from './ReviewForm';

/**
 * /admin/verifications/[id] — 個別申請のレビュー画面 (editor 専用)。
 *
 * - 提出された書類すべての signed URL を発行 (7 日間有効)
 * - 承認 / 却下フォームを表示
 * - すでに処理済みの場合は履歴のみ表示
 */

export const dynamic = 'force-dynamic';

const DOC_LABEL: Record<string, string> = {
  visa: 'ビザ',
  residence_card: '在留カード / Titre de séjour',
  utility_bill: '光熱費請求書',
  tax_certificate: '住民税・所得税の証明',
  other: 'その他',
};

export default async function AdminVerificationDetailPage({
  params,
}: {
  params: { id: string };
}) {
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
  const rows = await db
    .select({
      id: schema.residencyVerifications.id,
      userId: schema.residencyVerifications.userId,
      status: schema.residencyVerifications.status,
      documentType: schema.residencyVerifications.documentType,
      documentPaths: schema.residencyVerifications.documentPaths,
      country: schema.residencyVerifications.country,
      city: schema.residencyVerifications.city,
      userNote: schema.residencyVerifications.userNote,
      reviewerNote: schema.residencyVerifications.reviewerNote,
      rejectedReason: schema.residencyVerifications.rejectedReason,
      submittedAt: schema.residencyVerifications.submittedAt,
      reviewedAt: schema.residencyVerifications.reviewedAt,
      filesDeletedAt: schema.residencyVerifications.filesDeletedAt,
      userName: schema.users.displayName,
      userEmail: schema.users.email,
    })
    .from(schema.residencyVerifications)
    .leftJoin(schema.users, eq(schema.users.id, schema.residencyVerifications.userId))
    .where(eq(schema.residencyVerifications.id, params.id))
    .limit(1);

  const r = rows[0];
  if (!r) notFound();

  // 書類の signed URL を全件発行 (削除済みは null)
  const paths = (r.documentPaths as string[]) ?? [];
  const signedUrls = r.filesDeletedAt
    ? []
    : await Promise.all(paths.map((p) => getSignedDocUrl(p, 60 * 60 * 24 * 7)));

  return (
    <main className="mx-auto max-w-screen-md px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/admin/verifications"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        申請一覧に戻る
      </Link>

      <header className="mt-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
          居住確認レビュー
        </p>
        <h1
          className="mt-2 text-[24px] font-bold tracking-tight"
          style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
        >
          {r.userName ?? '匿名'} さんの申請
        </h1>
      </header>

      {/* 申請メタ情報 */}
      <section className="mt-6 rounded-xl bg-card p-5 ring-1 ring-border sm:p-6">
        <dl className="grid gap-3 text-[13px] sm:grid-cols-2">
          <Meta icon={User} label="申請者">
            {r.userName ?? '匿名'} <span className="text-foreground/55">({r.userEmail ?? '—'})</span>
            <br />
            <Link
              href={`/residents/${r.userId}`}
              className="text-[11px] text-primary-300 hover:underline"
            >
              プロフィールを見る →
            </Link>
          </Meta>
          <Meta icon={MapPin} label="在住申告">
            {r.city ?? ''}{r.city && r.country ? ' / ' : ''}{r.country ?? '—'}
          </Meta>
          <Meta icon={FileText} label="書類タイプ">
            {DOC_LABEL[r.documentType] ?? r.documentType}
          </Meta>
          <Meta icon={Calendar} label="申請日">
            {r.submittedAt.toLocaleString('ja-JP')}
          </Meta>
          {r.reviewedAt ? (
            <Meta icon={Calendar} label="確認日">
              {r.reviewedAt.toLocaleString('ja-JP')}
            </Meta>
          ) : null}
        </dl>

        {r.userNote ? (
          <div className="mt-4 rounded-md bg-background/40 p-3 ring-1 ring-border">
            <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">
              本人コメント
            </p>
            <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed">
              {r.userNote}
            </p>
          </div>
        ) : null}
      </section>

      {/* 添付ファイル */}
      <section className="mt-5 rounded-xl bg-card p-5 ring-1 ring-border sm:p-6">
        <h2 className="text-[14px] font-bold">
          添付書類 ({paths.length} 枚)
        </h2>
        {r.filesDeletedAt ? (
          <p className="mt-2 rounded-md bg-muted px-3 py-2 text-[12px] text-foreground/65">
            このレコードのファイルは GDPR 配慮で{' '}
            {r.filesDeletedAt.toLocaleDateString('ja-JP')} に削除済みです。
          </p>
        ) : paths.length === 0 ? (
          <p className="mt-2 text-[12px] text-foreground/55">添付書類はありません。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {paths.map((p, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-md bg-background/40 px-3 py-2 ring-1 ring-border"
              >
                <FileText className="h-4 w-4 shrink-0 text-foreground/55" />
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground/65">
                  {p.split('/').pop()}
                </span>
                {signedUrls[i] ? (
                  <a
                    href={signedUrls[i] ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-500 px-3 py-1 text-[11px] font-bold text-neutral-950 hover:bg-primary-300"
                  >
                    開く <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-[11px] text-foreground/55">
                    URL 発行失敗
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 承認 / 却下フォーム or 履歴表示 */}
      {r.status === 'pending' ? (
        <section className="mt-5 rounded-xl bg-card p-5 ring-1 ring-border sm:p-6">
          <h2 className="mb-3 text-[14px] font-bold">レビュー</h2>
          <ReviewForm id={r.id} />
        </section>
      ) : (
        <section className="mt-5 rounded-xl bg-card p-5 ring-1 ring-border sm:p-6">
          <h2 className="text-[14px] font-bold">
            処理済み —{' '}
            {r.status === 'approved' ? (
              <span className="text-success-500">承認</span>
            ) : (
              <span className="text-danger-500">却下</span>
            )}
          </h2>
          {r.reviewerNote ? (
            <div className="mt-3 rounded-md bg-background/40 p-3 ring-1 ring-border">
              <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">
                内部メモ
              </p>
              <p className="mt-1 whitespace-pre-line text-[13px]">{r.reviewerNote}</p>
            </div>
          ) : null}
          {r.rejectedReason ? (
            <div className="mt-3 rounded-md bg-danger-500/10 p-3 ring-1 ring-danger-500/30">
              <p className="text-[10px] font-bold uppercase tracking-wider text-danger-500">
                ユーザーに通知した却下理由
              </p>
              <p className="mt-1 whitespace-pre-line text-[13px]">
                {r.rejectedReason}
              </p>
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}

function Meta({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof User;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-foreground/55">
        <Icon className="h-3 w-3" />
        {label}
      </dt>
      <dd className="mt-1 text-[13px]">{children}</dd>
    </div>
  );
}
