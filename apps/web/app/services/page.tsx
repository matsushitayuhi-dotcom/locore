import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { listServices } from '@/lib/services/list';
import { getActiveCitiesForPicker } from '@/lib/geo/countries';
import {
  ServiceFilters,
  type ServiceFiltersState,
} from '@/components/services/ServiceFilters';
import { ServiceCard } from '@/components/services/ServiceCard';

/**
 * /services — サービス一覧（ブラウズ）。
 *
 * URL クエリ:
 *   - audience: 'all' | 'traveler' | 'resident'  (なし = all)
 *   - city: <city slug>
 *   - cat: <category key>
 *   - q: 検索ワード (title/description ILIKE)
 *   - min / max: 価格レンジ (JPY)
 *
 * - ISR (revalidate=60)
 * - 該当なしは空状態 UI
 * - グリッドは sm 2 / md 3 / lg 4 列
 */

export const revalidate = 60;

export const metadata = {
  title: 'サービスを探す — Locore',
  description:
    '現地駐在員が提供する観光アテンド・通訳・相談・留学サポートなどのサービスを探せます。',
};

type Search = {
  audience?: string;
  city?: string;
  cat?: string;
  q?: string;
  min?: string;
  max?: string;
};

function parseAudience(v: string | undefined): 'all' | 'traveler' | 'resident' {
  if (v === 'traveler' || v === 'resident') return v;
  return 'all';
}

function parseInt(v: string | undefined): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.floor(n);
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams?: Search;
}) {
  const audience = parseAudience(searchParams?.audience);
  const city = searchParams?.city?.trim() || undefined;
  const cat = searchParams?.cat?.trim() || undefined;
  const q = searchParams?.q?.trim() || undefined;
  const min = parseInt(searchParams?.min);
  const max = parseInt(searchParams?.max);

  const [{ services, total }, cities] = await Promise.all([
    listServices({
      audience,
      citySlug: city,
      category: cat,
      q,
      minPrice: min,
      maxPrice: max,
      limit: 48,
    }),
    getActiveCitiesForPicker(),
  ]);

  const filtersState: ServiceFiltersState = {
    audience,
    city,
    cat,
    q,
    min,
    max,
  };

  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
            Locore Services
          </p>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight sm:text-[28px]">
            サービスから探す
          </h1>
          <p className="mt-1 text-[13px] text-foreground/65">
            現地駐在員が直接提供する観光アテンド・コンサル・通訳・撮影など。
            気になるものを見つけたら、その場でメッセージで相談できます。
          </p>
        </header>

        <ServiceFilters state={filtersState} cities={cities} />

        <div className="mt-3 flex items-baseline justify-between gap-2">
          <p className="text-[12px] text-foreground/60">
            {services.length === 0
              ? '該当 0 件'
              : `${total.toLocaleString('ja-JP')} 件中 ${services.length.toLocaleString('ja-JP')} 件を表示`}
          </p>
          {q || cat || city || audience !== 'all' || min != null || max != null ? (
            <Link
              href="/services"
              className="text-[12px] font-semibold text-primary-300 hover:underline"
            >
              フィルタをクリア
            </Link>
          ) : null}
        </div>

        {services.length === 0 ? (
          <EmptyState />
        ) : (
          <ul
            className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          >
            {services.map((s) => (
              <li key={s.id} className="h-full">
                <ServiceCard service={s} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <section className="mt-6 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <div className="rounded-full bg-muted p-3 text-foreground/50">
        <SearchX className="h-6 w-6" aria-hidden />
      </div>
      <h2 className="text-[15px] font-semibold">該当するサービスがありません</h2>
      <p className="max-w-md text-[12px] text-foreground/60">
        条件を変えるか、別のカテゴリで探してみてください。
        まだ Locore に登録されているサービスは少数なので、希望が無ければ
        住人のプロフィールから直接相談することもできます。
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/services"
          className="rounded-full bg-primary-500 px-4 py-2 text-[12px] font-bold text-neutral-950 hover:bg-primary-300"
        >
          フィルタをクリア
        </Link>
        <Link
          href="/residents"
          className="rounded-full bg-card px-4 py-2 text-[12px] font-semibold text-foreground ring-1 ring-border hover:bg-muted"
        >
          住人を見る
        </Link>
      </div>
    </section>
  );
}
