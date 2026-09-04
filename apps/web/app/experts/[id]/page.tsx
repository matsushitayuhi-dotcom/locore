import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, Clock, Globe, Info, ShieldCheck, Video } from 'lucide-react';
import { personJsonLd, jsonLdScriptText } from '@/lib/seo/jsonld';
import { getSiteUrl } from '@/lib/seo/siteUrl';
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
    // 記事は「◯◯さんの記事」セクションで使う（ブログ再位置付け）。SNS は不使用
    getResidentProfile(params.id, { includeSns: false }),
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
  const articles = profile.articles.slice(0, 4);

  // Person JSON-LD（SEO: 記事の著者 = エキスパート本人を検索エンジンに伝える）
  const siteUrl = getSiteUrl();
  const jsonLd = personJsonLd({
    url: `${siteUrl}/experts/${profile.id}`,
    name: profile.displayName,
    description: profile.bio,
    imageUrl: profile.avatarUrl,
    jobTitle: profile.occupation,
    homeLocation: cityName,
  });

  return (
    <main className="bg-background text-foreground">
      <script
        type="application/ld+json"
        // ユーザー入力（displayName / bio / occupation）を含むため必ず
        // jsonLdScriptText で < > & をエスケープする（stored XSS 防止）
        dangerouslySetInnerHTML={{ __html: jsonLdScriptText(jsonLd) }}
      />
      <div className="mx-auto max-w-[1024px] px-6">
        {/* breadcrumb */}
        <div className="pt-5 text-[12.5px] text-neutral-500">
          <Link href="/experts" className="hover:text-primary-700">
            エキスパート一覧
          </Link>
          {cityName ? (
            <>
              <span className="mx-2 text-border-strong">/</span>
              <Link
                href={{
                  pathname: '/experts',
                  query: sortedMenus[0]?.citySlug
                    ? { city: sortedMenus[0].citySlug }
                    : {},
                }}
                className="hover:text-primary-700"
              >
                {flag ? `${flag} ` : ''}
                {cityName}
              </Link>
            </>
          ) : null}
          <span className="mx-2 text-border-strong">/</span>
          {profile.displayName}
        </div>

        {/* hero */}
        <section className="border-b border-border pb-8 pt-6">
          <div className="flex items-start gap-5 sm:gap-6">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt=""
                className="h-[76px] w-[76px] shrink-0 rounded-full border-[3px] border-white object-cover shadow-sm sm:h-[104px] sm:w-[104px]"
              />
            ) : (
              <span className="grid h-[76px] w-[76px] shrink-0 place-items-center rounded-full border-[3px] border-white bg-primary-100 text-[28px] font-bold text-primary-900 shadow-sm sm:h-[104px] sm:w-[104px] sm:text-[36px]">
                {profile.displayName.charAt(0)}
              </span>
            )}
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-3 text-[clamp(23px,3vw,29px)] font-bold tracking-tight">
                {profile.displayName}
                {profile.isVerified ? (
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-primary-300 bg-primary-100 px-3 py-1 text-[12px] font-bold text-primary-900">
                    <ShieldCheck className="h-[13px] w-[13px] shrink-0" aria-hidden />
                    居住認証済み
                  </span>
                ) : null}
              </h1>
              <div className="mt-1.5 text-[14px] text-neutral-700">
                {flag ? `${flag} ` : ''}
                {cityName ? `${cityName}在住 ` : ''}
                {years != null ? <b className="font-bold">{years}年</b> : null}
                {profile.occupation ? ` ・ ${profile.occupation}` : ''}
              </div>
              <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-neutral-500">
                {languages.length > 0 ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Globe className="h-[15px] w-[15px] shrink-0 text-neutral-400" aria-hidden />
                    {languages.join('・')}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <Video className="h-[15px] w-[15px] shrink-0 text-neutral-400" aria-hidden />
                  オンライン相談
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-[15px] w-[15px] shrink-0 text-neutral-400" aria-hidden />
                  30分または60分
                </span>
              </div>
              {reviewCount > 0 && avgStars != null ? (
                <div className="mt-3.5 text-[14px] font-bold text-neutral-700">
                  <i className="not-italic text-primary-700">★</i> {avgStars}
                  <a
                    href="#reviews"
                    className="ml-1.5 text-[12.5px] font-normal text-neutral-500 underline underline-offset-4"
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
            <div className="flex items-baseline gap-2 text-[13px] font-bold text-neutral-700">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-primary-700">
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
            <div className="flex items-start gap-2 rounded-xl bg-info-50 px-4 py-3 text-[11.5px] leading-relaxed text-info-500">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              予約・決済機能は準備中です。まずはチャットで相談内容と日程をすり合わせてください。
            </div>
            <p className="text-center text-[11px] leading-relaxed text-neutral-400">
              やり取りはすべてLocore内のチャットで行われます。
              <br />
              個人連絡先の交換は相談成立後まで不要です。
            </p>
          </aside>

          {/* main */}
          <div>
            {topics.length > 0 ? (
              <section className="border-b border-border pb-7 lg:pt-0">
                <SectionHeading en="Topics">得意分野</SectionHeading>
                <div className="flex flex-wrap gap-2">
                  {topics.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-muted px-[15px] py-1.5 text-[12.5px] font-medium text-neutral-700"
                    >
                      {topicLabel(t)}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {profile.offerings.length > 0 ? (
              <section className="border-b border-border py-7">
                <SectionHeading en="Consultations">
                  こんな相談に乗れます
                </SectionHeading>
                <ul className="flex flex-col gap-3">
                  {profile.offerings.map((o) => (
                    <li
                      key={o}
                      className="flex items-start gap-3 text-[14px] text-neutral-700"
                    >
                      <span className="mt-1 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-primary-50 text-primary-700">
                        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                      </span>
                      {o}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {bioParagraphs.length > 0 ? (
              <section className="border-b border-border py-7">
                <SectionHeading en="About">自己紹介</SectionHeading>
                <div className="space-y-3.5">
                  {bioParagraphs.map((p, i) => (
                    <p
                      key={i}
                      className="text-[14px] leading-loose text-neutral-700"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </section>
            ) : null}

            {/* ブログ再位置付け: 記事は「この人は本当に詳しい」の裏付け。価格・購入UIなし */}
            {articles.length > 0 ? (
              <section
                id="articles"
                className="scroll-mt-20 border-b border-border py-7"
              >
                <SectionHeading en="Articles">
                  {profile.displayName}さんの記事
                </SectionHeading>
                <p className="-mt-2 mb-[18px] max-w-[46em] text-[13px] text-neutral-500">
                  現地での暮らしについて、実体験をもとに書いています。相談の前の予習にどうぞ。
                </p>
                <div className="grid gap-5 sm:grid-cols-2">
                  {articles.map((a) => (
                    <Link
                      key={a.id}
                      href={`/articles/${a.id}`}
                      className="block overflow-hidden rounded-2xl border border-border bg-card shadow-xs transition duration-300 hover:-translate-y-[3px] hover:border-primary-300 hover:shadow-md"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                        {a.coverImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={a.coverImageUrl}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span
                            className="grid h-full w-full place-items-center text-[38px]"
                            aria-hidden
                          >
                            📝
                          </span>
                        )}
                        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-[11px] py-1 text-[10px] font-medium text-foreground backdrop-blur-sm">
                          {ARTICLE_TYPE_LABEL[a.articleType] ?? a.articleType}
                        </span>
                      </div>
                      <div className="px-[18px] pb-[17px] pt-[15px]">
                        <h3 className="line-clamp-2 text-[15px] font-bold leading-relaxed">
                          {a.title}
                        </h3>
                        <div className="mt-1.5 text-[11px] tabular-nums text-neutral-500">
                          {fmtDateDot(a.publishedAt)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                {/* /users/[id] はログインゲート下で未ログイン訪問者の行き止まりに
                    なるため「すべて見る」リンクは出さない（このページ自体が
                    予習用の記事セクション）。 */}
              </section>
            ) : null}

            {reviewCount > 0 ? (
              <section className="py-7" id="reviews">
                <SectionHeading en="Reviews">レビュー</SectionHeading>
                <div className="mb-5 flex items-center gap-3">
                  <span className="text-[25px] font-bold tabular-nums">
                    <i className="mr-1 not-italic text-[20px] text-primary-700">
                      ★
                    </i>
                    {avgStars}
                  </span>
                  <span className="text-[13px] text-neutral-500">
                    {reviewCount}件のレビュー
                  </span>
                </div>
                {recent.map((r, i) => (
                  <div
                    key={r.id}
                    className={
                      'py-4' +
                      (i === 0 ? '' : ' border-t border-border')
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
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-info-50 text-[14px] font-bold text-info-500">
                          {r.reviewerName.charAt(0)}
                        </span>
                      )}
                      <div>
                        <div className="text-[13.5px] font-bold">
                          {r.reviewerName}
                        </div>
                        <div className="text-[11.5px] text-neutral-500">
                          {formatMonthJa(r.createdAt)}
                        </div>
                      </div>
                      <span className="ml-auto text-[12px] font-bold text-neutral-700">
                        <i className="not-italic text-primary-700">★</i>{' '}
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
              </section>
            ) : null}
          </div>
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
                <span className="text-[12px] font-normal text-neutral-500">
                  {' '}
                  /30分〜
                </span>
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
            className="inline-flex flex-1 items-center justify-center rounded-full bg-primary-500 py-3 text-[15px] font-bold text-neutral-950 transition hover:bg-primary-300"
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
      <span className="text-[11px] font-semibold uppercase tracking-[0.13em] text-primary-700">
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

const ARTICLE_TYPE_LABEL: Record<string, string> = {
  spot_guide: 'スポット紹介',
  itinerary: 'モデルコース',
  expat_info: 'お役立ち情報',
};

/**
 * 記事カードの公開日（2026.07.14 形式）。
 * サーバーのローカル TZ に依存しないよう日本時間で固定フォーマットする。
 */
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
