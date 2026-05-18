import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUser } from '@/lib/auth/require-user';
import { CommunityDisclaimer } from '@/components/community/CommunityDisclaimer';
import { PostForm } from './PostForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '助け合い投稿 — Locore',
  description: 'パリの駐在員コミュニティで助け合いの依頼 / 申し出を投稿する',
};

export default async function NewHelpPage() {
  await requireUser('/help/new');

  return (
    <main className="mx-auto max-w-screen-md px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/help"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        一覧に戻る
      </Link>

      <header className="mt-4 mb-5">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
          助け合い
        </p>
        <h1
          className="mt-2 text-[26px] font-bold leading-tight tracking-tight"
          style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
        >
          助かる、助ける
        </h1>
        <p className="mt-2 text-[13px] leading-[1.9] text-foreground/70">
          内容と日程を具体的に。返信は Locore メッセージで届きます。
          掲載期間は 14 日です。
        </p>
      </header>

      <div className="mb-5">
        <CommunityDisclaimer kind="mutual_aid" />
      </div>

      <PostForm />
    </main>
  );
}
