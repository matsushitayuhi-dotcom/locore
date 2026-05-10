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
  const initialCategory =
    searchParams?.category &&
    ['bug', 'feature', 'terms', 'payment', 'takedown', 'other'].includes(
      searchParams.category,
    )
      ? searchParams.category
      : 'bug';
  const isTakedown = initialCategory === 'takedown';

  return (
    <main className="bg-background">
      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <header className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/50">
            {isTakedown ? 'Legal Notice' : 'Contact'}
          </p>
          <h1
            className="mt-2 text-[28px] font-semibold tracking-tight sm:text-[36px]"
            style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
          >
            {isTakedown ? '送信防止措置申出 / 通報フォーム' : 'お問い合わせ'}
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-foreground/70">
            {isTakedown
              ? '掲載コンテンツによって権利を侵害された場合、こちらのフォームから送信防止措置申出（プロバイダ責任制限法）を行えます。受領後 7 日以内に対応方針をご連絡します。'
              : '運営チームへのお問い合わせ・ご要望はこちらから。72 時間以内に一次返信いたします。'}
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
