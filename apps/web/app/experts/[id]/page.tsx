import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  BadgeCheck,
  CalendarCheck,
  Check,
  Clock,
  Globe,
  Search,
  ShieldCheck,
  Video,
} from 'lucide-react';
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
import {
  isExperienceOnly,
  specialtyGroupOf,
  specialtyLabel,
} from '@/lib/experts/specialties';
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
 * 左: 大きな正方形の写真（本人の avatarUrl。未登録は黒地にイニシャル）→ 名前・認証 →
 *     得意分野（users.specialties）→ こんな相談に乗れます → 自己紹介 → 経歴 → 記事 → レビュー
 * 右 (sticky): 相談メニュー（最安 = はじめての方に）→ 60 分など → 直近の空き枠 → 進め方
 * 下: 使い方 3 タイル → よくある質問
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

  const menus = profile.services.filter((s) => s.tags.includes(CONSULTATION_TAG));
  if (menus.length === 0) notFound();

  // 公開関門（0084）: 未公開プロフィールは本人と editor 以外に 404。
  // 本人/editor には表示し、上部に「非公開プレビュー」バナーを出す。
  // published はバンドル（getResidentProfile）から取得 — 追加往復なし。
  // 0084 未適用環境はバンドル側で公開扱いフォールバック。
  const isPublished = profile.isProfilePublished;
  const canPreviewUnpublished =
    me != null && (me.id === params.id || me.role === 'editor');
  if (!isPublished && !canPreviewUnpublished) notFound();

  // 価格昇順（30分 → 60分）。最安を「はじめての方に」扱い
  const sortedMenus = [...menus].sort(
    (a, b) => (a.priceJpy ?? Infinity) - (b.priceJpy ?? Infinity),
  );
  const minPrice = sortedMenus[0]?.priceJpy ?? null;

  const cityName =
    sortedMenus.find((s) => s.cityNameJa)?.cityNameJa ?? profile.residencyCity ?? null;
  const years =
    profile.writerResidencyYears ??
    (profile.arrivalYear != null
      ? Math.max(0, new Date().getFullYear() - profile.arrivalYear)
      : null);
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
  // 第 1 階層でまとめて表示（同じ group は 1 行に）
  const specialtyRows = (() => {
    const rows = new Map<string, { label: string; items: string[] }>();
    for (const code of specialties) {
      const g = specialtyGroupOf(code);
      if (!g) continue;
      const row = rows.get(g.code) ?? { label: g.label, items: [] };
      row.items.push(code);
      rows.set(g.code, row);
    }
    return Array.from(rows.values());
  })();
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

  return (
    <main className="bg-background text-foreground">
      {/* 非公開プレビュー帯（0084）。本人 / editor にだけ見える。黒地・ライムの再デザイントーン */}
      {!isPublished ? (
        <div
          role="status"
          className="border-b border-neutral-800 bg-neutral-900 text-white"
        >
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
        <nav className="pb-4 pt-5 text-[13px] text-neutral-700" aria-label="パンくず">
          <Link href="/experts" className="hover:text-foreground">
            エキスパート一覧
          </Link>
          {placeLine ? (
            <>
              <span className="mx-2 text-neutral-400">/</span>
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
          <span className="mx-2 text-neutral-400">/</span>
          <span className="text-neutral-400">{profile.displayName}</span>
        </nav>

        <div className="grid items-start gap-7 pb-28 lg:grid-cols-[1fr_360px] lg:gap-14 lg:pb-20">
          {/* ===== left ===== */}
          <div className="min-w-0">
            {/* photo */}
            <div className="relative aspect-square max-w-[360px] overflow-hidden rounded-xl bg-neutral-900">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="grid h-full w-full place-items-center bg-[radial-gradient(120%_90%_at_20%_10%,#2b3a12_0%,#141513_55%,#0e0e0f_100%)]"
                  aria-hidden
                >
                  <span className="select-none text-[120px] font-bold leading-none text-primary-500">
                    {profile.displayName.charAt(0)}
                  </span>
                </div>
              )}
              {enrollment ? <EnrollmentChip enrollment={enrollment} size="md" /> : null}
              {cityName ? (
                <span className="absolute right-3.5 top-3.5 rounded-md bg-black/45 px-2 py-0.5 text-[11px] font-bold tracking-[0.08em] text-white backdrop-blur-sm">
                  {cityName}
                  {profile.residencyCountry ? `, ${profile.residencyCountry.toUpperCase()}` : ''}
                </span>
              ) : null}
              {profile.isVerified ? (
                <span className="absolute bottom-3.5 left-3.5 inline-flex items-center gap-1.5 rounded-lg bg-neutral-900/95 px-3 py-1.5 text-[13px] font-bold text-white">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary-500" aria-hidden />
                  居住認証済み
                </span>
              ) : null}
            </div>

            {/* who */}
            <div className="mt-5">
              <h1 className="flex items-center gap-2 text-[28px] font-semibold leading-[1.3] tracking-[-0.01em] sm:text-[30px]">
                {profile.displayName}
                {profile.isVerified ? (
                  <BadgeCheck
                    className="h-[22px] w-[22px] shrink-0 text-primary-700"
                    aria-label="居住認証済み"
                  />
                ) : null}
              </h1>
              {enrollment?.school ? (
                <div className="mt-1 text-[16px] font-medium text-neutral-700">
                  {enrollment.school}
                  <span className="ml-2 text-[13px] font-normal text-neutral-500">
                    {enrollment.status === 'current'
                      ? '在学中'
                      : `アルムナイ${enrollment.year != null ? `（${enrollment.year}年卒）` : ''}`}
                  </span>
                </div>
              ) : null}
              <div className="mt-1 text-[15px] text-neutral-500">
                {[profile.occupation, placeLine ? `${placeLine}${years != null ? ` ${years}年` : ''}` : null]
                  .filter(Boolean)
                  .join(' ・ ')}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-[18px] gap-y-2 text-[13.5px] text-neutral-700">
                {languages.length > 0 ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Globe className="h-[15px] w-[15px] text-neutral-400" aria-hidden />
                    {languages.join('・')}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <Video className="h-[15px] w-[15px] text-neutral-400" aria-hidden />
                  オンライン相談
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-[15px] w-[15px] text-neutral-400" aria-hidden />
                  30分 / 60分
                </span>
              </div>
              {reviewCount > 0 && avgStars != null ? (
                <div className="mt-2.5 text-[14px] text-neutral-700">
                  <b className="tracking-[0.06em] text-primary-700">★</b> {avgStars}
                  <a
                    href="#reviews"
                    className="ml-2 text-[12.5px] text-neutral-500 underline underline-offset-4"
                  >
                    レビュー {reviewCount}件
                  </a>
                </div>
              ) : null}
            </div>

            {/* 得意分野 */}
            {specialtyRows.length > 0 || menuTopics.length > 0 ? (
              <Section title="得意分野">
                {specialtyRows.length > 0 ? (
                  <div className="flex flex-col gap-2.5">
                    {specialtyRows.map((row) => (
                      <div key={row.label} className="flex flex-wrap items-center gap-2">
                        <span className="mr-1 text-[12px] font-semibold text-neutral-500">
                          {row.label}
                        </span>
                        {row.items.map((code) => (
                          <span
                            key={code}
                            className="rounded-full border border-border-strong px-[14px] py-1.5 text-[13px] font-medium text-neutral-700"
                          >
                            {specialtyLabel(code)}
                            {isExperienceOnly(code) ? (
                              <span className="ml-1 text-[10px] text-neutral-400">※</span>
                            ) : null}
                          </span>
                        ))}
                      </div>
                    ))}
                    {hasExperienceOnly ? (
                      <p className="text-[11.5px] text-neutral-400">
                        ※ ビザ・税務・資産などは本人の体験談としてお話しします。専門家による助言ではありません。
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {menuTopics.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-border-strong px-[14px] py-1.5 text-[13px] font-medium text-neutral-700"
                      >
                        {topicLabel(t)}
                      </span>
                    ))}
                  </div>
                )}
              </Section>
            ) : null}

            {profile.offerings.length > 0 ? (
              <Section title="こんな相談に乗れます">
                <ul className="flex max-w-[36em] flex-col gap-3">
                  {profile.offerings.map((o) => (
                    <li key={o} className="flex items-start gap-3 text-[15px] text-neutral-700">
                      <span className="mt-[3px] grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-neutral-900 text-primary-500">
                        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                      </span>
                      {o}
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {bioParagraphs.length > 0 ? (
              <Section title="自己紹介">
                <div className="max-w-[36em] space-y-3.5">
                  {bioParagraphs.map((p, i) => (
                    <p key={i} className="text-[15px] leading-[1.9] text-neutral-700">
                      {p}
                    </p>
                  ))}
                </div>
              </Section>
            ) : null}

            {profile.workHistory.length > 0 || profile.education.length > 0 ? (
              <Section title="経歴">
                <div className="max-w-[36em]">
                  <CareerTimeline
                    workHistory={profile.workHistory}
                    education={profile.education}
                  />
                </div>
              </Section>
            ) : null}

            {articles.length > 0 ? (
              <Section title={`${profile.displayName}さんの記事`} id="articles">
                <p className="-mt-1 mb-4 max-w-[46em] text-[13.5px] text-neutral-500">
                  現地での暮らしについて、実体験をもとに書いています。相談の前の予習にどうぞ。
                </p>
                <div className="grid max-w-[640px] gap-4 sm:grid-cols-2">
                  {articles.map((a) => (
                    <Link
                      key={a.id}
                      href={`/articles/${a.id}`}
                      className="block overflow-hidden rounded-xl border border-border bg-card transition hover:border-foreground"
                    >
                      <div className="aspect-[16/9] bg-muted">
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
                      <div className="px-3.5 pb-3.5 pt-3">
                        <small className="block text-[11px] text-neutral-500">
                          {ARTICLE_TYPE_LABEL[a.articleType] ?? a.articleType}
                          {a.publishedAt ? ` ・ ${fmtDateDot(a.publishedAt)}` : ''}
                        </small>
                        <b className="mt-1 line-clamp-2 block text-[14px] font-semibold leading-[1.5]">
                          {a.title}
                        </b>
                      </div>
                    </Link>
                  ))}
                </div>
              </Section>
            ) : null}

            <Section title="レビュー" id="reviews">
              {reviewCount > 0 && avgStars != null ? (
                <div className="max-w-[36em]">
                  <div className="mb-3 flex items-baseline gap-2.5 text-[22px] font-semibold">
                    <b className="text-[18px] tracking-[0.06em] text-primary-700">★</b>
                    {avgStars}
                    <small className="text-[13px] font-normal text-neutral-500">
                      {reviewCount}件のレビュー
                    </small>
                  </div>
                  {recent.map((r, i) => (
                    <div
                      key={r.id}
                      className={'py-4' + (i === 0 ? '' : ' border-t border-border')}
                    >
                      <div className="flex items-center gap-3">
                        {r.reviewerAvatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.reviewerAvatarUrl}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted text-[14px] font-bold text-neutral-700">
                            {r.reviewerName.charAt(0)}
                          </span>
                        )}
                        <div>
                          <div className="text-[13.5px] font-bold">{r.reviewerName}</div>
                          <div className="text-[11.5px] text-neutral-500">
                            {formatMonthJa(r.createdAt)}
                          </div>
                        </div>
                        <span className="ml-auto text-[12px] font-bold text-neutral-700">
                          <span className="text-primary-700">★</span>{' '}
                          {r.satisfactionStars.toFixed(1)}
                        </span>
                      </div>
                      {r.body ? (
                        <p className="mt-2 text-[13.5px] leading-relaxed text-neutral-700">
                          {r.body}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[14px] text-neutral-500">
                  まだレビューはありません。相談後に最初のレビューを書けます。
                </p>
              )}
            </Section>
          </div>

          {/* ===== right (sticky) ===== */}
          <aside id="consult-menu" className="lg:sticky lg:top-5">
            <div className="mb-3 text-[13px] text-neutral-500">
              相談メニュー — <b className="text-foreground">{profile.displayName}</b>さん
            </div>
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

            {/* 継続プラン（伴走・月額、0083）。単発メニューの下に「または」で続ける */}
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
              <div className="mt-6 border-t border-border pt-5">
                <h2 className="text-[19px] font-medium">直近の空き枠</h2>
                <ul className="mt-3 grid gap-2 rounded-xl bg-muted px-[18px] py-4">
                  {nextSlots.map((d) => (
                    <li
                      key={d.toISOString()}
                      className="flex items-center justify-between text-[14px] font-semibold tabular-nums"
                    >
                      {formatSlotJst(d)}〜
                      <small className="text-[11.5px] font-normal text-neutral-500">
                        日本時間
                      </small>
                    </li>
                  ))}
                </ul>
                {bookableMenus[0] ? (
                  <Link
                    href={`/experts/${profile.id}/request?service=${bookableMenus[0].id}`}
                    className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary-700 hover:underline hover:underline-offset-4"
                  >
                    すべての空き枠を見る →
                  </Link>
                ) : null}
                <p className="mt-3 text-[12px] leading-relaxed text-neutral-500">
                  承諾されると参加リンクが共有され、そのままオンラインで相談できます（決済機能は準備中）。
                </p>
              </div>
            ) : null}

            <div className="mt-6">
              <h2 className="text-[19px] font-medium">相談の進め方</h2>
              <div className="mt-3 rounded-xl bg-muted p-[18px]">
                <ul className="flex flex-col gap-1.5 text-[14px] text-neutral-700">
                  <li className="flex gap-2">
                    <span className="text-neutral-400">–</span>
                    まずチャットで相談内容を伝えられます（無料）
                  </li>
                  <li className="flex gap-2">
                    <span className="text-neutral-400">–</span>
                    空き枠から希望日時を選んでリクエスト
                  </li>
                  <li className="flex gap-2">
                    <span className="text-neutral-400">–</span>
                    承諾後、オンラインのビデオ通話で相談
                  </li>
                </ul>
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-neutral-400">
                やり取りはすべて Locore 内のチャットで行われます。個人連絡先の交換は相談成立後まで不要です。
              </p>
            </div>
          </aside>
        </div>

        {/* ===== bottom ===== */}
        <section className="border-t border-border pb-24 pt-10 lg:pb-20">
          <h2 className="text-[22px] font-medium">使い方</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <HowTile icon={<Search className="h-6 w-6" aria-hidden />} title="エキスパートを探す">
              国とテーマで絞り込み、プロフィールと相談メニューを見て選びます
            </HowTile>
            <HowTile
              icon={<CalendarCheck className="h-6 w-6" aria-hidden />}
              title="空き枠を選んで予約"
            >
              日本時間の空き枠から選んでリクエスト。チャットでの事前相談は無料です
            </HowTile>
            <HowTile icon={<Video className="h-6 w-6" aria-hidden />} title="オンラインで話す">
              ビデオ通話で、あなたの事情に合わせた「現地のリアル」を聞けます
            </HowTile>
          </div>

          <h2 className="mt-12 text-[22px] font-medium">よくある質問</h2>
          <div className="mt-2">
            <Faq q="相談はどうやって行われますか？">
              Locore 内のチャットで内容と日程をすり合わせたあと、オンラインのビデオ通話で行います。
            </Faq>
            <Faq q="時間はどのくらいですか？">メニューごとに 30 分または 60 分です。</Faq>
            <Faq q="料金はいつ支払いますか？">
              決済機能は準備中です。承諾後の支払い方法はチャットでご案内します。
            </Faq>
            <Faq q="時差はどうなりますか？">空き枠はすべて日本時間で表示しています。</Faq>
            <Faq q="同じエキスパートに何度も相談できますか？">
              はい。空き枠があればいつでも再度リクエストできます。
            </Faq>
          </div>
        </section>
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
          <a
            href="#consult-menu"
            className="inline-flex flex-1 items-center justify-center rounded-[8px] bg-primary-500 py-3 text-[15px] font-bold text-neutral-950 transition hover:bg-primary-300"
          >
            {hasSlots ? '空き枠を選ぶ' : 'チャットで相談する'}
          </a>
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
    <section id={id} className="mt-9 scroll-mt-20">
      <h2 className="mb-3.5 text-[22px] font-medium tracking-[-0.005em] sm:text-[24px]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function HowTile({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] bg-muted px-6 pb-6 pt-7 text-center">
      <span className="mx-auto mb-3.5 grid h-[54px] w-[54px] place-items-center rounded-full border-[1.5px] border-foreground">
        {icon}
      </span>
      <b className="block text-[15.5px] font-semibold">{title}</b>
      <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-500">{children}</p>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-border">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[15.5px] font-medium [&::-webkit-details-marker]:hidden">
        {q}
        <span
          className="text-[22px] font-light text-neutral-700 transition-transform group-open:rotate-45"
          aria-hidden
        >
          +
        </span>
      </summary>
      <div className="max-w-[44em] pb-5 text-[14px] leading-relaxed text-neutral-700">
        {children}
      </div>
    </details>
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
