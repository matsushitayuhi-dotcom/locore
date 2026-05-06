import { ContactForm } from '@/components/ContactForm';
import { getCurrentUser } from '@/lib/auth/current-user';

export const metadata = {
  title: 'お問い合わせ',
};

export default async function ContactPage() {
  let initialName = '';
  let initialEmail = '';
  try {
    const user = await getCurrentUser();
    initialName = user.displayName ?? '';
    initialEmail = user.email ?? '';
  } catch {
    // 未ログイン時はそのまま
  }

  return (
    <main className="bg-background">
      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <header className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/50">
            Contact
          </p>
          <h1
            className="mt-2 text-[28px] font-semibold tracking-tight sm:text-[36px]"
            style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
          >
            お問い合わせ
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-foreground/70">
            運営チームへのお問い合わせ・ご要望はこちらから。
            72 時間以内に一次返信いたします。
          </p>
        </header>

        <ContactForm initialName={initialName} initialEmail={initialEmail} />
      </section>
    </main>
  );
}
