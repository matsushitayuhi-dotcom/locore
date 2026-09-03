import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, Clock, Globe, Info, ShieldCheck, Video } from 'lucide-react';
import { getResidentProfile } from '@/lib/residents/byId';
import { getCurrentUser } from '@/lib/auth/current-user';
import { countryFlagEmoji } from '@/lib/experts/list';
import { CONSULTATION_TAG, topicLabel } from '@/lib/experts/constants';
import { COMMON_LANGUAGES } from '@/lib/resident/constants';
import { ConsultMenuCard } from '@/components/experts/ConsultMenuCard';

/**
 * /experts/[id] — エキスパート詳細（v2 表側）。id は users.id。
 * mockups/v2/expert-detail.html の実装。
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
    // 記事・SNSリンクはこのページでは使わないので取得をスキップ
    getResidentProfile(params.id, { includeArticles: false, includeSns: false }),
    getCurrentUser(),
  ]);
  if (!profile) notFound();

  const menus = profile.services.filter((s) =>
    s.tags.includes(CONSULTATION_TAG),
  );
  if (menus.length === 0) notFound();

  // 価格昇順（30分 → 60分）。最安を「はじめての方に」扱い
  const sortedMenus = [...menus].sort(
    (a, b) => (a.priceJpy ?? Infinity) - (b.priceJpy ?? Infinity),
  );
  const minPrice = sortedMenus[0]?.priceJpy ?? null;

  const flag = countryFlagEmoji(profile.residencyCountry);
  const cityName =
    sortedMenus.find((s) => s.cityNameJa)?.cityNameJa ??
    profile.residencyCity ??
    null;
  const years =
    profile.writerResidencyYears ??
    (profile.arrivalYear != null
      ? Math.max(0, new Date().getFullYear() - profile.arrivalYear)
      : null);
  const languages = profile.languages
    .map((l) => COMMON_LANGUAGES.find((x) => x.code === l.code)?.label ?? l.code)
    .filter(Boolean);
  const topics = Array.from(
    new Set(
      menus.flatMap((s) => s.tags.filter((t) => t !== CONSULTATION_TAG)),
    ),
  );
  const bioParagraphs = (profile.bio ?? '')
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const { avgStars, count: reviewCount, recent } = profile.reviewSummary;

  return (
    <main className="bg-[#FAFAF7] text-[#18181B]">
      <div className="mx-auto max-w-[1024px] px-6">
        {/* breadcrumb */}
        <div className="pt-5 text-[12.5px] text-[#71717A]">
          <Link href="/experts" className="hover:text-[#D4634A]">
            エキスパート一覧
          </Link>
          {cityName ? (
            <>
              <span className="mx-2 text-[#C9C5BB]">/</span>
              <Link
                href={{
                  pathname: '/experts',
                  query: sortedMenus[0]?.citySlug
                    ? { city: sortedMenus[0].citySlug }
                    : {},
                }}
                className="hover:text-[#D4634A]"
              >
                {flag ? `${flag} ` : ''}
                {cityName}
              </Link>
            </>
          ) : null}
          <span className="mx-2 text-[#C9C5BB]">/</span>
          {profile.displayName}
        </div>

        {/* hero */}
        <section className="border-b border-[#E7E5E0] pb-8 pt-6">
          <div className="flex items-start gap-5 sm:gap-6">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt=""
                className="h-[76px] w-[76px] shrink-0 rounded-full border-[3px] border-white object-cover shadow-[0_2px_6px_rgba(24,24,27,.06)] sm:h-[104px] sm:w-[104px]"
              />
            ) : (
              <span className="grid h-[76px] w-[76px] shrink-0 place-items-center rounded-full border-[3px] border-white bg-[#F4DACE] text-[28px] font-bold text-[#6E2F1F] shadow-[0_2px_6px_rgba(24,24,27,.06)] sm:h-[104px] sm:w-[104px] sm:text-[36px]">
                {profile.displayName.charAt(0)}
              </span>
            )}
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-3 text-[clamp(23px,3vw,29px)] font-bold tracking-tight">
                {profile.displayName}
                {profile.isVerified ? (
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#F4DACE] bg-[#FAF1ED] px-3 py-1 text-[12px] font-bold text-[#A84A35]">
                    <ShieldCheck className="h-[13px] w-[13px] shrink-0" aria-hidden />
                    居住認証済み
                  </span>
                ) : null}
              </h1>
              <div className="mt-1.5 text-[14px] text-[#3F3F46]">
                {flag ? `${flag} ` : ''}
                {cityName ? `${cityName}在住 ` : ''}
                {years != null ? <b className="font-bold">{years}年</b> : null}
                {profile.occupation ? ` ・ ${profile.occupation}` : ''}
              </div>
              <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-[#71717A]">
                {languages.length > 0 ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Globe className="h-[15px] w-[15px] shrink-0 text-[#837F78]" aria-hidden />
                    {languages.join('・')}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <Video className="h-[15px] w-[15px] shrink-0 text-[#837F78]" aria-hidden />
                  オンライン相談
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-[15px] w-[15px] shrink-0 text-[#837F78]" aria-hidden />
                  30分または60分
                </span>
              </div>
              {reviewCount > 0 && avgStars != null ? (
                <div className="mt-3.5 text-[14px] font-bold text-[#3F3F46]">
                  <i className="not-italic text-[#D4634A]">★</i> {avgStars}
                  <a
                    href="#reviews"
                    className="ml-1.5 text-[12.5px] font-normal text-[#71717A] underline underline-offset-4"
                  >
                    レビュー {reviewCount}件を読む
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* 2 columns */}
        <div className="grid items-start gap-2 pb-28 pt-6 lg:grid-cols-[1fr_356px] lg:gap-[52px] lg:pb-24 lg:pt-9">
          {/* sidebar: 相談メニュー（モバイルでは先頭） */}
          <aside
            id="consult-menu"
            className="order-first mb-6 flex flex-col gap-3.5 lg:sticky lg:top-[86px] lg:order-last lg:mb-0"
          >
            <div className="flex items-baseline gap-2 text-[13px] font-bold text-[#3F3F46]">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[#D4634A]">
                Menu
              </span>
              相談メニュー
            </div>
            {sortedMenus.map((s, i) => (
              <ConsultMenuCard
                key={s.id}
                service={s}
                ownerName={profile.displayName}
                viewerUserId={me?.id ?? null}
                expertId={profile.id}
                recommended={i === 0 && sortedMenus.length > 1}
              />
            ))}
            <div className="flex items-start gap-2 rounded-xl bg-[#DCEAF5] px-4 py-3 text-[11.5px] leading-relaxed text-[#1C5384]">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              予約・決済機能は準備中です。まずはチャットで相談内容と日程をすり合わせてください。
            </div>
            <p className="text-center text-[11px] leading-relaxed text-[#837F78]">
              やり取りはすべてLocore内のチャットで行われます。
              <br />
              個人連絡先の交換は相談成立後まで不要です。
            </p>
          </aside>

          {/* main */}
          <div>
            {topics.length > 0 ? (
              <section className="border-b border-[#E7E5E0] pb-7 lg:pt-0">
                <SectionHeading en="Topics">得意分野</SectionHeading>
                <div className="flex flex-wrap gap-2">
                  {topics.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-[#F4F2EC] px-[15px] py-1.5 text-[12.5px] font-medium text-[#3F3F46]"
                    >
                      {topicLabel(t)}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {profile.offerings.length > 0 ? (
              <section className="border-b border-[#E7E5E0] py-7">
                <SectionHeading en="Consultations">
                  こんな相談に乗れます
                </SectionHeading>
                <ul className="flex flex-col gap-3">
                  {profile.offerings.map((o) => (
                    <li
                      key={o}
                      className="flex items-start gap-3 text-[14px] text-[#3F3F46]"
                    >
                      <span className="mt-1 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-[#FAF1ED] text-[#D4634A]">
                        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                      </span>
                      {o}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {bioParagraphs.length > 0 ? (
              <section className="border-b border-[#E7E5E0] py-7">
                <SectionHeading en="About">自己紹介</SectionHeading>
                <div className="space-y-3.5">
                  {bioParagraphs.map((p, i) => (
                    <p
                      key={i}
                      className="text-[14px] leading-loose text-[#3F3F46]"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </section>
            ) : null}

            {reviewCount > 0 ? (
              <section className="py-7" id="reviews">
                <SectionHeading en="Reviews">レビュー</SectionHeading>
                <div className="mb-5 flex items-center gap-3">
                  <span className="text-[25px] font-bold tabular-nums">
                    <i className="mr-1 not-italic text-[20px] text-[#D4634A]">
                      ★
                    </i>
                    {avgStars}
                  </span>
                  <span className="text-[13px] text-[#71717A]">
                    {reviewCount}件のレビュー
                  </span>
                </div>
                {recent.map((r, i) => (
                  <div
                    key={r.id}
                    className={
                      'py-4' +
                      (i === 0 ? '' : ' border-t border-[#E7E5E0]')
                    }
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
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#DCEAF5] text-[14px] font-bold text-[#1C5384]">
                          {r.reviewerName.charAt(0)}
                        </span>
                      )}
                      <div>
                        <div className="text-[13.5px] font-bold">
                          {r.reviewerName}
                        </div>
                        <div className="text-[11.5px] text-[#71717A]">
                          {formatMonthJa(r.createdAt)}
                        </div>
                      </div>
                      <span className="ml-auto text-[12px] font-bold text-[#3F3F46]">
                        <i className="not-italic text-[#D4634A]">★</i>{' '}
                        {r.satisfactionStars.toFixed(1)}
                      </span>
                    </div>
                    {r.body ? (
                      <p className="mt-2 text-[13.5px] leading-relaxed text-[#3F3F46]">
                        {r.body}
                      </p>
                    ) : null}
                  </div>
                ))}
              </section>
            ) : null}
          </div>
        </div>
      </div>

      {/* mobile bottom CTA */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E7E5E0] bg-white/95 px-[18px] pt-3 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex max-w-[560px] items-center gap-3.5">
          <div className="leading-snug">
            <b className="block text-[19px] font-bold tabular-nums">
              {minPrice != null ? `¥${minPrice.toLocaleString()}` : '応相談'}
              {minPrice != null ? (
                <span className="text-[12px] font-normal text-[#71717A]">
                  {' '}
                  /30分〜
                </span>
              ) : null}
            </b>
            {reviewCount > 0 && avgStars != null ? (
              <span className="text-[10.5px] text-[#71717A]">
                ★{avgStars} ・ レビュー{reviewCount}件
              </span>
            ) : null}
          </div>
          <a
            href="#consult-menu"
            className="inline-flex flex-1 items-center justify-center rounded-full bg-[#D4634A] py-3 text-[15px] font-bold text-white transition hover:bg-[#A84A35]"
          >
            チャットで相談する
          </a>
        </div>
      </div>
    </main>
  );
}

function SectionHeading({
  en,
  children,
}: {
  en: string;
  children: React.ReactNode;
}) {
  return (
    <h2 className="mb-[18px] flex items-baseline gap-2.5 text-[19px] font-bold">
      <span className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#D4634A]">
        {en}
      </span>
      {children}
    </h2>
  );
}

function formatMonthJa(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}
