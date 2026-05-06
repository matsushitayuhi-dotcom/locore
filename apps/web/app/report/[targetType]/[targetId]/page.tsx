import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/auth/current-user';
import { ReportForm } from '@/components/ReportForm';

export const metadata = {
  title: '通報する',
};

const VALID_TARGET_TYPES = ['article', 'user', 'review', 'light_diary'] as const;
type TargetType = (typeof VALID_TARGET_TYPES)[number];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ReportPage({
  params,
}: {
  params: { targetType: string; targetId: string };
}) {
  const { targetType, targetId } = params;

  if (!VALID_TARGET_TYPES.includes(targetType as TargetType)) {
    notFound();
  }
  if (!UUID_RE.test(targetId)) {
    notFound();
  }
  const tt = targetType as TargetType;

  const db = getDb();
  const targetLabel = await fetchTargetLabel(db, tt, targetId);

  let isAuthenticated = false;
  try {
    await getCurrentUser();
    isAuthenticated = true;
  } catch {
    isAuthenticated = false;
  }

  return (
    <main className="bg-background">
      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <header className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/50">
            Report
          </p>
          <h1
            className="mt-2 text-[26px] font-semibold tracking-tight sm:text-[32px]"
            style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
          >
            通報する
          </h1>
          <p className="mt-3 text-[13px] leading-relaxed text-foreground/70">
            違反コンテンツの可能性がある投稿を運営に通報します。
            運営は LEGAL.md §1 第15・16条 に沿って一次対応を行います。
          </p>
        </header>

        <ReportForm
          targetType={tt}
          targetId={targetId}
          targetLabel={targetLabel}
          isAuthenticated={isAuthenticated}
        />

        <p className="mt-6 text-center text-[12px] text-foreground/50">
          通報ではなく、運営への一般的なお問い合わせは{' '}
          <Link href="/contact" className="underline hover:text-foreground/80">
            お問い合わせフォーム
          </Link>
          {' '}をご利用ください。
        </p>
      </section>
    </main>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchTargetLabel(db: any, type: TargetType, id: string): Promise<string> {
  try {
    if (type === 'article') {
      const rows = await db
        .select({ title: schema.articles.title })
        .from(schema.articles)
        .where(eq(schema.articles.id, id))
        .limit(1);
      return rows[0]?.title ?? '（記事が見つかりません）';
    }
    if (type === 'light_diary') {
      const rows = await db
        .select({ title: schema.lightDiaries.title })
        .from(schema.lightDiaries)
        .where(eq(schema.lightDiaries.id, id))
        .limit(1);
      return rows[0]?.title ?? '（ライト旅行記が見つかりません）';
    }
    if (type === 'user') {
      const rows = await db
        .select({ displayName: schema.users.displayName })
        .from(schema.users)
        .where(eq(schema.users.id, id))
        .limit(1);
      return rows[0]?.displayName ?? '（ユーザーが見つかりません）';
    }
    if (type === 'review') {
      const rows = await db
        .select({ body: schema.reviews.body })
        .from(schema.reviews)
        .where(eq(schema.reviews.id, id))
        .limit(1);
      const body = rows[0]?.body;
      if (!body) return '（レビュー）';
      return body.length > 80 ? `${body.slice(0, 80)}…` : body;
    }
  } catch {
    // ignore
  }
  return '（対象情報を取得できませんでした）';
}
