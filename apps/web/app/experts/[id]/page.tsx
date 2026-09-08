import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BadgeCheck, Check, Globe, ShieldCheck } from 'lucide-react';
import { eq } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { listOpenStartTimes } from '@/lib/bookings/availability';
import type { FeaturedService } from '@/lib/services/featured';
import { personJsonLd, jsonLdScriptText } from '@/lib/seo/jsonld';
import { getSiteUrl } from '@/lib/seo/siteUrl';
import { getResidentProfile } from '@/lib/residents/byId';
import { getCurrentUser } from '@/lib/auth/current-user';
import { isFollowing } from '@/lib/follow/actions';
import { FavoriteExpertButton } from '@/components/experts/FavoriteExpertButton';
import { recordProfileView } from '@/lib/dashboard/views';
import { getPublicBadges } from '@/lib/dashboard/milestones';
import { CONSULTATION_TAG, topicLabel } from '@/lib/experts/constants';
import { isExperienceOnly, specialtyLabel } from '@/lib/experts/specialties';
import { LocalSlotTime, LocalTzLabel } from '@/components/experts/LocalSlotTime';
import { formatSchoolName } from '@/lib/experts/education';
import { deriveEnrollment } from '@/lib/experts/enrollment';
import { getSpecialtiesByUser } from '@/lib/experts/specialtiesByUser';
import {
  getApprovedQualificationsByUser,
  qualificationDisplayName,
} from '@/lib/experts/qualifications';
import { COMMON_LANGUAGES } from '@/lib/resident/constants';
import { ConsultMenuCard } from '@/components/experts/ConsultMenuCard';
import { PlanCard } from '@/components/experts/PlanCard';
import { CareerTimeline } from '@/components/experts/CareerTimeline';
import { MediaLinks, countMedia, type MediaArticle } from '@/components/experts/MediaLinks';
import { SocialIcons } from '@/components/residents/SocialIcons';
import { countAdmissions, groupAdmissions } from '@/lib/experts/admissions';

/**
 * /experts/[id] — エキスパート詳細（Intro 型）。id は users.id。
 * mockups/v2/expert-detail-intro.html の実装。
 *
 * LinkedIn 準拠の刷新（2026-09）:
 *   - ヒーローは「写真 ＋ 名前 ＋ 見出し（学校）＋ 所在地」だけを横並びにし、
 *     バッジ・言語・SNS・得意分野は写真の下の全幅に置く（写真の下に空白を作らない）。
 *     在学中 / アルムナイのチップは写真に重ねず名前の下の学校名の隣へ（顔に被らない）。
 *   - ページ内アンカー（タブ）は廃止。セクションを縦に積み、区切り線だけで読ませる。
 *   - 長いリスト（自己紹介 / 相談できること / 経歴 / レビュー）は最初の数件を見せて <details> で展開。
 *   - 使い方・FAQ は /about-service への 1 行リンク。
 *
 * 左: ヒーロー → 自己紹介 → こんな相談に乗れます →（モバイルはここに相談メニュー）→ 合格実績 →
 *     経歴 → 資格 → 発信・メディア（Locore 記事が最優先、外部リンクは featured / card / button・0088）→ レビュー
 * 右 (sticky、画面より長ければ中でスクロール): 相談メニュー → 継続プラン → 直近の空き枠
 * モバイル（1 カラム）では DOM 順どおり「人物（自己紹介）が先、サービスは後」。
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
    getResidentProfile(params.id),
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
  const [specialtiesMap, countryNameJa, durationByServiceId, qualsMap] = await Promise.all([
    getSpecialtiesByUser([profile.id]),
    fetchCountryNameJa(profile.residencyCountry),
    fetchDurations(profile.id),
    // 資格・スコア（0086）: 運営が合格証明を確認した approved だけ
    getApprovedQualificationsByUser([profile.id]),
  ]);
  const qualifications = qualsMap.get(profile.id) ?? [];
  // お気に入り（= フォロー）。本人には出さない
  const isMe = me?.id === profile.id;
  const [favorited, publicBadges] = await Promise.all([
    me && !isMe ? isFollowing(profile.id) : Promise.resolve(false),
    getPublicBadges(profile.id),
  ]);
  // 閲覧数（0090）: 本人・editor は数えない。失敗しても描画は続く
  if (!isMe && me?.role !== 'editor') await recordProfileView(profile.id);
  const specialties = specialtiesMap.get(profile.id) ?? [];
  const hasExperienceOnly = specialties.some(isExperienceOnly);
  // 在学中 / アルムナイ（留学特化）。正式ヘルパ lib/experts/enrollment.ts
  const enrollment = deriveEnrollment(profile.education);
  // ヒーローの学校表示は「正式名称（English）」。enrollment が指す学歴エントリを引き直す
  const enrollmentEntry = enrollment
    ? (profile.education.find(
        (e) => e.school === enrollment.school && (enrollment.status !== 'current' || !!e.current),
      ) ?? profile.education.find((e) => e.school === enrollment.school) ?? null)
    : null;
  const schoolLabel = enrollmentEntry ? formatSchoolName(enrollmentEntry) : enrollment?.school ?? null;

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
  // 直近の空き枠は ISO で渡し、表示は Client 側で相談者の現地 TZ に変換する（LocalSlotTime）
  const nextSlotIsoFor = (s: FeaturedService): string | null => {
    const d = menuDuration(s);
    const first = d != null ? openByDuration.get(d)?.[0] : undefined;
    return first ? first.toISOString() : null;
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
  // 発信・メディア（0088）: Locore 記事（最大 3 件）が最優先、外部リンクはその下
  const mediaArticles: MediaArticle[] = articles.slice(0, 3).map((a) => ({
    id: a.id,
    title: a.title,
    coverImageUrl: a.coverImageUrl,
    typeLabel: ARTICLE_TYPE_LABEL[a.articleType] ?? a.articleType,
    dateLabel: a.publishedAt ? fmtDateDot(a.publishedAt) : null,
  }));
  const mediaCount = countMedia(mediaArticles, profile.socialLinks);
  const hasCareer = profile.workHistory.length > 0 || profile.education.length > 0;
  // 合格実績（0087）: 出願年つき学歴（進学）＋ 進学しなかった合格校を出願年ごとに
  const admissionGroups = groupAdmissions(profile.education, profile.admissions);
  const admissionCount = countAdmissions(admissionGroups);

  // ページ内アンカー（タブ）の一覧は廃止（LinkedIn 同様、縦スクロールで読ませる）。
  // 各セクションの id 自体は #reviews / #consult-menu を使うので残してある。

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
        <div className="min-w-0">
          <div className="text-[13.5px] font-bold">{r.reviewerName}</div>
          <div className="text-[11.5px] text-neutral-500">{formatMonthJa(r.createdAt)}</div>
        </div>
        <span className="ml-auto shrink-0 whitespace-nowrap text-[12px] font-bold text-neutral-700">
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
              className="ml-auto inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-primary-500 px-3 py-0.5 font-bold text-primary-500 transition hover:bg-primary-500 hover:text-neutral-950"
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

        {/* 縦の間隔は Section 側（mt-6 + border-t + pt-6）が持つので grid の gap-y は 0。
            下部の余白: 以前は pb-28（112px）を「固定 CTA の逃げ」として入れていたが、
            この下には必ず SiteFooter（mt-16 = 64px）が続くので逃げは二重。
            最後の「使い方とよくある質問」の下に 176px の空白ができていた。
            本文の最後が CTA に隠れることは footer 分で起こり得ないので、pb は余白ぶんだけに戻す */}
        <div className="grid items-start gap-y-0 pb-4 lg:grid-cols-[1fr_360px] lg:gap-x-12 lg:pb-10">
          {/* ===== left-top: ヒーロー ＋ 自己紹介 ＋ 相談できること
               （モバイルでは相談メニューがこの直後に来るので、サービスより先に人物が読める）===== */}
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            {/* ===== hero（LinkedIn 準拠）: 写真 ＋ 名前 ＋ 見出し（学校）＋ 所在地 だけを横に並べ、
                 バッジ・言語・SNS・得意分野は写真の下の「全幅」に置く。
                 以前は右カラムに全部を積んでいたため、写真（104px）の下だけが大きく空いていた。
                 写真を 92px にして右を 3 行（名前 / 学校 / 職業・所在地）に絞ると高さがほぼ揃う ===== */}
            <section>
              <div className="flex items-start gap-3.5 sm:gap-5">
                <div className="aspect-square w-[92px] max-w-full shrink-0 overflow-hidden rounded-xl bg-neutral-900 sm:w-[132px]">
                  {profile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div
                      className="grid h-full w-full place-items-center bg-[radial-gradient(120%_90%_at_20%_10%,#2b3a12_0%,#141513_55%,#0e0e0f_100%)]"
                      aria-hidden
                    >
                      <span className="select-none text-[38px] font-bold leading-none text-primary-500 sm:text-[56px]">
                        {profile.displayName.charAt(0)}
                      </span>
                    </div>
                  )}
                  {/* 在学中 / アルムナイのチップは写真に重ねると顔に被るので、隣の学校名の行へ移した */}
                </div>

                <div className="min-w-0 flex-1">
                  <h1 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[21px] font-semibold leading-[1.25] tracking-[-0.01em] sm:text-[28px]">
                    {profile.displayName}
                    {profile.isVerified ? (
                      <BadgeCheck
                        className="h-[18px] w-[18px] shrink-0 text-primary-700"
                        aria-label="在籍確認済み"
                      />
                    ) : null}
                  </h1>
                  {/* 見出し行（LinkedIn の headline）。学校名は縮む側 min-w-0、ステータスは縮まない側 */}
                  {enrollment && schoolLabel ? (
                    <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[14px] font-medium leading-snug text-neutral-700 sm:text-[16px]">
                      <span className="min-w-0">{schoolLabel}</span>
                      <span
                        className={
                          'inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-1.5 py-px text-[11px] font-bold ' +
                          (enrollment.status === 'current'
                            ? 'bg-primary-100 text-primary-900'
                            : 'bg-muted text-neutral-600')
                        }
                      >
                        {enrollment.status === 'current'
                          ? '在学中'
                          : `アルムナイ${enrollment.year != null ? `（${enrollment.year}年卒）` : ''}`}
                      </span>
                    </div>
                  ) : null}
                  {profile.occupation || placeLine ? (
                    <div className="mt-1 text-[13px] leading-snug text-neutral-500">
                      {[profile.occupation, placeLine].filter(Boolean).join(' ・ ')}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* 認証・実績バッジ・言語・評価・お気に入り。写真の右ではなく全幅の行に置くと
                  402px でも 1〜2 行に収まり、写真の下の空白も埋まる */}
              <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-2 text-[12.5px] text-neutral-700">
                {profile.isVerified ? (
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <ShieldCheck className="h-[14px] w-[14px] shrink-0 text-primary-700" aria-hidden />
                    在籍確認済み
                  </span>
                ) : null}
                {publicBadges.map((b) => (
                  <span key={b} className="inline-flex items-center rounded-full bg-primary-100 px-2 py-px text-[11px] font-bold text-primary-900">
                    {b}
                  </span>
                ))}
                {languages.length > 0 ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Globe className="h-[14px] w-[14px] shrink-0 text-neutral-400" aria-hidden />
                    {languages.join('・')}
                  </span>
                ) : null}
                {reviewCount > 0 && avgStars != null ? (
                  <a href="#reviews" className="inline-flex items-center gap-1 whitespace-nowrap hover:underline">
                    <span className="text-primary-700">★</span>
                    <b>{avgStars}</b>
                    <span className="text-neutral-500">（{reviewCount}件）</span>
                  </a>
                ) : null}
                {/* お気に入りは h1 から下ろした。名前の横に置くと 320px でボタンだけ次の行に落ち、
                    その分だけ写真の下に余白ができていた */}
                {!isMe ? (
                  // 402px/320px ではメタ項目が 1 行に収まらず、ml-auto のままだとボタンだけが
                  // 最終行に単独で右寄せされる。狭い幅では他の項目に続けて普通に流す
                  <span className="ml-auto shrink-0 max-sm:ml-0">
                    <FavoriteExpertButton
                      targetUserId={profile.id}
                      initialFavorited={favorited}
                      viewerLoggedIn={!!me}
                    />
                  </span>
                ) : null}
              </div>

              {/* SNS アイコン列（platform ごとに 1 件）。内容は下部の「発信・メディア」で見せる */}
              {profile.socialLinks.length > 0 ? (
                <div className="mt-2.5">
                  <SocialIcons links={profile.socialLinks} variant="light" size="sm" />
                </div>
              ) : null}

              {/* 得意分野（LinkedIn の Skills 相当）。チップが大きいと視認性が落ちるので
                  11.5px / px-2.5 / py-0.5 の小ぶりにする（11px 未満にはしない） */}
              {specialties.length > 0 || menuTopics.length > 0 ? (
                <div className="mt-3">
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-700">
                    得意分野
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(specialties.length > 0 ? specialties : menuTopics).map((code) => (
                      // 320px でも長いラベルはチップ内で折り返す。
                      // スマホだけ角丸を弱めて 2 行でも形が崩れないようにする
                      <span
                        key={code}
                        className="rounded-full max-sm:rounded-lg border border-border px-2.5 py-0.5 text-[11.5px] font-medium text-neutral-700"
                      >
                        {specialties.length > 0 ? specialtyLabel(code) : topicLabel(code)}
                        {isExperienceOnly(code) ? (
                          <span className="ml-1 text-[11px] text-neutral-400">※</span>
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
            </section>

            {/* ページ内アンカー（タブ）は廃止。LinkedIn と同じく、セクションを素直に縦へ積んで
                スクロールで読ませる。#reviews / #consult-menu の id はヒーローの評価と
                下部固定 CTA から使うので残している */}

            {/* ===== 自己紹介（先頭段落 + 続きを読む）。相談メニューより先に人物を読ませる ===== */}
            {bioLead ? (
              <Section title="自己紹介" id="about">
                <div className="max-w-[36em]">
                  <p className="text-[14.5px] leading-[1.85] text-neutral-700">{bioLead}</p>
                  {bioRest.length > 0 ? (
                    <details className="group mt-2.5">
                      <summary className="inline-flex cursor-pointer list-none items-center whitespace-nowrap rounded-full border border-border-strong px-3.5 py-1.5 max-sm:py-2.5 text-[12.5px] font-semibold text-neutral-700 transition hover:border-foreground [&::-webkit-details-marker]:hidden group-open:hidden">
                        …さらに表示
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

            {/* ===== 相談できること（最初の 4 件 + 展開）。この直後にモバイルの相談メニューが続く ===== */}
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
                    <summary className="inline-flex cursor-pointer list-none items-center whitespace-nowrap rounded-full border border-border-strong px-3.5 py-1.5 max-sm:py-2.5 text-[12.5px] font-semibold text-neutral-700 transition hover:border-foreground [&::-webkit-details-marker]:hidden group-open:hidden">
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
          </div>

          {/* ===== right (sticky。画面より長いときは中でスクロール) ===== */}
          <aside
            id="consult-menu"
            // モバイルでは他セクションと同じ区切り（mt-6 + border-t + pt-6）。PC の右カラムでは打ち消す
            className="scroll-mt-4 mt-6 border-t border-border pt-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:border-t-0 lg:pt-0 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-1 lg:[scrollbar-width:thin]"
          >
            {/* タブを廃したので、モバイルではここも他と同じ大きさの見出しとして読ませる */}
            <h2 className="mb-3 text-[19px] font-semibold text-foreground lg:text-[13px] lg:font-normal lg:text-neutral-500">
              相談メニュー
              <span className="text-[13px] font-normal text-neutral-500">
                {' '}
                — <b className="font-semibold text-foreground">{profile.displayName}</b>さん
              </span>
            </h2>
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
                      nextSlotIso={nextSlotIsoFor(s)}
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
                {/* TZ 名が長いと（Los Angeles など）見出しが 1 文字ずつ潰れるので、
                    どちらも縮めずに狭ければ次の行へ落とす */}
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                  <h2 className="shrink-0 text-[15px] font-semibold">直近の空き枠</h2>
                  {/* 2 行目に落ちても右寄せのまま（1 行なら justify-between と同じ結果） */}
                  <span className="ml-auto shrink-0 text-[11px] text-neutral-500">
                    <LocalTzLabel />
                  </span>
                </div>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {nextSlots.map((d) => (
                    <li
                      key={d.toISOString()}
                      className="shrink-0 whitespace-nowrap rounded-full bg-muted px-3 py-1 text-[12.5px] font-semibold tabular-nums"
                    >
                      <LocalSlotTime iso={d.toISOString()} />
                    </li>
                  ))}
                  {bookableMenus[0] ? (
                    <li className="shrink-0">
                      <Link
                        href={`/experts/${profile.id}/request?service=${bookableMenus[0].id}`}
                        className="inline-flex whitespace-nowrap rounded-full border border-border-strong px-3 py-1 text-[12.5px] font-semibold text-neutral-700 transition hover:border-foreground"
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

          {/* ===== left-bottom: 本文（レビューは最後）===== */}
          <div className="min-w-0 lg:col-start-1 lg:row-start-2">
            {/* 自己紹介 / 相談できること は上（相談メニューの前）へ移動した */}

            {/* ===== 合格実績（出願年ごと。進学校にはタグ）===== */}
            {admissionCount > 0 ? (
              <Section title="合格実績" id="admissions">
                <dl className="max-w-[36em] divide-y divide-border">
                  {admissionGroups.map((g) => (
                    <div key={g.year ?? 'none'} className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:gap-4">
                      <dt className="w-[84px] shrink-0 pt-1 text-[12.5px] font-bold tabular-nums text-neutral-500">
                        {g.year != null ? `${g.year} 出願` : '年未記入'}
                      </dt>
                      <dd className="flex flex-wrap gap-2">
                        {g.items.map((it, i) => (
                          <span
                            key={`${it.name}-${i}`}
                            className={
                              'inline-flex max-w-full items-center gap-2.5 rounded-xl border px-3.5 py-2 text-[13px] ' +
                              (it.enrolled
                                ? 'border-neutral-900 bg-neutral-900 text-white'
                                : 'border-border-strong bg-card text-neutral-800')
                            }
                          >
                            <span className="min-w-0">
                              <span className="block font-semibold leading-snug">{it.name}</span>
                              {it.nameEn ? (
                                <span
                                  className={
                                    'block text-[11px] leading-snug ' +
                                    (it.enrolled ? 'text-white/60' : 'text-neutral-500')
                                  }
                                >
                                  {it.nameEn}
                                </span>
                              ) : null}
                            </span>
                            {it.degree ? (
                              <span
                                className={
                                  'shrink-0 whitespace-nowrap text-[12px] ' +
                                  (it.enrolled ? 'text-white/70' : 'text-neutral-500')
                                }
                              >
                                {it.degree}
                              </span>
                            ) : null}
                            {it.enrolled ? (
                              <span className="shrink-0 whitespace-nowrap rounded-full bg-primary-500 px-1.5 py-px text-[10px] max-sm:text-[11px] font-bold text-neutral-950">
                                進学
                              </span>
                            ) : null}
                          </span>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2 text-[11px] text-neutral-400">
                  ※合格実績は本人申告の情報です。在籍は「在籍確認済み」バッジ、スコアは「資格・スコア」で運営が確認しています。
                </p>
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

            {/* ===== 資格・スコア（運営が合格証明を確認したものだけ）===== */}
            {qualifications.length > 0 ? (
              <Section title="資格・スコア" id="qualifications">
                <ul className="flex max-w-[36em] flex-wrap gap-2">
                  {qualifications.map((q) => (
                    <li
                      key={q.id}
                      className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-card px-3.5 py-1.5 text-[13px]"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary-700" aria-hidden />
                      {/* 長い資格名は縮む側（min-w-0）、スコア・取得年は縮まない側 */}
                      <span className="min-w-0 font-semibold">{qualificationDisplayName(q)}</span>
                      {q.score ? <span className="shrink-0 whitespace-nowrap tabular-nums text-neutral-700">{q.score}</span> : null}
                      {q.acquiredYear ? (
                        <span className="shrink-0 whitespace-nowrap text-[11.5px] text-neutral-500">{q.acquiredYear}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-neutral-400">
                  合格証明・スコアレポートを運営が確認したものだけを表示しています。
                </p>
              </Section>
            ) : null}

            {/* ===== 発信・メディア（Locore 記事 → featured → card → button・0088）===== */}
            {mediaCount > 0 ? (
              <Section title="発信・メディア" id="media">
                <MediaLinks articles={mediaArticles} links={profile.socialLinks} />
                {articles.length > 3 ? (
                  <Link
                    href={`/users/${profile.id}`}
                    className="mt-3 inline-flex items-center whitespace-nowrap rounded-full border border-border-strong bg-card px-3.5 py-1.5 max-sm:py-2.5 text-[12.5px] font-semibold text-neutral-700 transition hover:border-foreground"
                  >
                    記事をすべて見る（{articles.length}件）
                  </Link>
                ) : null}
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
                      <summary className="mt-1 inline-flex cursor-pointer list-none items-center whitespace-nowrap rounded-full border border-border-strong px-3.5 py-1.5 max-sm:py-2.5 text-[12.5px] font-semibold text-neutral-700 transition hover:border-foreground [&::-webkit-details-marker]:hidden group-open:hidden">
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

            {/* 使い方・FAQ は一覧と /about-service にあるので、ここは 1 行のリンクに。
                区切りの寸法は Section と揃える（この下に余分な逃げ余白を足さない） */}
            <div className="mt-6 border-t border-border pt-6 text-[13px] text-neutral-500">
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

        </div>
      </div>

      {/* mobile bottom CTA */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-[18px] pt-3 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex max-w-[560px] items-center gap-3.5">
          {/* 価格は縮ませない。ボタン側が flex-1 でしわ寄せを受ける */}
          <div className="shrink-0 leading-snug">
            <b className="block whitespace-nowrap text-[19px] font-bold tabular-nums">
              {minPrice != null ? `¥${minPrice.toLocaleString()}` : '応相談'}
              {minPrice != null ? (
                <span className="text-[12px] font-normal text-neutral-500"> /30分〜</span>
              ) : null}
            </b>
            {reviewCount > 0 && avgStars != null ? (
              // shrink-0 の板の幅はこの 2 行目の max-content でも決まる。
              // スマホでは「レビュー」を省いてボタン側に幅を残す
              <span className="text-[11px] text-neutral-500">
                ★{avgStars} ・ <span className="max-sm:hidden">レビュー</span>
                {reviewCount}件
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
              {/* この bar は lg:hidden なので sm: 幅でも出る。詰めるのはスマホだけ */}
              {hasSlots ? (
                '空き枠を選ぶ'
              ) : (
                <>
                  チャットで相談<span className="max-sm:hidden">する</span>
                </>
              )}
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
  // タブを廃したので、区切り線（LinkedIn のセクション境界相当）でセクションの切れ目を示す。
  // 上下の間隔はここが唯一の担当（親の grid gap は 0）なので、二重に空くことがない
  return (
    <section id={id} className="mt-6 scroll-mt-4 border-t border-border pt-6">
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
