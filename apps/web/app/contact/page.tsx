import { ContactForm } from '@/components/ContactForm';
import { getCurrentUser } from '@/lib/auth/current-user';

export const metadata = {
  title: 'お問い合わせ',
};

type SearchParams = { category?: string };

export default async function ContactPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  let initialName = '';
  let initialEmail = '';
  const user = await getCurrentUser();
  if (user) {
    initialName = user.displayName ?? '';
    initialEmail = user.email ?? '';
  }
  // ?category=... が来たらそれを初期値にする（外部リンクからのディープリンク用）。
  // 通常は単一フォームとして扱う。
  const initialCategory =
    searchParams?.category &&
    ['bug', 'feature', 'terms', 'payment', 'takedown', 'other'].includes(
      searchParams.category,
    )
      ? searchParams.category
      : 'bug';

  return (
    <main className="bg-background">
      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <header className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/50">
            Contact
          </p>
          <h1
            className="mt-2 text-[28px] font-semibold tracking-tight sm:text-[36px]"
          >
            お問い合わせ
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-foreground/70">
            運営チームへのお問い合わせ・ご要望はこちらから。72 時間以内に一次返信いたします。
            権利侵害コンテンツの削除依頼（プロバイダ責任制限法）もこちらのカテゴリ「送信防止措置申出」からお送りください。
          </p>
        </header>

        <ContactForm
          initialName={initialName}
          initialEmail={initialEmail}
          initialCategory={initialCategory}
        />
      </section>
    </main>
  );
}
