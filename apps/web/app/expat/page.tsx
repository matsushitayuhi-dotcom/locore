import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Lock } from 'lucide-react';
import { listCountriesForPicker } from '@/lib/geo/countries';
import type { CountryListItem } from '@/lib/geo/countries';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Locore for Residents — 国を選ぶ',
  description:
    '駐在員と、駐在員と繋がりたい人のためのホーム。あなたが暮らしている国を選んでください。',
};

/**
 * 駐在員向けトップ (/expat) — 国選択画面。
 *
 * /explore と同じ「国を大陸別グリッド」見せ方を踏襲しつつ、
 * リンク先を /expat/<code> に向ける。
 *
 * 現状 Locore で active な駐在員向け国は フランスのみ。
 * 他の国は coming_soon としてグレーアウトで表示する。
 *
 * (将来的に viewer の cookie に「最後に見た国」を入れて、ここで自動 redirect も
 *  検討余地あり。ただし cookie 越しの自動遷移は事故りやすいので今は実装しない。)
 */
export default async function ExpatHomePage() {
  const countries = await listCountriesForPicker();

  // 駐在員ホームの active = フランスだけ、という現状を明示するために
  // ここで再度 filter する。/explore と違って国の active = 駐在員コンテンツありの
  // 国だけにしたいので、今は code === 'fr' のみを active 扱い、他は coming_soon にする。
  const adjusted: CountryListItem[] = countries.map((c) =>
    c.code === 'fr'
      ? { ...c, status: 'active' as const }
      : { ...c, status: 'coming_soon' as const },
  );

  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-xl space-y-10 px-4 py-8 sm:space-y-14 sm:px-6 sm:py-12">
        <section>
          <div className="mb-4">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-500" />
              駐在員ホーム
            </p>
            <h1
              className="mt-2 text-[22px] font-bold leading-tight tracking-tight sm:text-[26px]"
              style={{
                fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
              }}
            >
              どの国に住んでいますか？
            </h1>
            <p className="mt-1 max-w-2xl text-[12px] text-foreground/75 sm:text-[13px]">
              暮らしている国を選ぶと、その国の掲示板（求人 / アパート / 売買 / メンバー募集 / 習い事 / 助け合い）と新着ニュースが見えます。今はフランスから始めています。
            </p>
          </div>

          <ExpatCountryGrid countries={adjusted} />
        </section>
      </div>
    </main>
  );
}

/**
 * /explore で使っている CountryGridByContinent は遷移先が /country/<code> 固定で、
 * 駐在員モードでは /expat/<code> に向けたいので、ここに小さい版を持つ。
 * (見た目は /explore の見せ方を踏襲して、デザインの一貫性は保つ)
 */

const CONTINENT_LABEL: Record<string, string> = {
  europe: 'ヨーロッパ',
  asia: 'アジア',
  americas: 'アメリカ',
  oceania: 'オセアニア',
  middle_east: '中東',
  africa: 'アフリカ',
};

const CONTINENT_ORDER = [
  'europe',
  'asia',
  'americas',
  'oceania',
  'middle_east',
  'africa',
];

function fallbackImage(slug: string): string {
  return `https://picsum.photos/seed/${slug}/600/800`;
}

function ExpatCountryGrid({ countries }: { countries: CountryListItem[] }) {
  if (countries.length === 0) return null;

  const byContinent: Record<string, CountryListItem[]> = {};
  for (const c of countries) {
    const key = c.continent ?? 'other';
    (byContinent[key] ??= []).push(c);
  }

  const orderedKeys = [
    ...CONTINENT_ORDER.filter((k) => byContinent[k]?.length),
    ...Object.keys(byContinent).filter((k) => !CONTINENT_ORDER.includes(k)),
  ];

  return (
    <div className="space-y-10 sm:space-y-12">
      {orderedKeys.map((continent) => {
        const list = byContinent[continent];
        if (!list || list.length === 0) return null;
        const active = list.filter((c) => c.status === 'active');
        const coming = list.filter((c) => c.status !== 'active');
        const ordered = [...active, ...coming];
        return (
          <section key={continent} aria-label={CONTINENT_LABEL[continent] ?? continent}>
            <h3 className="mb-3 text-[12px] font-bold uppercase tracking-[0.18em] text-foreground/55 sm:text-[13px]">
              {CONTINENT_LABEL[continent] ?? continent}
            </h3>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {ordered.map((c) => (
                <li key={c.code}>
                  <ExpatCountryTile country={c} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function ExpatCountryTile({ country }: { country: CountryListItem }) {
  const active = country.status === 'active';

  const inner = (
    <div
      className={
        'group relative block overflow-hidden rounded-xl ring-1 transition ' +
        (active
          ? 'ring-border hover:shadow-md hover:ring-primary-300'
          : 'cursor-not-allowed ring-border opacity-70')
      }
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
        <Image
          src={country.heroImageUrl ?? fallbackImage(country.code)}
          alt={country.nameJa}
          fill
          sizes="(min-width: 1280px) 14vw, (min-width: 1024px) 18vw, (min-width: 768px) 23vw, (min-width: 640px) 30vw, 45vw"
          className={
            'object-cover transition duration-500 ' +
            (active ? 'group-hover:scale-[1.04]' : 'grayscale')
          }
          unoptimized
        />
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
            className="!text-white mt-0.5 truncate text-[14px] font-bold leading-tight tracking-tight sm:text-[15px]"
            style={{
              fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
            }}
          >
            {country.nameJa}
          </h3>
          {active ? (
            <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-white/85">
              駐在員ホームへ
              <ArrowRight className="h-3 w-3" />
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (!active) {
    return (
      <div aria-disabled title="準備中" className="block">
        {inner}
      </div>
    );
  }
  return (
    <Link href={`/expat/${country.code}`} className="block">
      {inner}
    </Link>
  );
}
