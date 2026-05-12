import { Sparkles } from 'lucide-react';
import { WorldPicker } from '../components/WorldPicker';
import { listCountriesForPicker } from '@/lib/geo/countries';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Locore — 世界中の "本物" を、現地民が案内する',
  description:
    'まずどの国に行きますか？ Locore は在外邦人クリエイターが現地で書く旅行誌。フランスから順次、世界の旅先を展開していきます。',
};

/**
 * ルート / は世界ピッカー。
 *
 * - Hero band（編集的なタイトル）
 * - WorldPicker: 今すぐ旅できる国 + 大陸別の Coming Soon
 * - 国カードクリック → /country/<code> でその国の地域一覧へドリルダウン
 */
export default async function HomePage() {
  const countries = await listCountriesForPicker();
  const activeCount = countries.filter((c) => c.status === 'active').length;

  return (
    <main className="bg-background">
      {/* Hero band */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary-50 via-card to-card">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 -top-24 h-96 w-96 rounded-full bg-primary-200/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 right-0 h-80 w-80 rounded-full bg-accent-300/20 blur-3xl"
        />
        <div className="relative mx-auto max-w-screen-xl px-4 pb-10 pt-10 sm:px-6 sm:pb-14 sm:pt-16">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300 shadow-sm ring-1 ring-border">
            <Sparkles className="h-3 w-3 text-primary-500" />
            まず、どこへ
          </p>
          <h1
            className="mt-4 text-[34px] font-bold leading-[1.08] tracking-tight text-foreground sm:text-[52px]"
            style={{
              fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
            }}
          >
            世界のどこを、
            <br className="sm:hidden" />
            <span className="relative inline-block">
              <span className="relative z-10 text-primary-300">深く</span>
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-1 z-0 h-2.5 rounded-full bg-primary-500/15"
              />
            </span>
            旅しますか？
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-[1.85] text-foreground/75 sm:text-[16px]">
            Locore は、現地に住む邦人クリエイターが綴る、観光ガイドにはない街の物語。
            まずは <strong className="text-primary-300">{activeCount}</strong> カ国から。
            そのほかの国は順次オープンしていきます。
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 sm:py-14">
        <WorldPicker countries={countries} />
      </div>
    </main>
  );
}
