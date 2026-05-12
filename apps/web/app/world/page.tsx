import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { WorldPicker } from '@/components/WorldPicker';
import { listCountriesForPicker } from '@/lib/geo/countries';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '世界の国一覧 — Locore',
  description:
    '今すぐ旅できる国と、これから順次公開する国の一覧。タップするとその国の地域に進めます。',
};

/**
 * 世界ピッカー全件ページ。
 *
 * トップ / の国カルーセルは 10 件までに絞っていて、その先（残り全部）が
 * このページに来る。レイアウトは大陸ごとのリッチカード。
 */
export default async function WorldPage() {
  const countries = await listCountriesForPicker();
  const activeCount = countries.filter((c) => c.status === 'active').length;

  return (
    <main className="bg-background">
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary-50 via-card to-card">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 -top-24 h-96 w-96 rounded-full bg-primary-200/40 blur-3xl"
        />
        <div className="relative mx-auto max-w-screen-xl px-4 pb-8 pt-8 sm:px-6 sm:pb-12 sm:pt-12">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            ホームに戻る
          </Link>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300 shadow-sm ring-1 ring-border">
            <Sparkles className="h-3 w-3 text-primary-500" />
            World
          </p>
          <h1
            className="mt-3 text-[30px] font-bold leading-tight tracking-tight text-foreground sm:text-[40px]"
            style={{
              fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
            }}
          >
            世界のどこを旅しますか？
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-foreground/70">
            今すぐ旅できるのは <strong className="text-primary-300">{activeCount}</strong> カ国。
            それ以外の国は順次オープンしていきます。
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 sm:py-14">
        <WorldPicker countries={countries} />
      </div>
    </main>
  );
}
