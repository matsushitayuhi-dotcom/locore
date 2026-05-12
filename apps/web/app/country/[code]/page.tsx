import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Lock, MapPin, Sparkles } from 'lucide-react';
import { getCountryByCode } from '@/lib/geo/countries';
import type { RegionInfo } from '@/lib/geo/countries';

export const dynamic = 'force-dynamic';

type Props = { params: { code: string } };

export async function generateMetadata({ params }: Props) {
  const country = await getCountryByCode(params.code);
  if (!country) return { title: '見つかりません' };
  return {
    title: `${country.nameJa} — Locore`,
    description: `${country.nameJa}（${country.nameEn}）の地域一覧。現地民が書いた旅の記事を、地域ごとに探せます。`,
  };
}

/**
 * 国詳細 / ドリルダウンページ。
 *
 * - 上部に国の hero 画像 + タイトル
 * - 「公開中の地域」 — クリックで /region/<slug> へ
 * - 「準備中の地域」 — 灰色で表示、CTA は Founders へ
 *
 * Coming Soon の国でもこのページに着地可能（locked カードでも一覧が見られる）。
 * 地域がまだ 1 つもない国は「準備中」メッセージのみ。
 */
export default async function CountryPage({ params }: Props) {
  const country = await getCountryByCode(params.code);
  if (!country) notFound();

  const activeRegions = country.regions.filter(
    (r) => r.isActive && r.kind !== 'other',
  );
  const otherRegion = country.regions.find((r) => r.kind === 'other');
  const lockedRegions = country.regions.filter(
    (r) => !r.isActive && r.kind !== 'other',
  );

  return (
    <main className="bg-background">
      {/* Hero with country image */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="relative h-[260px] w-full bg-muted sm:h-[360px]">
          <Image
            src={
              country.heroImageUrl ??
              `https://picsum.photos/seed/${country.code}/1600/900`
            }
            alt={country.nameJa}
            fill
            sizes="100vw"
            priority
            className="object-cover"
            unoptimized
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-neutral-900/85 via-neutral-900/40 to-transparent"
          />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-screen-xl px-4 pb-6 sm:px-6 sm:pb-10">
            <Link
              href="/"
              className="mb-3 inline-flex items-center gap-1 rounded-full bg-card/90 px-3 py-1 text-[11px] font-medium text-foreground/75 backdrop-blur hover:bg-card"
            >
              <ArrowLeft className="h-3 w-3" />
              世界ピッカーに戻る
            </Link>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary-300">
              {country.nameEn}
            </p>
            <h1
              className="mt-1 text-[36px] font-bold leading-tight tracking-tight text-white sm:text-[48px]"
              style={{
                fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
              }}
            >
              {country.nameJa}
            </h1>
            {country.shortDescription ? (
              <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-white/85 sm:text-[14px]">
                {country.shortDescription}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-screen-xl space-y-12 px-4 py-10 sm:px-6 sm:py-14">
        {/* Active regions — もう少し小さめのグリッドで密度を上げる */}
        {activeRegions.length > 0 ? (
          <section>
            <SectionHeader
              kicker="公開中の地域"
              title="クリエイターが現地から書いています"
              count={activeRegions.length}
            />
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {activeRegions.map((r) => (
                <li key={r.id}>
                  <RegionCard region={r} variant="active" />
                </li>
              ))}
              {otherRegion && otherRegion.isActive ? (
                <li>
                  <RegionCard region={otherRegion} variant="other" />
                </li>
              ) : null}
            </ul>
          </section>
        ) : (
          <section className="rounded-2xl bg-card p-10 text-center ring-1 ring-border">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-foreground/55">
              <Lock className="h-3 w-3" />
              準備中
            </p>
            <h2
              className="mt-3 text-[24px] font-bold tracking-tight"
              style={{
                fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
              }}
            >
              {country.nameJa}はもうすぐ公開
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-foreground/70">
              現地在住のクリエイターを探しています。
              書いてみたい方は Founders 枠に応募してください。
            </p>
            <Link
              href="/founders"
              className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-2 text-[13px] font-bold text-neutral-950 hover:bg-primary-300"
            >
              Founders 枠を見る
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>
        )}

        {/* Locked regions（active 国でも未公開の地方を見せる）*/}
        {lockedRegions.length > 0 ? (
          <section>
            <SectionHeader
              kicker="準備中の地域"
              title="クリエイター募集中"
              count={lockedRegions.length}
            />
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {lockedRegions.map((r) => (
                <li key={r.id}>
                  <RegionCard region={r} variant="locked" />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function SectionHeader({
  kicker,
  title,
  count,
}: {
  kicker: string;
  title: string;
  count?: number;
}) {
  return (
    <header className="mb-4 flex items-end justify-between gap-4">
      <div>
        <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
          <Sparkles className="h-3 w-3" />
          {kicker}
        </p>
        <h2
          className="mt-2 text-[22px] font-bold leading-tight tracking-tight sm:text-[26px]"
          style={{
            fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
          }}
        >
          {title}
        </h2>
      </div>
      {typeof count === 'number' ? (
        <span className="text-[11px] text-foreground/45">{count} 件</span>
      ) : null}
    </header>
  );
}

function RegionCard({
  region,
  variant,
}: {
  region: RegionInfo;
  variant: 'active' | 'locked' | 'other';
}) {
  const locked = variant === 'locked';
  const isOther = variant === 'other';

  const inner = (
    <div
      className={
        'group relative h-full overflow-hidden rounded-xl ring-1 transition ' +
        (locked
          ? 'cursor-not-allowed bg-neutral-100 opacity-70 ring-border'
          : 'bg-card ring-border hover:shadow-md hover:ring-primary-300')
      }
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <Image
          src={
            region.heroImageUrl ??
            `https://picsum.photos/seed/${region.slug}/1000/800`
          }
          alt={region.nameJa}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className={
            'object-cover transition duration-500 ' +
            (locked ? 'grayscale' : 'group-hover:scale-[1.04]')
          }
          unoptimized
        />
        {locked ? (
          <div aria-hidden className="absolute inset-0 bg-neutral-100/45" />
        ) : null}
        <div
          aria-hidden
          className={
            'absolute inset-0 ' +
            (locked
              ? 'bg-gradient-to-t from-neutral-700/80 via-neutral-700/30 to-transparent'
              : 'bg-gradient-to-t from-neutral-900/80 via-neutral-900/25 to-transparent')
          }
        />
        {locked ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-neutral-50/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/55 backdrop-blur">
            <Lock className="h-2.5 w-2.5" />
            準備中
          </span>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 p-3 text-white">
          <h3
            className="text-[15px] font-bold leading-tight tracking-tight sm:text-[16px]"
            style={{
              fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
            }}
          >
            {region.nameJa}
          </h3>
          {!locked ? (
            <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-white/90">
              <MapPin className="h-2.5 w-2.5" />
              {isOther ? 'その他のエリア' : '記事を見る'}
              <ArrowRight className="h-2.5 w-2.5" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (locked) {
    return (
      <div aria-disabled title="準備中" className="block h-full">
        {inner}
      </div>
    );
  }
  return (
    <Link href={`/region/${region.slug}`} className="block h-full">
      {inner}
    </Link>
  );
}
