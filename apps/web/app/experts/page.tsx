import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { listExperts, listExpertCities } from '@/lib/experts/list';
import { PRICE_RANGES, TOPIC_TAGS } from '@/lib/experts/constants';
import { ExpertCard } from '@/components/experts/ExpertCard';

/**
 * /experts — エキスパート一覧（v2 表側）。
 * mockups/v2/experts-list.html の実装。フィルタは GET フォーム + リンクチップで、
 * searchParams を読むため動的レンダリング。
 *
 * URL クエリ:
 *   - city  … 都市 slug
 *   - topic … 相談テーマタグ（TOPIC_TAGS の value）
 *   - price … 料金プリセット（PRICE_RANGES の value）
 */

export const metadata = {
  title: 'エキスパートを探す',
  description:
    '海外在住の日本人エキスパートに、30分からオンライン相談。全員、書類審査による居住認証済み。都市とテーマで絞り込めます。',
};

type Search = {
  city?: string | string[];
  topic?: string | string[];
  price?: string | string[];
};

/** searchParams は同名キー複数指定で string[] になり得る。先頭値に正規化。 */
function firstParam(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] ?? '' : v ?? '').trim();
}

export default async function ExpertsPage({
  searchParams,
}: {
  searchParams?: Search;
}) {
  const city = firstParam(searchParams?.city);
  const topic = firstParam(searchParams?.topic);
  const price = firstParam(searchParams?.price);

  const range = PRICE_RANGES.find((r) => r.value === price);

  const [experts, cityOptions] = await Promise.all([
    listExperts({
      citySlug: city || undefined,
      topic: topic || undefined,
      minPrice: range?.min,
      maxPrice: range?.max ?? undefined,
    }),
    listExpertCities(),
  ]);

  // テーマチップ用: topic 以外の現在条件を維持した href を組み立てる
  const chipHref = (t: string) => ({
    pathname: '/experts',
    query: {
      ...(city ? { city } : {}),
      ...(price ? { price } : {}),
      ...(t ? { topic: t } : {}),
    },
  });

  return (
    <main className="bg-[#FAFAF7] text-[#18181B]">
      {/* page head */}
      <div className="mx-auto max-w-[1120px] px-6 pt-11">
        <span className="block text-[12px] font-semibold uppercase tracking-[0.14em] text-[#D4634A]">
          Experts
        </span>
        <h1 className="mt-2 text-[clamp(24px,3.4vw,32px)] font-bold tracking-tight">
          エキスパートを探す
        </h1>
        <p className="mt-2 max-w-[40em] text-[14px] text-[#71717A]">
          全員、書類審査による居住認証済み。都市とテーマで絞り込んで、あなたの相談に合う人を見つけてください。
        </p>
      </div>

      {/* filters */}
      <div className="sticky top-0 z-40 mt-6 border-b border-[#E7E5E0] bg-[#FAFAF7]/90 backdrop-blur-md">
        <div className="mx-auto max-w-[1120px] px-6 py-3.5">
          <form
            action="/experts"
            method="GET"
            className="flex flex-wrap items-center gap-2.5"
          >
            {topic ? <input type="hidden" name="topic" value={topic} /> : null}
            <select
              name="city"
              defaultValue={city}
              aria-label="都市で絞り込む"
              className="appearance-none rounded-full border border-[#C9C5BB] bg-white px-4 py-2 pr-8 text-[13.5px] font-bold text-[#18181B] outline-none focus:border-[#D4634A]"
            >
              <option value="">すべての都市</option>
              {cityOptions.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.nameJa}
                </option>
              ))}
            </select>
            <select
              name="price"
              defaultValue={price}
              aria-label="料金で絞り込む"
              className="appearance-none rounded-full border border-[#C9C5BB] bg-white px-4 py-2 pr-8 text-[13.5px] font-bold text-[#18181B] outline-none focus:border-[#D4634A]"
            >
              <option value="">料金（30分〜）</option>
              {PRICE_RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-full border border-transparent bg-[#D4634A] px-5 py-2 text-[13.5px] font-bold text-white transition hover:bg-[#A84A35]"
            >
              絞り込む
            </button>
            <span className="ml-auto text-[13px] text-[#71717A]">
              <b className="text-[15px] tabular-nums text-[#18181B]">
                {experts.length}
              </b>{' '}
              名のエキスパート
            </span>
          </form>

          {/* テーマチップ（リンク） */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none]">
            <TopicChip href={chipHref('')} active={!topic}>
              すべて
            </TopicChip>
            {TOPIC_TAGS.map((t) => (
              <TopicChip
                key={t.value}
                href={chipHref(t.value)}
                active={topic === t.value}
              >
                {t.label}
              </TopicChip>
            ))}
          </div>
        </div>
      </div>

      {/* grid */}
      <div className="mx-auto max-w-[1120px] px-6 pb-20 pt-8">
        {experts.length === 0 ? (
          <div className="px-5 py-16 text-center text-[13px] text-[#71717A]">
            <div className="mb-2.5 text-[34px]">🧭</div>
            <b className="mb-1.5 block text-[16px] text-[#3F3F46]">
              この条件のエキスパートは、まだいません
            </b>
            条件を少しゆるめてみてください。新しいエキスパートは毎月増えています。
            <div className="mt-4">
              <Link
                href="/experts"
                className="inline-flex rounded-full border border-[#C9C5BB] bg-white px-5 py-2 text-[13.5px] font-bold text-[#3F3F46] transition hover:border-[#18181B] hover:text-[#18181B]"
              >
                絞り込みをリセット
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {experts.map((e) => (
              <ExpertCard key={e.userId} expert={e} />
            ))}
          </div>
        )}

        {/* register strip */}
        <div className="mt-11 flex flex-wrap items-center gap-5 rounded-2xl border border-dashed border-[#C9C5BB] bg-[#F4F2EC] px-7 py-6">
          <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full border border-[#F4DACE] bg-[#FAF1ED] text-[#D4634A]">
            <ShieldCheck className="h-[22px] w-[22px]" aria-hidden />
          </span>
          <div>
            <b className="block text-[15px]">
              海外在住のあなたへ — エキスパートとして登録しませんか
            </b>
            <p className="mt-0.5 text-[12.5px] text-[#71717A]">
              居住認証を通過すると、あなたの「暮らしの知識」が誰かの30分になります。
            </p>
          </div>
          <Link
            href="/become-writer"
            className="rounded-full border border-[#C9C5BB] bg-white px-4 py-2 text-[13.5px] font-bold text-[#3F3F46] transition hover:border-[#18181B] hover:text-[#18181B] sm:ml-auto"
          >
            登録について見る
          </Link>
        </div>
      </div>
    </main>
  );
}

function TopicChip({
  href,
  active,
  children,
}: {
  href: { pathname: string; query: Record<string, string> };
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        'shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-[13px] transition ' +
        (active
          ? 'border-[#D4634A] bg-[#D4634A] font-bold text-white'
          : 'border-[#C9C5BB] bg-white font-medium text-[#3F3F46] hover:border-[#A84A35] hover:text-[#A84A35]')
      }
    >
      {children}
    </Link>
  );
}
