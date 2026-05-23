import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  PenSquare,
  Briefcase,
  MessageCircle,
  Star,
  Globe,
  Tag,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/current-user';
import { getFollowCounts, isFollowing } from '@/lib/follow/actions';
import { FollowButton } from '@/components/profile/FollowButton';
import { ContactButton } from '@/components/profile/ContactButton';
import { ServiceCard } from '@/components/services/ServiceCard';
import {
  getResidentProfile,
  type ResidentProfileBundle,
} from '@/lib/residents/byId';
import { ResidentHeader } from '@/components/residents/ResidentHeader';
import { ResidentHubTabs } from '@/components/residents/ResidentHubTabs';
// parseTab / 型は 'use client' を跨がない shared から直接 import する。
// 旧コードは ResidentHubTabs ('use client') 経由で parseTab を読んでおり、
// Server Component から呼ぶと本番ビルドで undefined になっていた。
import {
  parseTab,
  type ResidentHubTabKey,
} from '@/components/residents/residentHubTabsShared';
import { ResidentReviewsSummary } from '@/components/residents/ResidentReviewsSummary';
import { COMMON_LANGUAGES, LANGUAGE_LEVEL_LABEL } from '@/lib/resident/constants';

/**
 * /residents/[id] — 駐在員ハブ。
 *
 * タブ構成:
 *   1. 概要 (overview, default)
 *   2. 記事 (articles)
 *   3. 出品 (services)
 *   4. レビュー (reviews)
 *   5. 問い合わせ (contact)
 *
 * タブ切替方式:
 *   - URL クエリ `?tab=...` で表現
 *   - ResidentHubTabs (client) が router.replace で更新
 *   - サーバ側はクエリを読んで該当パネルだけレンダリング
 *     (データはタブに関係なく 1 回で全て取得済みなので、SSR で隠す/見せるだけ)
 */

export const dynamic = 'force-dynamic';

type Params = { params: { id: string }; searchParams: { tab?: string } };

const ARTICLE_TYPE_LABEL: Record<string, string> = {
  spot_guide: 'スポット',
  itinerary: '旅程',
  expat_info: '駐在情報',
};

export async function generateMetadata({ params }: Params) {
  const r = await getResidentProfile(params.id).catch(() => null);
  const name = r?.displayName ?? '駐在員';
  return { title: `${name} のプロフィール — Locore` };
}

export default async function ResidentHubPage({ params, searchParams }: Params) {
  const resident = await getResidentProfile(params.id);
  if (!resident) notFound();

  const me = await getCurrentUser();
  const isMe = me?.id === resident.id;
  const activeTab = parseTab(searchParams?.tab);

  const [followCounts, viewerFollows] = await Promise.all([
    getFollowCounts(resident.id),
    me && !isMe ? isFollowing(resident.id) : Promise.resolve(false),
  ]);

  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-md px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href="/residents"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          住人ディレクトリに戻る
        </Link>

        {/* Hero */}
        <div className="mt-4">
          <ResidentHeader resident={resident} />
        </div>

        {/* CTA 行 */}
        {!isMe ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <FollowButton
              targetUserId={resident.id}
              initialFollowing={viewerFollows}
              initialFollowerCount={followCounts.followers}
              viewerLoggedIn={!!me}
            />
            <ContactButton
              ownerUserId={resident.id}
              viewerUserId={me?.id ?? null}
            />
          </div>
        ) : null}

        {/* Tabs */}
        <ResidentHubTabs
          activeTab={activeTab}
          counts={{
            articles: resident.articles.length,
            services: resident.services.length,
            reviews: resident.reviewSummary.count,
          }}
        />

        {/* Tab panels */}
        <div className="mt-5 space-y-5">
          {activeTab === 'overview' ? (
            <OverviewPanel resident={resident} />
          ) : null}
          {activeTab === 'articles' ? (
            <ArticlesPanel resident={resident} />
          ) : null}
          {activeTab === 'services' ? (
            <ServicesPanel resident={resident} />
          ) : null}
          {activeTab === 'reviews' ? (
            <ResidentReviewsSummary
              summary={resident.reviewSummary}
              displayName={resident.displayName}
            />
          ) : null}
          {activeTab === 'contact' ? (
            <ContactPanel resident={resident} viewerId={me?.id ?? null} />
          ) : null}
        </div>
      </div>
    </main>
  );
}

// ============================================================================
// Tab panels (server)
// ============================================================================

function OverviewPanel({ resident: r }: { resident: ResidentProfileBundle }) {
  return (
    <>
      {/* bio */}
      {r.bio ? (
        <section className="rounded-2xl bg-card p-5 ring-1 ring-border sm:p-6">
          <h2 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.18em] text-foreground/55">
            自己紹介
          </h2>
          <p className="mt-3 whitespace-pre-line text-[14px] leading-[1.85] text-foreground/85">
            {r.bio}
          </p>
        </section>
      ) : null}

      {/* 取り扱いカテゴリ */}
      {r.articleCategories.length > 0 ? (
        <section className="rounded-2xl bg-card p-5 ring-1 ring-border sm:p-6">
          <h2 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.18em] text-foreground/55">
            <Tag className="h-3.5 w-3.5" />
            取り扱いカテゴリ
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {r.articleCategories.map((c) => (
              <li key={c}>
                <span className="inline-flex items-center rounded-full bg-primary-500/15 px-3 py-1 text-[12px] font-semibold text-primary-300">
                  {ARTICLE_TYPE_LABEL[c] ?? c}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 言語 */}
      {r.languages.length > 0 ? (
        <section className="rounded-2xl bg-card p-5 ring-1 ring-border sm:p-6">
          <h2 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.18em] text-foreground/55">
            <Globe className="h-3.5 w-3.5" />
            話せる言語
          </h2>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {r.languages.map((l) => {
              const label =
                COMMON_LANGUAGES.find((x) => x.code === l.code)?.label ??
                l.code;
              return (
                <li
                  key={l.code}
                  className="flex items-center justify-between rounded-md bg-background/40 px-3 py-1.5 ring-1 ring-border"
                >
                  <span className="text-[13px] font-medium">{label}</span>
                  <span className="text-[11px] tabular text-foreground/55">
                    {LANGUAGE_LEVEL_LABEL[l.level] ?? l.level}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* 興味 */}
      {r.interests.length > 0 ? (
        <section className="rounded-2xl bg-card p-5 ring-1 ring-border sm:p-6">
          <h2 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.18em] text-foreground/55">
            興味・趣味
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {r.interests.map((t) => (
              <li key={t}>
                <Link
                  href={`/residents?tag=${encodeURIComponent(t)}`}
                  className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-[12px] text-foreground/75 hover:bg-primary-500/10 hover:text-primary-300"
                >
                  {t}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 全部空のときのプレースホルダー */}
      {!r.bio &&
      r.articleCategories.length === 0 &&
      r.languages.length === 0 &&
      r.interests.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-[13px] text-foreground/55">
          この方はまだプロフィール詳細を入力していません。
        </section>
      ) : null}
    </>
  );
}

function ArticlesPanel({ resident: r }: { resident: ResidentProfileBundle }) {
  if (r.articles.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-[13px] text-foreground/55">
        {r.displayName} さんはまだ公開中の記事がありません。
      </div>
    );
  }
  return (
    <section>
      <h2 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.18em] text-foreground/55">
        <PenSquare className="h-3.5 w-3.5" />
        記事 ({r.articles.length})
      </h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {r.articles.map((a) => (
          <li key={a.id}>
            <Link
              href={`/articles/${a.id}`}
              className="flex gap-3 rounded-xl bg-card p-3 ring-1 ring-border transition hover:ring-primary-300"
            >
              {a.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.coverImageUrl}
                  alt=""
                  className="h-20 w-24 shrink-0 rounded-md object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="h-20 w-24 shrink-0 rounded-md bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[13px] font-semibold text-foreground hover:text-primary-300">
                  {a.title}
                </p>
                <p className="mt-1 text-[11px] tabular text-foreground/55">
                  ¥{a.priceJpy.toLocaleString('ja-JP')} ·{' '}
                  {ARTICLE_TYPE_LABEL[a.articleType] ?? a.articleType}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ServicesPanel({ resident: r }: { resident: ResidentProfileBundle }) {
  if (r.services.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-[13px] text-foreground/55">
        {r.displayName} さんはまだ出品中のサービスがありません。
      </div>
    );
  }
  return (
    <section>
      <h2 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.18em] text-foreground/55">
        <Briefcase className="h-3.5 w-3.5" />
        出品 ({r.services.length})
      </h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {r.services.map((s) => (
          <li key={s.id}>
            <ServiceCard service={s} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ContactPanel({
  resident: r,
  viewerId,
}: {
  resident: ResidentProfileBundle;
  viewerId: string | null;
}) {
  const isMe = viewerId === r.id;
  return (
    <section className="rounded-2xl bg-card p-6 ring-1 ring-border sm:p-8">
      <h2 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.18em] text-foreground/55">
        <MessageCircle className="h-3.5 w-3.5" />
        問い合わせ
      </h2>
      {isMe ? (
        <p className="mt-3 text-[13px] text-foreground/65">
          これは自分自身のプロフィールです。問い合わせは他の駐在員のプロフィールから行えます。
        </p>
      ) : (
        <>
          <p className="mt-3 text-[14px] leading-relaxed text-foreground/80">
            {r.displayName} さんに直接メッセージを送って、現地の話・サービスの相談ができます。
            Locore はこのやり取りから手数料を取りません。
          </p>
          <div className="mt-5">
            <ContactButton
              ownerUserId={r.id}
              viewerUserId={viewerId}
            />
          </div>
          {r.reviewSummary.count > 0 && r.reviewSummary.avgStars != null ? (
            <p className="mt-4 inline-flex items-center gap-1 text-[12px] text-foreground/55">
              <Star
                className="h-3.5 w-3.5 text-primary-500"
                fill="currentColor"
                strokeWidth={0}
              />
              <span className="tabular">
                平均 {r.reviewSummary.avgStars.toFixed(1)} / 5 ・{' '}
                {r.reviewSummary.count} 件のレビュー
              </span>
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
