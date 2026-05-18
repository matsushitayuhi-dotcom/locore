import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUser } from '@/lib/auth/require-user';
import { CommunityDisclaimer } from '@/components/community/CommunityDisclaimer';
import { PostForm } from './PostForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'メンバーを募集する — Locore',
  description: 'パリの駐在員コミュニティでメンバー募集を投稿する',
};

export default async function NewGroupPage() {
  await requireUser('/groups/new');

  return (
    <main className="mx-auto max-w-screen-md px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/groups"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        一覧に戻る
      </Link>

      <header className="mt-4 mb-5">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
          メンバー募集
        </p>
        <h1
          className="mt-2 text-[26px] font-bold leading-tight tracking-tight"
          style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
        >
          仲間をゆっくり集める
        </h1>
        <p className="mt-2 text-[13px] leading-[1.9] text-foreground/70">
          活動内容、頻度、規模を具体的に。参加希望者からの連絡は Locore メッセージで届きます。
        </p>
      </header>

      <div className="mb-5">
        <CommunityDisclaimer kind="group" />
      </div>

      <PostForm />
    </main>
  );
}
