import Link from 'next/link';
import {
  ArrowRight,
  CalendarCheck,
  Clock,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Video,
} from 'lucide-react';
import {
  listExperts,
  listExpertCities,
  listExpertCountries,
  type ExpertCard as ExpertCardData,
} from '@/lib/experts/list';
import { PRICE_RANGES } from '@/lib/experts/constants';
import {
  SPECIALTY_GROUPS,
  groupsOf,
  specialtyGroup,
} from '@/lib/experts/specialties';
import { getSpecialtiesByUser } from '@/lib/experts/specialtiesByUser';
import { ExpertCard } from '@/components/experts/ExpertCard';
import { ExpertRail } from '@/components/experts/ExpertRail';
import { CityPriceSelects } from './FilterSelects';

/**
 * /experts — エキスパート一覧（Intro 型）。mockups/v2/experts-list-intro.html の実装。
 *
 * 構成: 大見出し → 国の円形カテゴリ（リンク）→ 都市・料金・テーマの絞り込み行 →
 *   絞り込み無し: 得意分野の第 1 階層ごとの横スクロール列（Intro の "Top Experts." 列）
 *   絞り込み有り: 1 つのグリッド
 * → 使い方 3 タイル → 登録 CTA。
 *
 * URL クエリ（GET フォーム + リンク）:
 *   - country … 国コード（countries.code、lowercase alpha-2）
 *   - city    … 都市 slug（国選択時はその国の都市だけが選択肢に出る）
 *   - topic   … 相談テーマ TOPIC_TAGS の value（= 得意分野の第 1 階層 code）
 *   - price   … 料金プリセット（PRICE_RANGES の value）
 *
 * テーマの判定は users.specialties（0080）の親 ∪ 相談メニューの tags。
 * テーマの列・チップは lib/experts/constants.ts の TOPIC_TAGS から描画（ハードコードしない）。
 * lib/experts/list.ts（共有）は触らず、topic はこのページ側で絞る。
 *
 * 2026-09 ビーチヘッド確定: 海外留学 超特化（在学生・アルムナイの LIVE 情報）。
 * 文言は留学向け。国 = 留学先の国。
 */

export const metadata = {
  title: 'エキスパートを探す',
  description:
    '海外の大学・大学院に在学中／卒業した日本人に、30分からオンライン相談。全員、書類審査による居住認証済み。留学先の国とテーマで絞り込めます。',
};

type Search = {
  country?: string | string[];
  city?: string | string[];
  topic?: string | string[];
  price?: string | string[];
};

function firstParam(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] ?? '' : v ?? '').trim();
}

export default async function ExpertsPage({
  searchParams,
}: {
  searchParams?: Search;
}) {
  const country = firstParam(searchParams?.country).toLowerCase();
  const rawCity = firstParam(searchParams?.city);
  const rawTopic = firstParam(searchParams?.topic);
  const price = firstParam(searchParams?.price);

  // topic は TOPIC_TAGS の value（= 得意分野の第 1 階層 code）。未知の値は無視
  const topic = specialtyGroup(rawTopic) ? rawTopic : '';
  const range = PRICE_RANGES.find((r) => r.value === price);

  const [countryOptions, cityOptions] = await Promise.all([
    listExpertCountries(),
    listExpertCities(country || undefined),
  ]);
  const city = cityOptions.some((c) => c.slug === rawCity) ? rawCity : '';

  const all = await listExperts({
    countryCode: country || undefined,
    citySlug: city || undefined,
    minPrice: range?.min,
    maxPrice: range?.max ?? undefined,
  });
  const specialtiesByUser = await getSpecialtiesByUser(all.map((e) => e.userId));
  const countryNameByCode = new Map(countryOptions.map((c) => [c.code, c.nameJa]));

  const groupsFor = (e: ExpertCardData) =>
    groupsOf(specialtiesByUser.get(e.userId) ?? [], e.topics);
  const experts = topic ? all.filter((e) => groupsFor(e).has(topic)) : all;

  const selectedCountry = countryOptions.find((c) => c.code === country);
  const selectedGroup = topic ? specialtyGroup(topic) : null;
  const filtered = !!(topic || country || city || price);

  // 絞り込み無しのときだけテーマ列を組む。1 人以上いる列だけ、定義順で
  const rows = filtered
    ? []
    : SPECIALTY_GROUPS.map((g) => ({
        group: g,
        experts: all.filter((e) => groupsFor(e).has(g.code)),
      })).filter((r) => r.experts.length > 0);

  const href = (q: Record<string, string>) => ({
    pathname: '/experts',
    query: Object.fromEntries(Object.entries(q).filter(([, v]) => v)),
  });
  const base = { country, city, price, topic };

  const card = (e: ExpertCardData, priority = false) => (
    <ExpertCard
      key={e.userId}
      expert={e}
      specialties={specialtiesByUser.get(e.userId) ?? []}
      enrollment={e.enrollment ?? null}
      countryNameJa={
        e.countryCode ? (countryNameByCode.get(e.countryCode.toLowerCase()) ?? null) : null
      }
      priority={priority}
    />
  );

  return (
    <main className="bg-background text-foreground">
      <div className="mx-auto max-w-[1180px] px-5 sm:px-10">
        {/* ===== 1. lede ===== */}
        <section className="pb-6 pt-9 sm:pt-11">
          <h1 className="text-[clamp(22px,3.1vw,34px)] font-light leading-[1.45] tracking-[-0.005em] text-neutral-500">
            <b className="font-bold text-foreground">先輩を選ぶ。</b>
            日程を決める。留学先のリアルを、30分オンラインで聞く。
          </h1>
          <p className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-neutral-700">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary-700" aria-hidden />
              全員、在学生またはアルムナイ。書類審査による居住認証済み
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary-700" aria-hidden />
              30分 ¥3,000〜
            </span>
          </p>
        </section>

        {/* ===== 2. 国の円形カテゴリ ===== */}
        <div className="flex items-start border-b border-border">
          <div className="flex flex-1 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <CountryCircle
              href={href({ ...base, country: '', city: '' })}
              active={!country}
              code="ALL"
              label="すべての国"
              count={countryOptions.reduce((n, c) => n + c.expertCount, 0)}
              all
            />
            {countryOptions.map((c) => (
              <CountryCircle
                key={c.code}
                href={href({ ...base, country: c.code, city: '' })}
                active={country === c.code}
                code={c.code.toUpperCase()}
                label={c.nameJa}
                count={c.expertCount}
              />
            ))}
          </div>
          <div className="mb-3 ml-4 hidden self-center border-l border-border pl-4 md:block">
            <a
              href="#filters"
              className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-card px-4 py-3 text-[13px] font-semibold transition hover:border-foreground"
            >
              <SlidersHorizontal className="h-[15px] w-[15px]" aria-hidden />
              絞り込む
            </a>
          </div>
        </div>

        {/* ===== 3. 絞り込み行（GET フォーム）===== */}
        <form
          id="filters"
          action="/experts"
          method="GET"
          className="flex flex-wrap items-center gap-2.5 pt-3.5"
        >
          {topic ? <input type="hidden" name="topic" value={topic} /> : null}
          <CityPriceSelects
            key={`${country}:${city}:${price}`}
            country={country}
            city={city}
            price={price}
            cityOptions={cityOptions.map((c) => ({ value: c.slug, label: c.nameJa }))}
            priceOptions={PRICE_RANGES.map((r) => ({ value: r.value, label: r.label }))}
          />
          <noscript>
            <button
              type="submit"
              className="rounded-xl bg-primary-500 px-4 py-2.5 text-[13px] font-bold text-neutral-950"
            >
              絞り込む
            </button>
          </noscript>
          <div className="flex gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TopicChip href={href({ ...base, topic: '' })} active={!topic}>
              すべて
            </TopicChip>
            {SPECIALTY_GROUPS.map((g) => (
              <TopicChip
                key={g.code}
                href={href({ ...base, topic: g.code })}
                active={topic === g.code}
              >
                {g.label}
              </TopicChip>
            ))}
          </div>
          <span className="ml-auto whitespace-nowrap text-[12.5px] text-neutral-500">
            <b className="text-[15px] tabular-nums text-foreground">{experts.length}</b> 名
          </span>
        </form>

        {selectedCountry && cityOptions.length > 0 ? (
          <p className="mt-2 text-[11.5px] text-neutral-500">
            {selectedCountry.nameJa}国内の都市だけを表示しています
          </p>
        ) : null}

        {/* ===== 4. 本体 ===== */}
        {experts.length === 0 ? (
          <div className="px-5 py-20 text-center text-[13px] text-neutral-500">
            <b className="mb-1.5 block text-[16px] text-neutral-700">
              この条件のエキスパートは、まだいません
            </b>
            条件を少しゆるめてみてください。新しいエキスパートは毎月増えています。
            <div className="mt-4">
              <Link
                href="/experts"
                className="inline-flex rounded-full border border-border-strong bg-card px-5 py-2 text-[13.5px] font-bold text-neutral-700 transition hover:border-foreground hover:text-foreground"
              >
                絞り込みをリセット
              </Link>
            </div>
          </div>
        ) : filtered ? (
          <section className="pt-8">
            {selectedGroup ? (
              <h2 className="mb-5 max-w-[36em] text-[clamp(18px,2.2vw,24px)] font-light leading-[1.45] text-neutral-500">
                <b className="font-bold text-foreground">{selectedGroup.label}。</b>
                {selectedGroup.lede}
              </h2>
            ) : null}
            <div className="grid grid-cols-2 gap-x-[14px] gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {experts.map((e, i) => card(e, i < 5))}
            </div>
          </section>
        ) : (
          rows.map((r, ri) => (
            <section key={r.group.code} className="pt-9">
              <h2 className="max-w-[36em] text-[clamp(18px,2.2vw,24px)] font-light leading-[1.45] text-neutral-500">
                <b className="font-bold text-foreground">{r.group.label}。</b>
                {r.group.lede}
              </h2>
              <Link
                href={href({ ...base, topic: r.group.code })}
                className="mt-1.5 inline-flex items-center gap-1.5 text-[13.5px] text-neutral-700 underline decoration-border-strong underline-offset-[5px] transition hover:text-foreground hover:decoration-foreground"
              >
                すべて見る
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
              <div className="mt-4">
                <ExpertRail>{r.experts.map((e, i) => card(e, ri === 0 && i < 6))}</ExpertRail>
              </div>
            </section>
          ))
        )}

        {/* ===== 5. 使い方 ===== */}
        <section className="mt-16 border-t border-border pt-10">
          <h2 className="text-[22px] font-medium">使い方</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <HowTile icon={<Search className="h-6 w-6" aria-hidden />} title="先輩を探す">
              留学先の国とテーマで絞り込み、学校・専攻・相談メニューを見て選びます
            </HowTile>
            <HowTile
              icon={<CalendarCheck className="h-6 w-6" aria-hidden />}
              title="空き枠を選んで予約"
            >
              30分または60分。日本時間の空き枠から選んでリクエスト。チャットでの事前相談は無料です
            </HowTile>
            <HowTile icon={<Video className="h-6 w-6" aria-hidden />} title="オンラインで話す">
              ビデオ通話で、出願・費用・現地生活の「いまのリアル」を聞けます
            </HowTile>
          </div>
        </section>

        {/* ===== 6. 登録 CTA ===== */}
        <section className="mb-20 mt-14 flex flex-wrap items-center gap-7 rounded-[18px] bg-neutral-900 px-7 py-9 text-white sm:px-11">
          <h3 className="max-w-[22em] text-[20px] font-light leading-[1.45] sm:text-[22px]">
            海外の大学・大学院で学ぶあなたへ。
            <br />
            あなたの「留学のリアル」が、
            <b className="font-bold text-primary-500">誰かの30分</b>になります。
          </h3>
          <Link
            href="/become-writer"
            className="rounded-[10px] border border-white px-6 py-3.5 text-[15px] font-semibold transition hover:bg-white hover:text-neutral-900 sm:ml-auto"
          >
            エキスパートとして登録
          </Link>
        </section>
      </div>
    </main>
  );
}

function CountryCircle({
  href,
  active,
  code,
  label,
  count,
  all = false,
}: {
  href: { pathname: string; query: Record<string, string> };
  active: boolean;
  code: string;
  label: string;
  count: number;
  all?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        'flex shrink-0 flex-col items-center gap-2 whitespace-nowrap border-b-2 px-3 pb-3 pt-0.5 text-[12px] transition ' +
        (active
          ? 'border-foreground font-bold text-foreground'
          : 'border-transparent font-medium text-neutral-500 hover:text-foreground')
      }
      aria-current={active ? 'true' : undefined}
    >
      <span
        className={
          'grid h-[62px] w-[62px] place-items-center rounded-full text-[15px] font-bold tracking-[0.08em] transition sm:h-[70px] sm:w-[70px] ' +
          (all
            ? 'bg-neutral-900 text-primary-500'
            : 'border border-border bg-muted text-neutral-700') +
          (active ? ' ring-[3px] ring-primary-500 ring-offset-2 ring-offset-background' : '')
        }
        aria-hidden
      >
        {code}
      </span>
      {label}
      <small className="-mt-1.5 text-[10.5px] font-normal tabular-nums text-neutral-400">
        {count}名
      </small>
    </Link>
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
        'shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[12.5px] transition ' +
        (active
          ? 'border-neutral-900 bg-neutral-900 font-bold text-white'
          : 'border-border-strong bg-card font-medium text-neutral-700 hover:border-foreground hover:text-foreground')
      }
    >
      {children}
    </Link>
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
      <p className="mx-auto mt-1.5 max-w-[22em] text-[13px] leading-relaxed text-neutral-500">
        {children}
      </p>
    </div>
  );
}
