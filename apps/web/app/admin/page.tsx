import { Suspense } from 'react';
import Link from 'next/link';
import { AdminPageHeader } from './_components/AdminPageHeader';
import {
  KpiCardsSkeleton,
  SummaryCardsSkeleton,
  TopAndRecentSkeleton,
} from './_components/AdminSkeleton';
import {
  PendingTasksWarnings,
  BusinessKpis,
  ContentSummaries,
  TopAndRecent,
} from './_sections/DashboardSections';

/**
 * /admin — オーバービュー（ダッシュボード）。
 *
 * 各セクションを Suspense で独立にロードする。
 * これにより:
 *   - ハングしたセクションが他をブロックしない
 *   - スケルトンが先に出てユーザーが進行を感じられる
 *   - Supabase の connection pool 枯渇を避けるため、セクション毎の
 *     クエリ数は 3 つ以下に抑える
 *   - 各クエリには 8 秒のソフトタイムアウト
 */

export const metadata = { title: '運営ダッシュボード' };
export const dynamic = 'force-dynamic';

export default function AdminOverviewPage() {
  return (
    <div>
      <AdminPageHeader
        title="運営ダッシュボード"
        description="Locore の運営に必要な指標を集約。各セクションは独立に読み込まれます。"
      />

      {/* 1. 警告バー (即表示・null も可) */}
      <Suspense fallback={null}>
        <PendingTasksWarnings />
      </Suspense>

      {/* 2. ビジネス KPI (集計を 1 クエリにまとめてある) */}
      <Suspense fallback={<KpiCardsSkeleton />}>
        <BusinessKpis />
      </Suspense>

      {/* 3. コンテンツサマリ */}
      <Suspense fallback={<SummaryCardsSkeleton />}>
        <ContentSummaries />
      </Suspense>

      {/* 4. Top クリエイター + 直近購入 (重めの JOIN) */}
      <Suspense fallback={<TopAndRecentSkeleton />}>
        <TopAndRecent />
      </Suspense>

      {/* 5. クイックリンク (DB 不要、即表示) */}
      <QuickLinksSection />
    </div>
  );
}

function QuickLinksSection() {
  return (
    <section className="mb-8 grid gap-3 lg:grid-cols-2">
      <div className="rounded-xl bg-card p-5 ring-1 ring-border">
        <h2 className="mb-3 text-[12px] font-bold uppercase tracking-[0.16em] text-foreground/55">
          Locore 内
        </h2>
        <div className="flex flex-wrap gap-2">
          <QuickLink href="/admin/board">掲示板に投稿</QuickLink>
          <QuickLink href="/admin/verifications">本人確認をレビュー</QuickLink>
          <QuickLink href="/admin/reports?status=open">通報対応</QuickLink>
          <QuickLink href="/admin/users">ユーザー管理</QuickLink>
          <QuickLink href="/calendar">イベントカレンダー</QuickLink>
        </div>
      </div>

      <div className="rounded-xl bg-card p-5 ring-1 ring-border">
        <h2 className="mb-3 flex items-baseline justify-between text-[12px] font-bold uppercase tracking-[0.16em] text-foreground/55">
          <span>外部サービス</span>
          <Link
            href="/admin/system/services"
            className="text-[10px] font-normal normal-case tracking-normal text-primary-300 hover:underline"
          >
            すべて見る →
          </Link>
        </h2>
        <div className="flex flex-wrap gap-2">
          <QuickLink href="https://supabase.com/dashboard" external>
            Supabase
          </QuickLink>
          <QuickLink href="https://vercel.com/dashboard" external>
            Vercel
          </QuickLink>
          <QuickLink href="https://resend.com/dashboard" external>
            Resend
          </QuickLink>
          <QuickLink href="https://console.anthropic.com/" external>
            Anthropic
          </QuickLink>
          <QuickLink
            href="https://github.com/matsushitayuhi-dotcom/locore"
            external
          >
            GitHub
          </QuickLink>
        </div>
        <p className="mt-3 text-[11px] text-foreground/55">
          各サービスの管理画面・API キー・DNS・ログに 1 クリックで。env
          設定状況は「すべて見る」から確認できます。
        </p>
      </div>
    </section>
  );
}

function QuickLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-[11px] font-medium text-foreground/75 hover:bg-primary-500/10 hover:text-primary-300"
      >
        {children} ↗
      </a>
    );
  }
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-[11px] font-medium text-foreground/75 hover:bg-primary-500/10 hover:text-primary-300"
    >
      {children}
    </Link>
  );
}
