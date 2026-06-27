import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  ImageIcon,
  BadgeCheck,
  Calendar,
  Briefcase,
  PenSquare,
  ExternalLink,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@locore/ui';
import { getServiceById } from '@/lib/services/byId';
import { getCurrentUser } from '@/lib/auth/current-user';
import { ServiceInquiryButton } from '@/components/services/ServiceInquiryButton';
import { ServiceCard } from '@/components/services/ServiceCard';
import { TAG_LABEL } from '@/lib/services/tagLabels';

/**
 * /services/[id] — サービス詳細ページ。
 *
 * セクション:
 *   1. Hero (cover 16:9 + title + price + city + 問い合わせる CTA)
 *   2. 説明文 (whitespace-pre-line)
 *   3. 「このサービスを提供する駐在員」
 *      - avatar / name / bio / 在住年数 / 本人確認バッジ / tier
 *      - この駐在員の記事 (最大 5 件, 横スクロール)
 *      - この駐在員の他のサービス (最大 3 件)
 *   4. 下部 CTA
 *
 * ISR (revalidate=60)。料金は「目安」感を残して「応相談」も許容。
 */

export const revalidate = 60;

type Params = { params: { id: string } };

export async function generateMetadata({ params }: Params) {
  const bundle = await getServiceById(params.id);
  if (!bundle) return { title: 'サービス — Locore' };
  return {
    title: `${bundle.service.title} — ${bundle.provider.displayName} | Locore`,
    description: bundle.service.description ?? undefined,
  };
}

export default async function ServiceDetailPage({ params }: Params) {
  const bundle = await getServiceById(params.id);
  if (!bundle) notFound();
  const { service: s, provider } = bundle;

  const me = await getCurrentUser();

  const yearsLabel =
    provider.residencyYears != null && provider.residencyYears > 0
      ? `現地 ${provider.residencyYears} 年`
      : null;

  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-md px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href="/services"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          サービス一覧に戻る
        </Link>

        {/* ========== 1. Hero ========== */}
        <section className="mt-3 overflow-hidden rounded-2xl bg-card ring-1 ring-border">
          <div className="relative aspect-[16/9] w-full bg-muted">
            {s.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.coverImageUrl}
                alt={`${s.title} のカバー画像`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-foreground/30">
                <ImageIcon className="h-12 w-12" aria-hidden />
              </div>
            )}
          </div>

          <div className="space-y-4 p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              {/* タグ chips を全て表示。0 件のレガシーレコードは category にフォールバック */}
              {(s.tags && s.tags.length > 0
                ? s.tags
                : s.category
                  ? [s.category]
                  : []
              ).map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-primary-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary-300"
                >
                  {TAG_LABEL[t] ?? t}
                </span>
              ))}
              {s.cityNameJa ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground/70">
                  <MapPin className="h-3 w-3" aria-hidden />
                  {s.cityNameJa}
                </span>
              ) : null}
            </div>

            <h1 className="text-[22px] font-semibold leading-tight tracking-tight sm:text-[26px]">
              {s.title}
            </h1>

            <div className="flex flex-wrap items-baseline gap-3">
              {s.priceJpy != null ? (
                <p className="text-[22px] font-bold tabular text-primary-300">
                  ¥{s.priceJpy.toLocaleString('ja-JP')}
                  {s.priceUnit ? (
                    <span className="ml-1 text-[12px] font-medium text-foreground/60">
                      / {s.priceUnit}
                    </span>
                  ) : null}
                  <span className="ml-2 text-[11px] font-medium text-foreground/45">
                    (目安)
                  </span>
                </p>
              ) : (
                <p className="text-[16px] font-semibold text-foreground/75">
                  料金は応相談
                </p>
              )}
            </div>

            <div className="pt-1">
              <ServiceInquiryButton
                serviceId={s.id}
                serviceTitle={s.title}
                ownerId={provider.id}
                ownerName={provider.displayName}
                viewerUserId={me?.id ?? null}
                contactMethod={s.contactMethod}
                externalUrl={s.externalUrl}
                variant="hero"
              />
            </div>
          </div>
        </section>

        {/* ========== 2. 説明文 ========== */}
        {s.description ? (
          <section className="mt-5 rounded-2xl bg-card p-5 ring-1 ring-border sm:p-6">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.18em] text-foreground/55">
              サービス内容
            </h2>
            <p className="mt-3 whitespace-pre-line text-[14px] leading-[1.85] text-foreground/85">
              {s.description}
            </p>
          </section>
        ) : null}

        {/* ========== 3. 提供する駐在員 ========== */}
        <section className="mt-5 rounded-2xl bg-card p-5 ring-1 ring-border sm:p-6">
          <h2 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.18em] text-primary-300">
            <Briefcase className="h-3.5 w-3.5" />
            このサービスを提供する駐在員
          </h2>

          <div className="mt-4 flex items-start gap-4">
            <Avatar size="lg" className="h-16 w-16 shrink-0">
              {provider.avatarUrl ? (
                <AvatarImage
                  src={provider.avatarUrl}
                  alt={provider.displayName}
                />
              ) : null}
              <AvatarFallback>
                {provider.displayName?.[0]?.toUpperCase() ?? '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/users/${provider.id}`}
                  className="text-[16px] font-semibold hover:text-primary-300 hover:underline"
                >
                  {provider.displayName}
                </Link>
                {provider.isVerified ? (
                  <span
                    title="本人確認済み"
                    aria-label="本人確認済み"
                    className="inline-flex items-center gap-1 rounded-full bg-success-500/10 px-2 py-0.5 text-[10px] font-bold text-success-500 ring-1 ring-success-500/30"
                  >
                    <BadgeCheck
                      className="h-3.5 w-3.5"
                      fill="currentColor"
                      stroke="white"
                      strokeWidth={2}
                    />
                    本人確認済み
                  </span>
                ) : null}
                {provider.tier ? (
                  <span className="rounded-full bg-accent-300/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground/75">
                    Tier {provider.tier}
                  </span>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-foreground/60">
                {yearsLabel ? (
                  <span className="inline-flex items-center gap-1 tabular">
                    <Calendar className="h-3.5 w-3.5" />
                    {yearsLabel}
                  </span>
                ) : null}
                {s.cityNameJa ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {s.cityNameJa} で活動
                  </span>
                ) : null}
              </div>
              {provider.bio ? (
                <p className="mt-3 whitespace-pre-line text-[13px] leading-[1.8] text-foreground/80 line-clamp-5">
                  {provider.bio}
                </p>
              ) : null}
              <div className="mt-3">
                <Link
                  href={`/users/${provider.id}`}
                  className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary-300 hover:underline"
                >
                  プロフィールを見る
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </Link>
              </div>
            </div>
          </div>

          {/* この駐在員の記事 */}
          {provider.articles.length > 0 ? (
            <div className="mt-6">
              <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/55">
                <PenSquare className="h-3 w-3" />
                {provider.displayName} さんの記事
              </h3>
              <ul
                className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                style={{ scrollSnapStop: 'always' }}
              >
                {provider.articles.map((a) => (
                  <li
                    key={a.id}
                    className="w-[60%] shrink-0 snap-start sm:w-[40%]"
                  >
                    <Link
                      href={`/articles/${a.id}`}
                      className="flex h-full flex-col overflow-hidden rounded-xl bg-background ring-1 ring-border transition hover:ring-primary-300"
                    >
                      <div className="relative aspect-[4/3] w-full bg-muted">
                        {a.coverImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={a.coverImageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : null}
                        {a.localScoreAverage != null ? (
                          <span className="absolute right-2 top-2 rounded-full bg-primary-500/90 px-2 py-0.5 text-[10px] font-bold text-neutral-950">
                            Local {a.localScoreAverage}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-1 flex-col p-3">
                        <p className="line-clamp-2 text-[12px] font-semibold leading-snug">
                          {a.title}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* この駐在員の他のサービス */}
          {provider.otherServices.length > 0 ? (
            <div className="mt-6">
              <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/55">
                <Briefcase className="h-3 w-3" />
                {provider.displayName} さんの他のサービス
              </h3>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {provider.otherServices.map((os) => (
                  <li key={os.id} className="h-full">
                    <ServiceCard service={os} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {/* ========== 4. 下部 CTA ========== */}
        <section className="mt-6 rounded-2xl bg-primary-500/5 p-5 text-center ring-1 ring-primary-500/30 sm:p-6">
          <h2 className="text-[16px] font-semibold tracking-tight">
            気になったら、まずは相談してみる
          </h2>
          <p className="mx-auto mt-1 max-w-md text-[12px] text-foreground/65">
            予約・決済は双方の合意のうえで進めます。
            初回メッセージは {provider.displayName} さん本人だけが読みます。
          </p>
          <div className="mx-auto mt-4 max-w-xs">
            <ServiceInquiryButton
              serviceId={s.id}
              serviceTitle={s.title}
              ownerId={provider.id}
              ownerName={provider.displayName}
              viewerUserId={me?.id ?? null}
              contactMethod={s.contactMethod}
              externalUrl={s.externalUrl}
              variant="footer"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
