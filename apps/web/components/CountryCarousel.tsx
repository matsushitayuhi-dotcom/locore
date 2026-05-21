import Link from 'next/link';
import Image from 'next/image';
import { Lock, ArrowRight } from 'lucide-react';
import type { CountryListItem } from '@/lib/geo/countries';

/**
 * トップページ用、国を 1 行で流すカルーセル。
 *
 * - 並び順: active 国を先頭、その後は continent → position 順
 * - 最大 10 件まで表示。それ以上は末尾の「もっと見る」カードから /world へ
 * - 全 viewport で 1 行の横スクロール（snap-x）。指でなぞって動かせる
 * - active 国 → /country/<code> へ
 * - coming_soon 国 → タイル全体グレーアウト、タップ不可
 */

const CAROUSEL_LIMIT = 10;

function fallbackImage(slug: string): string {
  return `https://picsum.photos/seed/${slug}/600/800`;
}

export function CountryCarousel({ countries }: { countries: CountryListItem[] }) {
  if (countries.length === 0) return null;

  // active を先に固める。すでにサーバ側で continent + position 順なので
  // パーティション後はそれぞれの順序を保つ。
  const active = countries.filter((c) => c.status === 'active');
  const coming = countries.filter((c) => c.status !== 'active');
  const ordered = [...active, ...coming];

  // 10 件まで。残りがあるなら最後に「もっと見る」カードを追加。
  const head = ordered.slice(0, CAROUSEL_LIMIT);
  const hasMore = ordered.length > CAROUSEL_LIMIT;

  return (
    <div className="-mx-4 sm:-mx-6">
      <div
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-2 scrollbar-thin sm:px-6"
        // iOS / Android のスムースで惰性のあるパンを有効化
        // touchAction pan-x で横スワイプ時に縦方向の慣性スクロールが入らないようにし、
        // 「カルーセル写真を動かす時に上下にぐらつく」を防止
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
      >
        {head.map((c) => (
          <div
            key={c.code}
            // モバイル ~40vw、PC は固定幅で揃える
            className="w-[42vw] shrink-0 snap-start sm:w-[220px] md:w-[240px]"
          >
            <CountryTile country={c} />
          </div>
        ))}

        {hasMore ? (
          <div className="w-[42vw] shrink-0 snap-start sm:w-[220px] md:w-[240px]">
            <SeeMoreTile total={ordered.length} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * 「他の国も見る」カード。/world に遷移して全 28 ヶ国を一覧。
 */
function SeeMoreTile({ total }: { total: number }) {
  return (
    <Link
      href="/world"
      className="group flex h-full flex-col items-center justify-center rounded-xl bg-primary-500/10 px-4 py-8 text-center ring-1 ring-primary-300/30 transition hover:bg-primary-500/15 hover:ring-primary-300"
    >
      <div className="aspect-[3/4] flex w-full flex-col items-center justify-center">
        <p className="text-[28px] font-bold text-primary-300">+{total - CAROUSEL_LIMIT}</p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-primary-300/70">
          More countries
        </p>
        <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary-500 px-3 py-1 text-[11px] font-bold text-neutral-950 transition group-hover:bg-primary-300">
          すべて見る
          <ArrowRight className="h-3 w-3" />
        </p>
      </div>
    </Link>
  );
}

function CountryTile({ country }: { country: CountryListItem }) {
  const active = country.status === 'active';

  const inner = (
    <div
      className={
        'group relative h-full overflow-hidden rounded-xl ring-1 transition ' +
        (active
          ? 'bg-card ring-border hover:shadow-md hover:ring-primary-300'
          : 'cursor-not-allowed bg-neutral-100 opacity-70 ring-border')
      }
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
        <Image
          src={country.heroImageUrl ?? fallbackImage(country.code)}
          alt={country.nameJa}
          fill
          sizes="(min-width: 1280px) 14vw, (min-width: 640px) 20vw, 34vw"
          className={
            'object-cover transition duration-500 ' +
            (active ? 'group-hover:scale-[1.04]' : 'grayscale')
          }
          unoptimized
        />
        {!active ? (
          <div aria-hidden className="absolute inset-0 bg-neutral-100/45" />
        ) : null}
        {/* 写真全体にフラットな薄暗 tint。h3 等は globals.css で
            color:neutral-900 が直接効くため、見出しに !text-white を付けて
            上書きする。 */}
        <div
          aria-hidden
          className={'absolute inset-0 ' + (active ? 'bg-black/30' : 'bg-black/45')}
        />
        {!active ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-neutral-50/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/55 backdrop-blur">
            <Lock className="h-2.5 w-2.5" />
            準備中
          </span>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 px-3 py-3 text-white">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/90">
            {country.nameEn}
          </p>
          <h3
            className="!text-white mt-0.5 truncate text-[15px] font-bold leading-tight tracking-tight sm:text-[16px]"
          >
            {country.nameJa}
          </h3>
        </div>
      </div>
    </div>
  );

  if (!active) {
    return (
      <div aria-disabled title="準備中" className="block h-full">
        {inner}
      </div>
    );
  }
  return (
    <Link href={`/country/${country.code}`} className="block h-full">
      {inner}
    </Link>
  );
}
