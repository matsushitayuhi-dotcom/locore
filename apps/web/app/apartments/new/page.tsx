import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUser } from '@/lib/auth/require-user';
import { CommunityDisclaimer } from '@/components/community/CommunityDisclaimer';
import { ApartmentForm } from './ApartmentForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '物件を出す — Locore アパート掲示板',
  description:
    'フランスの物件を掲載。長期賃貸 / 短期 / シェア / サブレ。連絡は Locore メッセージ経由で受け取れます。',
};

export default async function NewApartmentPage() {
  // ログイン必須
  await requireUser('/apartments/new');

  return (
    <main className="mx-auto max-w-screen-md px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/apartments"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        アパート一覧に戻る
      </Link>

      <header className="mt-4 mb-6">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
          新規投稿
        </p>
        <h1
          className="mt-2 text-[28px] font-bold leading-tight tracking-tight"
          style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
        >
          物件を掲載する
        </h1>
        <p className="mt-2 text-[13px] leading-[1.9] text-foreground/70">
          写真と要点を丁寧に。Locore は掲載の場を提供しているだけで、
          賃貸借契約には関与しません。契約は必ず正規の書面で締結してください。
        </p>
      </header>

      <div className="mb-6">
        <CommunityDisclaimer kind="apartment" />
      </div>

      <ApartmentForm />
    </main>
  );
}
