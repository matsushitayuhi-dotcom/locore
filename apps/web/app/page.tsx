import { useTranslations } from 'next-intl';
// 後でデザインシステムが揃ったら有効化:
// import { Button } from '@locore/ui';

export default function HomePage() {
  const t = useTranslations('home');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center text-gray-900">
      <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">{t('heroTitle')}</h1>
      <p className="mt-6 max-w-xl text-lg text-gray-600 sm:text-xl">{t('heroSubtitle')}</p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          className="rounded-full bg-gray-900 px-6 py-3 text-base font-medium text-white shadow-sm transition hover:bg-gray-800"
        >
          {t('ctaPrimary')}
        </button>
        <button
          type="button"
          className="rounded-full border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-900 shadow-sm transition hover:bg-gray-50"
        >
          {t('ctaSecondary')}
        </button>
        {/* <Button>{t('ctaPrimary')}</Button> */}
      </div>
    </main>
  );
}
