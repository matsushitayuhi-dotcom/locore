import { requireUser } from '@/lib/auth/require-user';
import { getMyLatestVerification } from './actions';
import { VerificationForm } from './VerificationForm';
import { ShieldCheck, Clock, CheckCircle2, XCircle } from 'lucide-react';

/**
 * /settings/verification — 居住確認の申請ページ。
 *
 * - 未申請  → フォーム表示
 * - 申請中  → ステータス + 何を送ったか表示 (再申請ボタン)
 * - 承認済 → "✓ 承認済み" バッジ + 必要なら再申請
 * - 却下   → 理由表示 + 再申請ボタン
 */

export const metadata = { title: '居住確認 — 設定' };
export const dynamic = 'force-dynamic';

const DOC_LABEL: Record<string, string> = {
  visa: 'ビザ',
  residence_card: '在留カード / Titre de séjour',
  utility_bill: '光熱費請求書',
  tax_certificate: '住民税・所得税の証明',
  other: 'その他',
};

export default async function VerificationPage() {
  await requireUser('/settings/verification');
  const latest = await getMyLatestVerification();

  return (
    <div className="space-y-6">
      <header>
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
          <ShieldCheck className="h-3 w-3" />
          居住確認
        </p>
        <h2 className="mt-1 text-[20px] font-semibold tracking-tight">
          現地居住の証明
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-foreground/65">
          Founders 申請や記事執筆など、現地在住者向け機能を使うために
          書類で居住確認を行います。書類は Locore の private ストレージに
          安全に保管され、編集チームの目視レビュー後、<strong>30 日以内に
          物理削除</strong> されます (GDPR 配慮)。
        </p>
      </header>

      {/* 現在の申請ステータス */}
      {latest ? <StatusCard latest={latest} /> : null}

      {/* フォーム (未申請 or 却下後 or 承認済の再申請) */}
      {!latest || latest.status === 'rejected' ? (
        <VerificationForm />
      ) : latest.status === 'approved' ? (
        <details className="rounded-md border border-dashed border-border bg-card p-4">
          <summary className="cursor-pointer text-[13px] font-semibold text-foreground">
            書類を再提出する (引越し時など)
          </summary>
          <div className="mt-4">
            <VerificationForm />
          </div>
        </details>
      ) : (
        <p className="rounded-md bg-muted px-4 py-3 text-[12px] text-foreground/65">
          申請レビューが完了するまでお待ちください。通常 3〜5 営業日です。
        </p>
      )}
    </div>
  );
}

function StatusCard({
  latest,
}: {
  latest: NonNullable<Awaited<ReturnType<typeof getMyLatestVerification>>>;
}) {
  const meta = (() => {
    switch (latest.status) {
      case 'approved':
        return {
          icon: CheckCircle2,
          color: 'text-success-500',
          bg: 'bg-success-500/10',
          ring: 'ring-success-500/30',
          label: '承認済み',
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: 'text-danger-500',
          bg: 'bg-danger-500/10',
          ring: 'ring-danger-500/30',
          label: '却下',
        };
      default:
        return {
          icon: Clock,
          color: 'text-amber-600',
          bg: 'bg-amber-500/10',
          ring: 'ring-amber-500/30',
          label: 'レビュー待ち',
        };
    }
  })();
  const Icon = meta.icon;
  return (
    <section
      className={`rounded-xl ${meta.bg} p-4 ring-1 ${meta.ring} sm:p-5`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${meta.color}`} />
        <div className="flex-1">
          <p className={`text-[13px] font-bold ${meta.color}`}>
            {meta.label}
          </p>
          <p className="mt-1 text-[12px] text-foreground/75">
            申請日: {latest.submittedAt.toLocaleDateString('ja-JP')}
            {latest.reviewedAt
              ? ` ・ 確認日: ${latest.reviewedAt.toLocaleDateString('ja-JP')}`
              : ''}
          </p>
          <p className="mt-1 text-[11px] text-foreground/55">
            提出内容: {DOC_LABEL[latest.documentType] ?? latest.documentType} ・
            {latest.city}, {latest.country}
            {latest.filesDeletedAt ? ' ・ 書類は既に削除済み' : ''}
          </p>
          {latest.status === 'rejected' && latest.rejectedReason ? (
            <div className="mt-3 rounded-md bg-card p-3 text-[12px] leading-relaxed text-foreground/80 ring-1 ring-border">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-foreground/55">
                編集チームから
              </p>
              <p className="whitespace-pre-line">{latest.rejectedReason}</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
