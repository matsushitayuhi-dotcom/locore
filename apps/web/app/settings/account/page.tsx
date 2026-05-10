import { and, eq, isNull } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { DeleteAccountDialog } from '@/components/settings/DeleteAccountDialog';

export const metadata = {
  title: '退会',
};

export const dynamic = 'force-dynamic';

export default async function AccountSettingsPage() {
  const user = await requireUser('/settings/account');
  const db = getDb();
  const isWriter = user.role === 'resident_writer' || user.role === 'editor';
  const alreadyDeleted = false; // モック現在ユーザーは生存前提

  // クリエイターの場合、未精算の集計（簡易：完了購入の payout 合算と payouts の completed の差分）
  let unsettledJpy = 0;
  let publishedCount = 0;

  if (isWriter) {
    const purchaseRows = await db
      .select({
        payoutJpy: schema.purchases.payoutJpy,
      })
      .from(schema.purchases)
      .innerJoin(schema.articles, eq(schema.articles.id, schema.purchases.articleId))
      .where(
        and(
          eq(schema.articles.writerId, user.id),
          eq(schema.purchases.status, 'completed'),
        ),
      );
    const earned = purchaseRows.reduce((s, r) => s + (r.payoutJpy ?? 0), 0);

    const payoutRows = await db
      .select({ amountJpy: schema.payouts.amountJpy })
      .from(schema.payouts)
      .where(
        and(
          eq(schema.payouts.writerId, user.id),
          eq(schema.payouts.status, 'completed'),
        ),
      );
    const paid = payoutRows.reduce((s, r) => s + (r.amountJpy ?? 0), 0);
    unsettledJpy = Math.max(0, earned - paid);

    const publishedRows = await db
      .select({ id: schema.articles.id })
      .from(schema.articles)
      .where(
        and(
          eq(schema.articles.writerId, user.id),
          eq(schema.articles.status, 'published'),
          isNull(schema.articles.deletedAt),
        ),
      );
    publishedCount = publishedRows.length;
  }

  return (
    <div className="space-y-8">
      <header>
        <h2
          className="text-[20px] font-semibold tracking-tight"
          style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
        >
          アカウント
        </h2>
        <p className="mt-1 text-[12px] text-foreground/60">
          メールアドレス・退会手続きの管理。
        </p>
      </header>

      <section className="space-y-3 rounded-md border border-border bg-card p-5 sm:p-6">
        <h3 className="text-[14px] font-semibold">基本情報</h3>
        <dl className="grid gap-2 text-[13px] sm:grid-cols-[120px_1fr]">
          <dt className="text-foreground/55">メール</dt>
          <dd className="text-foreground">{user.email}</dd>
          <dt className="text-foreground/55">表示名</dt>
          <dd className="text-foreground">{user.displayName ?? '—'}</dd>
          <dt className="text-foreground/55">ロール</dt>
          <dd className="text-foreground">{user.role}</dd>
        </dl>
      </section>

      <section className="space-y-4 rounded-md border border-danger-500/30 bg-danger-50/30 p-5 sm:p-6">
        <h3 className="text-[14px] font-semibold text-danger-500">
          退会（アカウント削除）
        </h3>
        <div className="space-y-2 text-[12px] text-foreground/70">
          <p>
            退会すると、あなたのプロフィールは非公開になり、ログインできなくなります。
          </p>
          <p>
            <strong className="font-semibold">既存の購入者は引き続き、あなたの記事を閲覧できます</strong>
            （LEGAL §19 / PRD §10）。新規販売は停止されます。
          </p>
          {isWriter ? (
            <ul className="ml-4 list-disc space-y-1 text-foreground/65">
              <li>公開中の記事 {publishedCount} 件は「販売停止（archived）」に変更されます。</li>
              {unsettledJpy > 0 ? (
                <li className="text-danger-500">
                  未精算の見込み残高: ¥{unsettledJpy.toLocaleString('ja-JP')}（次回月次精算時に送金されます）
                </li>
              ) : (
                <li>未精算の残高はありません。</li>
              )}
            </ul>
          ) : null}
          <p className="text-foreground/55">
            ※ 法令に基づく保管が必要なデータ（取引履歴等）は削除されません。
          </p>
        </div>

        <DeleteAccountDialog disabled={alreadyDeleted} hasUnsettled={unsettledJpy > 0} />
      </section>
    </div>
  );
}
