import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Star } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/current-user';
import { getFollowCounts, isFollowing } from '@/lib/follow/actions';
import { FollowButton } from '@/components/profile/FollowButton';
import { ContactButton } from '@/components/profile/ContactButton';
import { ServiceCard } from '@/components/services/ServiceCard';
import {
  getResidentProfile,
  type ResidentProfileBundle,
} from '@/lib/residents/byId';
import { ResidentHero } from '@/components/residents/ResidentHero';
import { ResidentSectionNav } from '@/components/residents/ResidentSectionNav';
import { SocialIcons } from '@/components/residents/SocialIcons';
import { ResidentReviewsSummary } from '@/components/residents/ResidentReviewsSummary';
import {
  RESIDENCE_COUNTRY_BY_CODE,
  residenceYearsLabel,
} from '@/lib/resident/masters';

/**
 * /residents/[id] — 駐在員ハブ（ポートフォリオ風・縦積みレイアウト）。
 *
 * 1. ヒーロー（カバー画像 + ライムのネットワーク演出 + 名前/職業/メタ/ソーシャル）
 * 2. アクション行（フォロー / メッセージ）
 * 3. セクション内ナビ（押すとアンカーへスムーススクロール / スクロールスパイ）
 * 4. 縦積みセクション: 自己紹介 → 記事 → サービス → レビュー → 問い合わせ
 */

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

const ARTICLE_TYPE_LABEL: Record<string, string> = {
  spot_guide: 'スポット',
  itinerary: '旅程',
  expat_info: '駐在情報',
};

const TIER_LABEL: Record<'S' | 'A' | 'B', string> = {
  S: '駐在員 S',
  A: '駐在員 A',
  B: '駐在員 B',
};

export async function generateMetadata({ params }: Params) {
  const r = await getResidentProfile(params.id).catch(() => null);
  const name = r?.displayName ?? '駐在員';
  return { title: `${name} のプロフィール — Locore` };
}

export default async function ResidentHubPage({ params }: Params) {
  const resident = await getResidentProfile(params.id);
  if (!resident) notFound();

  const me = await getCurrentUser();
  const isMe = me?.id === resident.id;

  const [followCounts, viewerFollows] = await Promise.all([
    getFollowCounts(resident.id),
    me && !isMe ? isFollowing(resident.id) : Promise.resolve(false),
  ]);

  const countryLabel = resident.residencyCountry
    ? RESIDENCE_COUNTRY_BY_CODE[resident.residencyCountry] ??
      resident.residencyCountry
    : null;
  const yearsLabel =
    resident.writerResidencyYears != null && resident.writerResidencyYears > 0
      ? `在住 ${resident.writerResidencyYears} 年`
      : residenceYearsLabel(resident.arrivalYear);

  const loc = [resident.residencyCity, countryLabel].filter(Boolean).join('、');
  const metaParts = [
    loc,
    yearsLabel,
    resident.homeRegion ? `出身 ${resident.homeRegion}` : '',
  ].filter(Boolean) as string[];

  const tierLabel = resident.tier ? TIER_LABEL[resident.tier] : null;

  const navItems = [
    { key: 'about', label: '概要' },
    { key: 'articles', label: '記事', count: resident.articles.length },
    { key: 'services', label: 'サービス', count: resident.services.length },
    { key: 'reviews', label: 'レビュー', count: resident.reviewSummary.count },
    { key: 'contact', label: '問い合わせ' },
  ];

  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-lg px-4 py-4 sm:px-6 sm:py-6">
        <Link
          href="/residents"
          className="mb-3 inline-flex items-center gap-1 font-mono text-[12px] font-medium text-primary-700 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          住人ディレクトリに戻る
        </Link>

        {/* 1. ヒーロー */}
        <ResidentHero
          coverImageUrl={resident.coverImageUrl}
          avatarUrl={resident.avatarUrl}
          displayName={resident.displayName}
          occupation={resident.occupation}
          eyebrow="Resident"
          tierLabel={tierLabel}
          isVerified={resident.isVerified}
          metaParts={metaParts}
          socials={<SocialIcons links={resident.socialLinks} variant="hero" />}
        />

        {/* 2. アクション行（明るい帯で視認性を確保） */}
        {!isMe ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <FollowButton
              targetUserId={resident.id}
              initialFollowing={viewerFollows}
              initialFollowerCount={followCounts.followers}
              viewerLoggedIn={!!me}
            />
            <ContactButton ownerUserId={resident.id} viewerUserId={me?.id ?? null} />
          </div>
        ) : null}

        {/* 3. セクション内ナビ */}
        <div className="mt-6">
          <ResidentSectionNav items={navItems} />
        </div>

        {/* 4. 縦積みセクション */}
        <AboutSection resident={resident} />
        <ArticlesSection resident={resident} />
        <ServicesSection resident={resident} />
        <section id="reviews" className="scroll-mt-20 border-t border-border py-12">
          <SectionHead num="04" title="レビュー" />
          <ResidentReviewsSummary
            summary={resident.reviewSummary}
            displayName={resident.displayName}
          />
        </section>
        <ContactSection resident={resident} viewerId={me?.id ?? null} isMe={isMe} />
      </div>
    </main>
  );
}

// ============================================================================
// Section helpers
// ============================================================================

function SectionHead({ num, title }: { num: string; title: string }) {
  return (
    <div className="mb-7 flex items-baseline gap-4">
      <span className="font-mono text-[13px] font-semibold text-primary-700">
        {num}
      </span>
      <h2 className="text-[22px] font-bold tracking-tight sm:text-[27px]">
        {title}
      </h2>
    </div>
  );
}

function AboutSection({ resident: r }: { resident: ResidentProfileBundle }) {
  const facts = [
    r.occupation ? { k: '職業', v: r.occupation } : null,
    r.residencyCity ? { k: '拠点', v: r.residencyCity } : null,
    r.writerResidencyYears && r.writerResidencyYears > 0
      ? { k: '活動歴', v: `在住 ${r.writerResidencyYears} 年` }
      : null,
    r.homeRegion ? { k: '出身', v: r.homeRegion } : null,
  ].filter(Boolean) as { k: string; v: string }[];

  const empty = !r.bio && r.offerings.length === 0 && facts.length === 0;

  return (
    <section id="about" className="scroll-mt-20 py-12">
      <SectionHead num="01" title="自己紹介" />
      {empty ? (
        <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-[13px] text-foreground/55">
          この方はまだプロフィール詳細を入力していません。
        </p>
      ) : (
        <>
          {r.bio ? (
            <p className="max-w-3xl whitespace-pre-line text-[15px] leading-[1.95] text-foreground/80 sm:text-[16px]">
              {r.bio}
            </p>
          ) : null}

          {facts.length > 0 ? (
            <div className="mt-7 flex flex-wrap gap-2.5">
              {facts.map((f) => (
                <div
                  key={f.k}
                  className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm"
                >
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary-700">
                    {f.k}
                  </div>
                  <div className="mt-1 text-[14px] font-bold">{f.v}</div>
                </div>
              ))}
            </div>
          ) : null}

          {r.offerings.length > 0 ? (
            <div className="mt-9">
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-700">
                こんな相談に乗れます
              </div>
              <ul className="mt-4 grid max-w-3xl gap-x-7 gap-y-2.5 sm:grid-cols-2">
                {r.offerings.map((o, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-[14.5px] leading-[1.7] text-foreground/80"
                  >
                    <span className="mt-2 h-2 w-2 shrink-0 rotate-45 rounded-[2px] bg-primary-500" />
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function ArticlesSection({ resident: r }: { resident: ResidentProfileBundle }) {
  return (
    <section id="articles" className="scroll-mt-20 border-t border-border py-12">
      <SectionHead num="02" title="公開している記事" />
      {r.articles.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-[13px] text-foreground/55">
          {r.displayName} さんはまだ公開中の記事がありません。
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {r.articles.map((a) => (
            <li key={a.id}>
              <Link
                href={`/articles/${a.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:border-primary-300"
              >
                <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
                  {a.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.coverImageUrl}
                      alt=""
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-primary-700">
                    {ARTICLE_TYPE_LABEL[a.articleType] ?? a.articleType}
                  </span>
                  <h3 className="line-clamp-2 text-[15px] font-bold leading-snug tracking-tight">
                    {a.title}
                  </h3>
                  <span className="mt-auto font-mono text-[13px] font-semibold text-foreground">
                    <span className="text-primary-700">¥</span>
                    {a.priceJpy.toLocaleString('ja-JP')}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ServicesSection({ resident: r }: { resident: ResidentProfileBundle }) {
  return (
    <section id="services" className="scroll-mt-20 border-t border-border py-12">
      <SectionHead num="03" title="出品中のサービス" />
      {r.services.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-[13px] text-foreground/55">
          {r.displayName} さんはまだ出品中のサービスがありません。
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {r.services.map((s) => (
            <li key={s.id}>
              <ServiceCard service={s} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ContactSection({
  resident: r,
  viewerId,
  isMe,
}: {
  resident: ResidentProfileBundle;
  viewerId: string | null;
  isMe: boolean;
}) {
  return (
    <section id="contact" className="scroll-mt-20 border-t border-border py-12">
      <SectionHead num="05" title="問い合わせ" />
      <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary-500/15 via-card to-card p-8 text-center sm:p-12">
        {isMe ? (
          <p className="text-[13px] text-foreground/65">
            これは自分自身のプロフィールです。問い合わせは他の駐在員のプロフィールから行えます。
          </p>
        ) : (
          <>
            <h3 className="text-[22px] font-bold tracking-tight sm:text-[26px]">
              {r.displayName} さんに話を聞く
            </h3>
            <p className="mx-auto mt-3 max-w-md text-[14px] leading-[1.85] text-foreground/70">
              現地の話やサービスの相談を、直接メッセージで。Locore
              はこのやり取りから手数料を取りません。
            </p>
            <div className="mt-6 flex justify-center">
              <ContactButton ownerUserId={r.id} viewerUserId={viewerId} />
            </div>
            {r.reviewSummary.count > 0 && r.reviewSummary.avgStars != null ? (
              <p className="mt-5 inline-flex items-center gap-1 font-mono text-[12px] text-foreground/55">
                <Star
                  className="h-3.5 w-3.5 text-primary-500"
                  fill="currentColor"
                  strokeWidth={0}
                />
                平均 {r.reviewSummary.avgStars.toFixed(1)} / 5 ・{' '}
                {r.reviewSummary.count} 件のレビュー
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
