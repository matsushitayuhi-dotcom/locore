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
 * - countries マスタから大陸ごとにグルーピングして並べる
 * - status='active' な国だけクリック可能 → /region/<primary>
 * - フランス以外は coming_soon でロック表示
 *
 * 地域別のホーム（検索 / 掲示板 / スポット 10 件 / 旅程 10 件）は
 * /region/[slug] に移した。
 */
export default async function HomePage() {
  const countries = await listCountriesForPicker();

  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-xl px-4 pt-8 pb-12 sm:px-6 sm:pt-12">
        <header className="mb-10 max-w-2xl">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-500" />
            まずはどこへ
          </p>
          <h1
            className="mt-3 text-[34px] font-bold leading-[1.1] tracking-tight text-foreground sm:text-[44px]"
            style={{
              fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
            }}
          >
            世界のどこを旅しますか？
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-foreground/70 sm:text-[15px]">
            Locore は順次、世界の旅先に広げていきます。
            いまはフランス・パリから。それ以外の国はもうしばらくお待ちください。
          </p>
        </header>

        <WorldPicker countries={countries} />
      </div>
    </main>
  );
}
