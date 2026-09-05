import { eq } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { getMyLatestVerification } from './actions';
import { VerificationForm, ENROLLMENT_DOCS } from './VerificationForm';
import { QualificationForm, QualificationDeleteButton } from './QualificationForm';
import {
  getUserQualifications,
  listQualificationMaster,
  qualificationCategoryLabel,
  qualificationDisplayName,
} from '@/lib/experts/qualifications';
import { formatSchoolName } from '@/lib/experts/education';
import { GraduationCap, Award, Clock, CheckCircle2, XCircle } from 'lucide-react';

/**
 * /settings/verification — 在籍確認（旧: 本人確認）と資格の登録。留学特化。
 *
 * 1. 在籍確認: 入学証明書・在籍証明書 / 学生証 / 卒業証書 を提出 → 運営が確認 →
 *    プロフィールに「在籍確認済み」バッジ。判定は最新申請が approved（従来と同じ）。
 * 2. 資格・スコア: マスタから選んで合格証明を提出 → 確認後に公開プロフィールへ「確認済み」で表示。
 */

export const metadata = { title: '在籍確認・資格 — 設定' };
export const dynamic = 'force-dynamic';

const DOC_LABEL: Record<string, string> = {
  ...Object.fromEntries(ENROLLMENT_DOCS.map((d) => [d.value, d.label])),
  passport: 'パスポート',
  my_number_card: 'マイナンバーカード',
  driver_license: '運転免許証',
  residence_card: '在留カード / 永住者証明書',
  visa: 'VISA (滞在許可)',
  utility_bill: '公的支払い情報',
  tax_certificate: '住民税・所得税の証明',
};

export default async function VerificationPage() {
  const user = await requireUser('/settings/verification');
  const db = getDb();
  const [latest, educationRows, master, myQuals] = await Promise.all([
    getMyLatestVerification(),
    db
      .select({ education: schema.users.education })
      .from(schema.users)
      .where(eq(schema.users.id, user.id))
      .limit(1),
    listQualificationMaster(),
    getUserQualifications(user.id),
  ]);
  const education = educationRows[0]?.education ?? [];
  const schools = Array.from(
    new Set(education.filter((e) => e.school?.trim()).map((e) => formatSchoolName(e))),
  );
  const defaultAlumni = education.length > 0 && !education.some((e) => e.current);

  return (
    <div className="space-y-8">
      {/* ===== 在籍確認 ===== */}
      <section className="space-y-5">
        <header>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-700">
            <GraduationCap className="h-3.5 w-3.5" />
            在籍確認
          </p>
          <h2 className="mt-1 text-[20px] font-semibold tracking-tight">
            在学・卒業を書類で確認する
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-foreground/65">
            相談者が最も知りたいのは「本当にその学校の在学生 / 卒業生か」です。入学証明書・学生証・卒業証書のいずれかを提出すると、運営が確認してプロフィールに
            <strong className="mx-0.5 text-primary-900">在籍確認済み</strong>
            バッジが付きます。書類は非公開ストレージに保管し、確認後 30 日以内に削除します。
          </p>
        </header>

        {latest ? <StatusCard latest={latest} /> : null}

        {!latest || latest.status === 'rejected' ? (
          <VerificationForm schools={schools} defaultAlumni={defaultAlumni} />
        ) : latest.status === 'approved' ? (
          <details className="rounded-md border border-dashed border-border bg-card p-4">
            <summary className="cursor-pointer text-[13px] font-semibold">
              書類を再提出する（進学・卒業で状況が変わったときなど）
            </summary>
            <div className="mt-4">
              <VerificationForm schools={schools} defaultAlumni={defaultAlumni} />
            </div>
          </details>
        ) : (
          <p className="rounded-md bg-muted px-4 py-3 text-[12px] text-foreground/65">
            運営の確認が完了するまでお待ちください。通常 3〜5 営業日です。
          </p>
        )}
      </section>

      {/* ===== 資格・スコア ===== */}
      <section className="space-y-4">
        <header>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-700">
            <Award className="h-3.5 w-3.5" />
            資格・スコア
          </p>
          <h2 className="mt-1 text-[20px] font-semibold tracking-tight">
            持っている資格・試験スコアを登録する
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-foreground/65">
            TOEFL / IELTS / GMAT などのスコアや職業資格は、合格証明を添えて申請すると公開プロフィールに「確認済み」で表示されます。証明書がないものは登録できません。
          </p>
        </header>

        <div className="rounded-md bg-card p-5 ring-1 ring-border sm:p-6">
          {myQuals.length > 0 ? (
            <ul className="mb-4 divide-y divide-border">
              {myQuals.map((q) => (
                <li key={q.id} className="flex flex-wrap items-center gap-3 py-2.5 text-[13px]">
                  <QualStatus status={q.status} />
                  <div className="min-w-0 flex-1">
                    <b className="font-semibold">{qualificationDisplayName(q)}</b>
                    {q.score ? <span className="ml-2 tabular-nums">{q.score}</span> : null}
                    {q.acquiredYear ? (
                      <span className="ml-2 text-[11.5px] text-foreground/55">{q.acquiredYear}年</span>
                    ) : null}
                    <span className="ml-2 text-[11px] text-foreground/45">
                      {qualificationCategoryLabel(q.category)}
                    </span>
                    {q.status === 'rejected' && q.rejectedReason ? (
                      <p className="mt-1 text-[11.5px] text-danger-500">{q.rejectedReason}</p>
                    ) : null}
                  </div>
                  {q.status !== 'approved' ? <QualificationDeleteButton id={q.id} /> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-[12.5px] text-foreground/55">まだ登録された資格はありません。</p>
          )}
          <QualificationForm master={master} />
        </div>
      </section>
    </div>
  );
}

function QualStatus({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-1 text-[10.5px] font-bold text-primary-900">
        <CheckCircle2 className="h-3 w-3" /> 確認済み
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-danger-50 px-2.5 py-1 text-[10.5px] font-bold text-danger-500">
        <XCircle className="h-3 w-3" /> 却下
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10.5px] font-bold text-neutral-700">
      <Clock className="h-3 w-3" /> 確認待ち
    </span>
  );
}

function StatusCard({
  latest,
}: {
  latest: NonNullable<Awaited<ReturnType<typeof getMyLatestVerification>>>;
}) {
  const meta =
    latest.status === 'approved'
      ? { icon: CheckCircle2, cls: 'text-primary-900', bg: 'bg-primary-50 ring-primary-200', label: '在籍確認済み' }
      : latest.status === 'rejected'
        ? { icon: XCircle, cls: 'text-danger-500', bg: 'bg-danger-50 ring-danger-500/30', label: '却下' }
        : { icon: Clock, cls: 'text-neutral-700', bg: 'bg-muted ring-border', label: '確認待ち' };
  const Icon = meta.icon;
  return (
    <section className={`rounded-md p-4 ring-1 sm:p-5 ${meta.bg}`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${meta.cls}`} />
        <div className="flex-1">
          <p className={`text-[13px] font-bold ${meta.cls}`}>{meta.label}</p>
          <p className="mt-1 text-[12px] text-foreground/75">
            申請日: {latest.submittedAt.toLocaleDateString('ja-JP')}
            {latest.reviewedAt ? ` ・ 確認日: ${latest.reviewedAt.toLocaleDateString('ja-JP')}` : ''}
          </p>
          <p className="mt-1 text-[11px] text-foreground/55">
            提出内容: {DOC_LABEL[latest.documentType] ?? latest.documentType}
            {latest.schoolName ? ` ・ ${latest.schoolName}` : ''}
            {latest.kind === 'identity' ? '（旧・身分証による本人確認）' : ''}
            {latest.filesDeletedAt ? ' ・ 書類は削除済み' : ''}
          </p>
          {latest.status === 'rejected' && latest.rejectedReason ? (
            <div className="mt-3 rounded-md bg-card p-3 text-[12px] leading-relaxed text-foreground/80 ring-1 ring-border">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-foreground/55">運営から</p>
              <p className="whitespace-pre-line">{latest.rejectedReason}</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
