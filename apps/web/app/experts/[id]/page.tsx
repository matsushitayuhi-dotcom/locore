import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BadgeCheck, Check, Globe, ShieldCheck } from 'lucide-react';
import { eq } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { listOpenStartTimes } from '@/lib/bookings/availability';
import { formatSlotJst } from '@/lib/bookings/time';
import type { FeaturedService } from '@/lib/services/featured';
import { personJsonLd, jsonLdScriptText } from '@/lib/seo/jsonld';
import { getSiteUrl } from '@/lib/seo/siteUrl';
import { getResidentProfile } from '@/lib/residents/byId';
import { getCurrentUser } from '@/lib/auth/current-user';
import { CONSULTATION_TAG, topicLabel } from '@/lib/experts/constants';
import { isExperienceOnly, specialtyLabel } from '@/lib/experts/specialties';
import { EnrollmentChip } from '@/components/experts/ExpertCard';
import { deriveEnrollment } from '@/lib/experts/enrollment';
import { getSpecialtiesByUser } from '@/lib/experts/specialtiesByUser';
import { COMMON_LANGUAGES } from '@/lib/resident/constants';
import { ConsultMenuCard } from '@/components/experts/ConsultMenuCard';
import { PlanCard } from '@/components/experts/PlanCard';
import { CareerTimeline } from '@/components/experts/CareerTimeline';

/**
 * /experts/[id] — エキスパート詳細（Intro 型）。id は users.id。
 * mockups/v2/expert-detail-intro.html の実装。
 *
 * 縦長対策（2026-09）: ヒーローは写真を小さく横並びにして「学校＋在学/卒業 → 得意分野 →
 * 認証・言語・評価」を 1 画面に。長いリスト（相談できること / 自己紹介 / 経歴 / レビュー）は
 * 最初の数件だけ見せて <details> で展開。使い方・FAQ は /about-service への 1 行リンクに。
 *
 * 左: ヒーロー → ページ内アンカー → こんな相談に乗れます → 自己紹介 → 経歴 → 記事 → レビュー
 * 右 (sticky、画面より長ければ中でスクロール): 相談メニュー → 継続プラン → 直近の空き枠
 *
 * 留学オンライン相談に合わない項目は表示しない（データは残す）:
 *   在住年数の生表示、オンライン相談 / 30分・60分の汎用メタ、使い方タイル、FAQ 一覧。
 *   familyStage / interests / lookingFor / openToMeetups（会える）はこのページでは元から未使用。
 *
 * データは getResidentProfile のバンドルを流用し、出品サービスのうち
 * tags に 'consultation' を含むものだけを相談メニューとして表示する。
 * 相談メニューが 1 件も無いユーザーはエキスパートではないので 404。
 */

export const metadata = {
  title: 'エキスパート詳細',
};

export default async function ExpertDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [profile, me] = await Promise.all([
    getResidentProfile(params.id, { includeSns: false }),
    getCurrentUser(),
  ]);
  if (!profile) notFound();

  // 公開関門（0084）: 未公開プロフィールは本人と editor 以外に 404。
  // 本人/editor には表示し、上部に「非公開プレビュー」バナーを出す。
  // published はバンドル（getResidentProfile）から取得 — 追加往復なし。
  // 0084 未適用環境はバンドル側で公開扱いフォールバック。
  const isPublished = profile.isProfilePublished;
  const canPreviewUnpublished =
    me != null && (me.id === params.id || me.role === 'editor');
  if (!isPublished && !canPreviewUnpublished) notFound();

  // 相談メニュー 0 件はエキスパートではないので 404。ただし本人 / editor のプレビューは
  // 下書き→公開の導線として表示し、右カラムに「メニューがまだありません」の空状態を出す。
  const menus = profile.services.filter((s) => s.tags.includes(CONSULTATION_TAG));
  const isEmptyPreview = menus.length === 0 && canPreviewUnpublished;
  if (menus.length === 0 && !canPreviewUnpublished) notFound();

  // 価格昇順（30分 → 60分）。最安を「はじめての方に」扱い
  const sortedMenus = [...menus].sort(
    (a, b) => (a.priceJpy ?? Infinity) - (b.priceJpy ?? Infinity),
  );
  const minPrice = sortedMenus[0]?.priceJpy ?? null;

  const cityName =
    sortedMenus.find((s) => s.cityNameJa)?.cityNameJa ?? profile.residencyCity ?? null;
  const languages = profile.languages
    .map((l) => COMMON_LANGUAGES.find((x) => x.code === l.code)?.label ?? l.code)
    .filter(Boolean);
  const menuTopics = Array.from(
    new Set(menus.flatMap((s) => s.tags.filter((t) => t !== CONSULTATION_TAG))),
  );
  const bioParagraphs = (profile.bio ?? '')
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const { avgStars, count: reviewCount, recent } = profile.reviewSummary;
  const articles = profile.articles.slice(0, 4);

  // 得意分野（0080）と国名。どちらも未適用・未設定でも落ちない
  const [specialtiesMap, countryNameJa, durationByServiceId] = await Promise.all([
    getSpecialtiesByUser([profile.id]),
    fetchCountryNameJa(profile.residencyCountry),
    fetchDurations(profile.id),
  ]);
  const specialties = specialtiesMap.get(profile.id) ?? [];
  const hasExperienceOnly = specialties.some(isExperienceOnly);
  // 在学中 / アルムナイ（留学特化）。正式ヘルパ lib/experts/enrollment.ts
  const enrollment = deriveEnrollment(profile.education);

  // 予約可能なメニューの条件（requestBooking のサーバー検証と同一ルール）:
  //   chat メニュー × 価格確定 × 所要時間確定 × その duration で空き候補あり。
  const menuDuration = (s: FeaturedService): number | null =>
    s.contactMethod === 'chat' && s.priceJpy != null
      ? (durationByServiceId.get(s.id) ?? null)
      : null;
  const neededDurations = Array.from(
    new Set(sortedMenus.map(menuDuration).filter((d): d is number => d != null)),
  );
  const openByDuration = new Map<number, Date[]>();
  await Promise.all(
    neededDurations.map(async (d) => {
      openByDuration.set(d, await listOpenStartTimes(profile.id, d));
    }),
  );
  const requestHrefFor = (s: FeaturedService): string | null => {
    const d = menuDuration(s);
    if (d == null) return null;
    return (openByDuration.get(d)?.length ?? 0) > 0
      ? `/experts/${profile.id}/request?service=${s.id}`
      : null;
  };
  const nextSlotFor = (s: FeaturedService): string | null => {
    const d = menuDuration(s);
    const first = d != null ? openByDuration.get(d)?.[0] : undefined;
    return first ? formatSlotJst(first) : null;
  };
  const bookableMenus = sortedMenus.filter((s) => requestHrefFor(s) !== null);
  const hasSlots = bookableMenus.length > 0;
  const nextSlots = (() => {
    const withSlots = Array.from(openByDuration.entries())
      .filter(([, v]) => v.length > 0)
      .sort(([a], [b]) => a - b);
    return withSlots[0]?.[1].slice(0, 3) ?? [];
  })();

  const siteUrl = getSiteUrl();
  const jsonLd = personJsonLd({
    url: `${siteUrl}/experts/${profile.id}`,
    name: profile.displayName,
    description: profile.bio,
    imageUrl: profile.avatarUrl,
    jobTitle: profile.occupation,
    homeLocation: cityName,
  });

  const placeLine = [countryNameJa, cityName ? `${cityName}在住` : null]
    .filter(Boolean)
    .join('・');

  // 縦長対策: 長いリストは最初の数件だけ見せ、残りは <details> に畳む（JS 不要）
  const OFFERINGS_SHOWN = 4;
  const REVIEWS_SHOWN = 2;
  const offeringsShown = profile.offerings.slice(0, OFFERINGS_SHOWN);
  const offeringsRest = profile.offerings.slice(OFFERINGS_SHOWN);
  const reviewsShown = recent.slice(0, REVIEWS_SHOWN);
  const reviewsRest = recent.slice(REVIEWS_SHOWN);
  const [bioLead, ...bioRest] = bioParagraphs;
  const articlesShown = articles.slice(0, 2);
  const hasCareer = profile.workHistory.length > 0 || profile.education.length > 0;

  // ページ内アンカー（存在するセクションだけ）
  const anchors: Array<{ id: string; label: string }> = [
    ...(profile.offerings.length > 0 ? [{ id: 'offerings', label: '相談できること' }] : []),
    ...(bioParagraphs.length > 0 ? [{ id: 'about', label: '自己紹介' }] : []),
    ...(hasCareer ? [{ id: 'career', label: '経歴' }] : []),
    ...(articlesShown.length > 0 ? [{ id: 'articles', label: '記事' }] : []),
    { id: 'reviews', label: 'レビュー' },
  ];

  const renderReview = (r: (typeof recent)[number], i: number) => (
    <div key={r.id} className={'py-4' + (i === 0 ? '' : ' border-t border-border')}>
      <div className="flex items-center gap-3">
        {r.reviewerAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.reviewerAvatarUrl}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-[13px] font-bold text-neutral-700">
            {r.reviewerName.charAt(0)}
          </span>
        )}
        <div>
          <div className="text-[13.5px] font-bold">{r.reviewerName}</div>
          <div className="text-[11.5px] text-neutral-500">{formatMonthJa(r.createdAt)}</div>
        </div>
        <span className="ml-auto text-[12px] font-bold text-neutral-700">
          <span className="text-primary-700">★</span> {r.satisfactionStars.toFixed(1)}
        </span>
      </div>
      {r.body ? (
        <p className="mt-2 text-[13.5px] leading-relaxed text-neutral-700">{r.body}</p>
      ) : null}
    </div>
  );

  return (
    <main className="bg-background text-foreground">
      {/* 非公開プレビュー帯（0084）。本人 / editor にだけ見える。黒地・ライムの再デザイントーン */}
      {!isPublished ? (
        <div role="status" className="border-b border-neutral-800 bg-neutral-900 text-white">
          <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2 text-[12.5px] sm:px-10">
            <span className="inline-flex items-center gap-1.5 font-bold text-primary-500">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-500" aria-hidden />
              非公開プレビュー
            </span>
            <span className="text-neutral-300">
              このページはあなたにだけ表示されています。公開するまで一覧には出ません。
            </span>
            <Link
              href="/settings"
              className="ml-auto inline-flex items-center gap-1 rounded-full border border-primary-500 px-3 py-0.5 font-bold text-primary-500 transition hover:bg-primary-500 hover:text-neutral-950"
            >
              公開設定へ →
            </Link>
          </div>
        </div>
      ) : null}
      <script
        type="application/ld+json"
        // ユーザー入力を含むため jsonLdScriptText で < > & をエスケープ（stored XSS 防止）
        dangerouslySetInnerHTML={{ __html: jsonLdScriptText(jsonLd) }}
      />
      <div className="mx-auto max-w-[1120px] px-5 sm:px-10">
        {/* breadcrumb */}
        <nav className="pb-3 pt-4 text-[12.5px] text-neutral-500" aria-label="パンくず">
          <Link href="/experts" className="hover:text-foreground">
            エキスパート一覧
          </Link>
          {placeLine ? (
            <>
              <span className="mx-2 text-neutral-300">/</span>
              <Link
                href={{
                  pathname: '/experts',
                  query: profile.residencyCountry
                    ? { country: profile.residencyCountry.toLowerCase() }
                    : {},
                }}
                className="hover:text-foreground"
              >
                {placeLine.replace('在住', '')}
              </Link>
            </>
          ) : null}
          <span className="mx-2 text-neutral-300">/</span>
          <span className="text-neutral-400">{profile.displayName}</span>
        </nav>

        <div className="grid items-start gap-7 pb-28 lg:grid-cols-[1fr_360px] lg:gap-12 lg:pb-16">
          {/* ===== left ===== */}
          <div className="min-w-0">
            {/* ===== hero: 写真は小さく横並び、決め手（学校・在学/卒業・得意分野）を 1 画面に ===== */}
            <section className="grid grid-cols-[104px_1fr] gap-4 sm:grid-cols-[168px_1fr] sm:gap-6">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-900">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div
                    className="grid h-full w-full place-items-center bg-[radial-gradient(120%_90%_at_20%_10%,#2b3a12_0%,#141513_55%,#0e0e0f_100%)]"
                    aria-hidden
                  >
                    <span className="select-none text-[44px] font-bold leading-none text-primary-500 sm:text-[64px]">
                      {profile.displayName.charAt(0)}
                    </span>
                  </div>
                )}
                {enrollment ? <EnrollmentChip enrollment={enrollment} /> : null}
              </div>

              <div className="min-w-0">
                <h1 className="flex flex-wrap items-center gap-x-2 text-[24px] font-semibold leading-[1.25] tracking-[-0.01em] sm:text-[28px]">
                  {profile.displayName}
                  {profile.isVerified ? (
                    <BadgeCheck
                      className="h-[20px] w-[20px] shrink-0 text-primary-700"
                      aria-label="居住認証済み"
                    />
                  ) : null}
                </h1>
                {enrollment?.school ? (
                  <div className="mt-1 text-[15px] font-medium text-neutral-700 sm:text-[16px]">
                    {enrollment.school}
                    <span className="ml-2 text-[12.5px] font-normal text-neutral-500">
                      {enrollment.status === 'current'
                        ? '在学中'
                        : `アルムナイ${enrollment.year != null ? `（${enrollment.year}年卒）` : ''}`}
                    </span>
                  </div>
                ) : null}
                {profile.occupation || placeLine ? (
                  <div className="mt-0.5 text-[13.5px] text-neutral-500">
                    {[profile.occupation, placeLine].filter(Boolean).join(' ・ ')}
                  </div>
                ) : null}

                <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-neutral-700">
                  {profile.isVerified ? (
                    <span className="inline-flex items-center gap-1.5 font-semibold">
                      <ShieldCheck className="h-[14px] w-[14px] text-primary-700" aria-hidden />
                      居住認証済み
                    </span>
                  ) : null}
                  {languages.length > 0 ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Globe className="h-[14px] w-[14px] text-neutral-400" aria-hidden />
                      {languages.join('・')}
                    </span>
                  ) : null}
                  {reviewCount > 0 && avgStars != null ? (
                    <a href="#reviews" className="inline-flex items-center gap-1 hover:underline">
                      <span className="text-primary-700">★</span>
                      <b>{avgStars}</b>
                      <span className="text-neutral-500">（{reviewCount}件）</span>
                    </a>
                  ) : null}
                </div>

                {/* 得意分野（コンパクトなチップ。第 1 階層のラベルは省く） */}
                {specialties.length > 0 || menuTopics.length > 0 ? (
                  <div className="mt-3.5">
                    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-700">
                      得意分野
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(specialties.length > 0 ? specialties : menuTopics).map((code) => (
                        <span
                          key={code}
                          className="rounded-full border border-border-strong px-3 py-1 text-[12.5px] font-medium text-neutral-700"
                        >
                          {specialties.length > 0 ? specialtyLabel(code) : topicLabel(code)}
                          {isExperienceOnly(code) ? (
                            <span className="ml-1 text-[10px] text-neutral-400">※</span>
                          ) : null}
                        </span>
                      ))}
                    </div>
                    {hasExperienceOnly ? (
                      <p className="mt-1.5 text-[11px] text-neutral-400">
                        ※ ビザ・奨学金・ローンなどは本人の体験談としてお話しします。専門家による助言ではありません。
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>

            {/* ページ内アンカー */}
            <nav
              aria-label="ページ内"
              className="mt-6 flex gap-1.5 overflow-x-auto border-b border-border pb-3 text-[12.5px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {anchors.map((a) => (
                <a
                  key={a.id}
                  href={`#${a.id}`}
                  className="shrink-0 rounded-full bg-muted px-3 py-1 font-medium text-neutral-700 transition hover:bg-neutral-900 hover:text-white"
                >
                  {a.label}
                </a>
              ))}
              <a
                href="#consult-menu"
                className="shrink-0 rounded-full bg-primary-500 px-3 py-1 font-bold text-neutral-950 lg:hidden"
              >
                相談メニュー
              </a>
            </nav>

            {/* ===== 相談できること（最初の 4 件 + 展開）===== */}
            {profile.offerings.length > 0 ? (
              <Section title="こんな相談に乗れます" id="offerings">
                <ul className="flex max-w-[36em] flex-col gap-2.5">
                  {offeringsShown.map((o) => (
                    <li key={o} className="flex items-start gap-3 text-[14.5px] text-neutral-700">
                      <span className="mt-[3px] grid h-[20px] w-[20px] shrink-0 place-items-center rounded-full bg-neutral-900 text-primary-500">
                        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                      </span>
                      {o}
                    </li>
                  ))}
                </ul>
                {offeringsRest.length > 0 ? (
                  <details className="group mt-2.5">
                    <summary className="inline-flex cursor-pointer list-none items-center rounded-full border border-border-strong px-3.5 py-1.5 text-[12.5px] font-semibold text-neutral-700 transition hover:border-foreground [&::-webkit-details-marker]:hidden group-open:hidden">
                      ほか {offeringsRest.length} 件を表示
                    </summary>
                    <ul className="flex max-w-[36em] flex-col gap-2.5 pt-2.5">
                      {offeringsRest.map((o) => (
                        <li key={o} className="flex items-start gap-3 text-[14.5px] text-neutral-700">
                          <span className="mt-[3px] grid h-[20px] w-[20px] shrink-0 place-items-center rounded-full bg-neutral-900 text-primary-500">
                            <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                          </span>
                          {o}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </Section>
            ) : null}

            {/* ===== 自己紹介（先頭段落 + 続きを読む）===== */}
            {bioLead ? (
              <Section title="自己紹介" id="about">
                <div className="max-w-[36em]">
                  <p className="text-[14.5px] leading-[1.85] text-neutral-700">{bioLead}</p>
                  {bioRest.length > 0 ? (
                    <details className="group mt-2.5">
                      <summary className="inline-flex cursor-pointer list-none items-center rounded-full border border-border-strong px-3.5 py-1.5 text-[12.5px] font-semibold text-neutral-700 transition hover:border-foreground [&::-webkit-details-marker]:hidden group-open:hidden">
                        続きを読む
                      </summary>
                      <div className="space-y-3 pt-3">
                        {bioRest.map((p, i) => (
                          <p key={i} className="text-[14.5px] leading-[1.85] text-neutral-700">
                            {p}
                          </p>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </div>
              </Section>
            ) : null}

            {/* ===== 経歴（3 件 + 展開）===== */}
            {hasCareer ? (
              <Section title="経歴" id="career">
                <div className="max-w-[36em]">
                  <CareerTimeline
                    workHistory={profile.workHistory}
                    education={profile.education}
                    initialCount={3}
                  />
                </div>
              </Section>
            ) : null}

            {/* ===== 記事（2 件）===== */}
            {articlesShown.length > 0 ? (
              <Section title={`${profile.displayName}さんの記事`} id="articles">
                <div className="grid max-w-[640px] gap-4 sm:grid-cols-2">
                  {articlesShown.map((a) => (
                    <Link
                      key={a.id}
                      href={`/articles/${a.id}`}
                      className="flex gap-3.5 overflow-hidden rounded-xl border border-border bg-card p-3 transition hover:border-foreground"
                    >
                      <div className="h-[72px] w-[96px] shrink-0 overflow-hidden rounded-lg bg-muted">
                        {a.coverImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={a.coverImageUrl}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <small className="block text-[11px] text-neutral-500">
                          {ARTICLE_TYPE_LABEL[a.articleType] ?? a.articleType}
                          {a.publishedAt ? ` ・ ${fmtDateDot(a.publishedAt)}` : ''}
                        </small>
                        <b className="mt-0.5 line-clamp-2 block text-[13.5px] font-semibold leading-[1.5]">
                          {a.title}
                        </b>
                      </div>
                    </Link>
                  ))}
                </div>
              </Section>
            ) : null}

            {/* ===== レビュー（2 件 + 展開）===== */}
            <Section title="レビュー" id="reviews">
              {reviewCount > 0 && avgStars != null ? (
                <div className="max-w-[36em]">
                  <div className="mb-1 flex items-baseline gap-2.5 text-[20px] font-semibold">
                    <b className="text-[17px] tracking-[0.06em] text-primary-700">★</b>
                    {avgStars}
                    <small className="text-[13px] font-normal text-neutral-500">
                      {reviewCount}件のレビュー
                    </small>
                  </div>
                  {reviewsShown.map(renderReview)}
                  {reviewsRest.length > 0 ? (
                    <details className="group">
                      <summary className="mt-1 inline-flex cursor-pointer list-none items-center rounded-full border border-border-strong px-3.5 py-1.5 text-[12.5px] font-semibold text-neutral-700 transition hover:border-foreground [&::-webkit-details-marker]:hidden group-open:hidden">
                        ほか {reviewsRest.length} 件のレビューを表示
                      </summary>
                      <div className="border-t border-border">
                        {reviewsRest.map((r, i) => renderReview(r, i + 1))}
                      </div>
                    </details>
                  ) : null}
                </div>
              ) : (
                <p className="text-[14px] text-neutral-500">
                  まだレビューはありません。相談後に最初のレビューを書けます。
                </p>
              )}
            </Section>

            {/* 使い方・FAQ は一覧と /about-service にあるので、ここは 1 行のリンクに */}
            <div className="mt-10 border-t border-border pt-5 text-[13px] text-neutral-500">
              相談の流れ・料金の支払い・時差については
              <Link
                href="/about-service"
                className="ml-1 font-semibold text-neutral-700 underline underline-offset-4 hover:text-foreground"
              >
                使い方とよくある質問
              </Link>
              をご覧ください。
            </div>
          </div>

          {/* ===== right (sticky。画面より長いときは中でスクロール) ===== */}
          <aside
            id="consult-menu"
            className="scroll-mt-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-1 lg:[scrollbar-width:thin]"
          >
            <div className="mb-3 text-[13px] text-neutral-500">
              相談メニュー — <b className="text-foreground">{profile.displayName}</b>さん
            </div>
            {isEmptyPreview ? (
              <div className="mt-3.5 rounded-[6px] border border-dashed border-border-strong px-4 py-6 text-center">
                <b className="block text-[15px] font-semibold">相談メニューがまだありません</b>
                <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-500">
                  30分・60分の相談メニューを 1 本以上登録すると、このページを公開して一覧に載せられます。
                </p>
                <Link
                  href="/settings/services"
                  className="mt-4 inline-flex h-[46px] items-center justify-center rounded-[8px] bg-primary-500 px-6 text-[14.5px] font-bold text-neutral-950 transition hover:bg-primary-300"
                >
                  提供サービスを登録 →
                </Link>
              </div>
            ) : null}
            <div className="flex flex-col">
              {sortedMenus.map((s, i) => (
                <div key={s.id}>
                  {i > 0 ? (
                    <div className="my-5 flex items-center gap-3 text-[12.5px] text-neutral-400 before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
                      または
                    </div>
                  ) : null}
                  <div className={i === 0 ? 'mt-3.5' : ''}>
                    <ConsultMenuCard
                      service={s}
                      ownerName={profile.displayName}
                      viewerUserId={me?.id ?? null}
                      expertId={profile.id}
                      variant={i === 0 ? 'primary' : 'secondary'}
                      tabLabel={
                        i === 0 && sortedMenus.length > 1
                          ? 'はじめての方に'
                          : (durationByServiceId.get(s.id) != null
                              ? `${durationByServiceId.get(s.id)}分`
                              : undefined)
                      }
                      requestHref={requestHrefFor(s)}
                      nextSlotLabel={nextSlotFor(s)}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* 継続プラン（伴走・月額、0083）。単発メニューの下に続ける */}
            {profile.plans.length > 0 ? (
              <div>
                <div className="my-5 flex items-center gap-3 text-[12.5px] text-neutral-400 before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
                  出願完了まで伴走してほしい方に
                </div>
                <div className="flex flex-col gap-6">
                  {profile.plans.map((p) => (
                    <PlanCard
                      key={p.id}
                      plan={p}
                      expertId={profile.id}
                      isOwner={me?.id === profile.id}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {hasSlots ? (
              <div className="mt-5 border-t border-border pt-4">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-[15px] font-semibold">直近の空き枠</h2>
                  <span className="text-[11px] text-neutral-500">日本時間</span>
                </div>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {nextSlots.map((d) => (
                    <li
                      key={d.toISOString()}
                      className="rounded-full bg-muted px-3 py-1 text-[12.5px] font-semibold tabular-nums"
                    >
                      {formatSlotJst(d)}〜
                    </li>
                  ))}
                  {bookableMenus[0] ? (
                    <li>
                      <Link
                        href={`/experts/${profile.id}/request?service=${bookableMenus[0].id}`}
                        className="inline-flex rounded-full border border-border-strong px-3 py-1 text-[12.5px] font-semibold text-neutral-700 transition hover:border-foreground"
                      >
                        すべて見る →
                      </Link>
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}

            <p className="mt-4 text-[11.5px] leading-relaxed text-neutral-400">
              チャットでの事前相談は無料。承諾後にオンラインで相談します。やり取りはすべて Locore 内で完結し、個人連絡先の交換は不要です（決済機能は準備中）。
            </p>
          </aside>
        </div>
      </div>

      {/* mobile bottom CTA */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-[18px] pt-3 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex max-w-[560px] items-center gap-3.5">
          <div className="leading-snug">
            <b className="block text-[19px] font-bold tabular-nums">
              {minPrice != null ? `¥${minPrice.toLocaleString()}` : '応相談'}
              {minPrice != null ? (
                <span className="text-[12px] font-normal text-neutral-500"> /30分〜</span>
              ) : null}
            </b>
            {reviewCount > 0 && avgStars != null ? (
              <span className="text-[10.5px] text-neutral-500">
                ★{avgStars} ・ レビュー{reviewCount}件
              </span>
            ) : null}
          </div>
          {isEmptyPreview ? (
            <Link
              href="/settings/services"
              className="inline-flex flex-1 items-center justify-center rounded-[8px] bg-primary-500 py-3 text-[15px] font-bold text-neutral-950 transition hover:bg-primary-300"
            >
              提供サービスを登録
            </Link>
          ) : (
            <a
              href="#consult-menu"
              className="inline-flex flex-1 items-center justify-center rounded-[8px] bg-primary-500 py-3 text-[15px] font-bold text-neutral-950 transition hover:bg-primary-300"
            >
              {hasSlots ? '空き枠を選ぶ' : 'チャットで相談する'}
            </a>
          )}
        </div>
      </div>
    </main>
  );
}

/** users.residency_country（大文字 alpha-2）→ countries.name_ja。無ければ null */
async function fetchCountryNameJa(code: string | null): Promise<string | null> {
  if (!code) return null;
  try {
    const db = getDb();
    const rows = await db
      .select({ nameJa: schema.countries.nameJa })
      .from(schema.countries)
      .where(eq(schema.countries.code, code.toLowerCase()))
      .limit(1);
    return rows[0]?.nameJa ?? null;
  } catch {
    return null;
  }
}

/** メニューごとの所要時間（0061 の duration_minutes）。未適用環境は空 Map */
async function fetchDurations(userId: string): Promise<Map<string, number | null>> {
  const map = new Map<string, number | null>();
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: schema.userServices.id,
        durationMinutes: schema.userServices.durationMinutes,
      })
      .from(schema.userServices)
      .where(eq(schema.userServices.userId, userId));
    for (const r of rows) map.set(r.id, r.durationMinutes);
  } catch (err) {
    console.warn('[experts/[id]] duration_minutes fetch failed (0061 未適用?):', err);
  }
  return map;
}


function Section({
  title,
  id,
  children,
}: {
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-8 scroll-mt-4">
      <h2 className="mb-3 text-[19px] font-semibold tracking-[-0.005em] sm:text-[20px]">{title}</h2>
      {children}
    </section>
  );
}

function formatMonthJa(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

const ARTICLE_TYPE_LABEL: Record<string, string> = {
  spot_guide: 'スポット紹介',
  itinerary: 'モデルコース',
  expat_info: 'お役立ち情報',
};

/** 記事カードの公開日（2026.07.14 形式、日本時間固定） */
function fmtDateDot(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(d)
    .replace(/\//g, '.');
}
