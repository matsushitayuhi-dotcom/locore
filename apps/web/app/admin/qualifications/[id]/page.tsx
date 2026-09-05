import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { ArrowLeft, ExternalLink, Award, Calendar, User, FileText } from 'lucide-react';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireEditor } from '@/lib/auth/require-user';
import { getSignedDocUrl } from '@/lib/storage/uploadVerificationDoc';
import { qualificationCategoryLabel } from '@/lib/experts/qualifications';
import { ReviewForm } from './ReviewForm';

/** /admin/qualifications/[id] — 資格の合格証明レビュー（editor 専用）。0086 */

export const dynamic = 'force-dynamic';

export default async function AdminQualificationDetailPage({ params }: { params: { id: string } }) {
  const editor = await requireEditor();
  if (!editor) {
    return (
      <main className="mx-auto max-w-screen-md px-4 py-12">
        <p className="text-[14px] text-foreground/70">このページは編集チームメンバー限定です。</p>
      </main>
    );
  }
  const db = getDb();
  const rows = await db
    .select({
      id: schema.userQualifications.id,
      userId: schema.userQualifications.userId,
      status: schema.userQualifications.status,
      customName: schema.userQualifications.customName,
      score: schema.userQualifications.score,
      acquiredYear: schema.userQualifications.acquiredYear,
      proofPaths: schema.userQualifications.proofPaths,
      userNote: schema.userQualifications.userNote,
      reviewerNote: schema.userQualifications.reviewerNote,
      rejectedReason: schema.userQualifications.rejectedReason,
      submittedAt: schema.userQualifications.submittedAt,
      reviewedAt: schema.userQualifications.reviewedAt,
      filesDeletedAt: schema.userQualifications.filesDeletedAt,
      nameJa: schema.qualifications.nameJa,
      nameEn: schema.qualifications.nameEn,
      code: schema.qualifications.code,
      category: schema.qualifications.category,
      userName: schema.users.displayName,
      userEmail: schema.users.email,
    })
    .from(schema.userQualifications)
    .innerJoin(schema.qualifications, eq(schema.qualifications.id, schema.userQualifications.qualificationId))
    .leftJoin(schema.users, eq(schema.users.id, schema.userQualifications.userId))
    .where(eq(schema.userQualifications.id, params.id))
    .limit(1);
  const r = rows[0];
  if (!r) notFound();

  const paths = (r.proofPaths as string[]) ?? [];
  const signedUrls = r.filesDeletedAt
    ? []
    : await Promise.all(paths.map((p) => getSignedDocUrl(p, 60 * 60 * 24 * 7)));
  const name = r.code === 'other' && r.customName ? r.customName : r.nameJa;

  return (
    <main className="mx-auto max-w-screen-md px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/admin/qualifications"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        申請一覧に戻る
      </Link>
      <header className="mt-4">
        <p className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
          <Award className="h-3 w-3" />
          資格レビュー
        </p>
        <h1 className="mt-2 text-[24px] font-bold tracking-tight">
          {r.userName ?? '匿名'} さん — {name}
        </h1>
      </header>

      <section className="mt-6 rounded-xl bg-card p-5 ring-1 ring-border sm:p-6">
        <dl className="grid gap-3 text-[13px] sm:grid-cols-2">
          <Meta icon={User} label="アカウント">
            {r.userName ?? '匿名'} <span className="text-foreground/55">({r.userEmail ?? '—'})</span>
            <br />
            <Link href={`/experts/${r.userId}`} className="text-[11px] text-primary-300 hover:underline">
              公開プロフィールを見る →
            </Link>
          </Meta>
          <Meta icon={Award} label="資格・試験">
            {name}
            {r.nameEn && r.nameEn !== name ? <span className="text-foreground/55">（{r.nameEn}）</span> : null}
            <br />
            <span className="text-[11px] text-foreground/55">{qualificationCategoryLabel(r.category)}</span>
          </Meta>
          {r.score ? (
            <Meta icon={FileText} label="申告スコア・級">
              <span className="font-mono">{r.score}</span>
            </Meta>
          ) : null}
          {r.acquiredYear ? (
            <Meta icon={Calendar} label="取得年">
              {r.acquiredYear}
            </Meta>
          ) : null}
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
            <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">本人コメント</p>
            <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed">{r.userNote}</p>
          </div>
        ) : null}
      </section>

      <section className="mt-5 rounded-xl bg-card p-5 ring-1 ring-border sm:p-6">
        <h2 className="text-[14px] font-bold">合格証明（{paths.length} 枚）</h2>
        {r.filesDeletedAt ? (
          <p className="mt-2 rounded-md bg-muted px-3 py-2 text-[12px] text-foreground/65">
            ファイルは {r.filesDeletedAt.toLocaleDateString('ja-JP')} に削除済みです。
          </p>
        ) : paths.length === 0 ? (
          <p className="mt-2 text-[12px] text-foreground/55">添付はありません。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {paths.map((p, i) => (
              <li key={i} className="flex items-center gap-3 rounded-md bg-background/40 px-3 py-2 ring-1 ring-border">
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
                  <span className="text-[11px] text-foreground/45">URL 発行失敗</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-5 rounded-xl bg-card p-5 ring-1 ring-border sm:p-6">
        <h2 className="text-[14px] font-bold">判定</h2>
        {r.status === 'pending' ? (
          <div className="mt-3">
            <ReviewForm id={r.id} />
          </div>
        ) : (
          <div className="mt-3 text-[13px]">
            <p className={r.status === 'approved' ? 'font-bold text-success-500' : 'font-bold text-danger-500'}>
              {r.status === 'approved' ? '承認済み' : '却下'}
            </p>
            {r.rejectedReason ? <p className="mt-1 whitespace-pre-line text-foreground/75">{r.rejectedReason}</p> : null}
            {r.reviewerNote ? (
              <p className="mt-2 text-[12px] text-foreground/55">内部メモ: {r.reviewerNote}</p>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}

function Meta({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-foreground/45" />
      <div>
        <dt className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">{label}</dt>
        <dd className="mt-0.5">{children}</dd>
      </div>
    </div>
  );
}
