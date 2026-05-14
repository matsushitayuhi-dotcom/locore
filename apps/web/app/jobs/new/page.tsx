import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUser } from '@/lib/auth/require-user';
import { CommunityDisclaimer } from '@/components/community/CommunityDisclaimer';
import { JobPostForm } from './JobPostForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '求人を出す — Locore',
  description: 'パリの駐在員コミュニティに求人を掲載する',
};

export default async function NewJobPage() {
  // ログイン必須
  await requireUser('/jobs/new');

  return (
    <main className="mx-auto max-w-screen-md px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        求人一覧に戻る
      </Link>

      <header className="mt-4 mb-5">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
          求人を出す
        </p>
        <h1
          className="mt-2 text-[26px] font-bold leading-tight tracking-tight"
          style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
        >
          働き手と、ていねいに出会う。
        </h1>
        <p className="mt-2 text-[13px] leading-[1.9] text-foreground/70">
          職務内容と条件は具体的に。雇用主としての責任を理解した上で投稿してください。
          応募者からの連絡は Locore メッセージで届きます。
        </p>
      </header>

      <div className="mb-5">
        <CommunityDisclaimer kind="job" />
      </div>

      <JobPostForm />
    </main>
  );
}
