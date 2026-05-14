import { redirect } from 'next/navigation';
import Image from 'next/image';
import { ArrowRight, Compass, Briefcase, MapPin } from 'lucide-react';
import { getViewerMode, homePathFor } from '@/lib/mode/cookie';
import { chooseViewerMode } from '@/lib/mode/actions';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Locore — その街を、誰と歩きますか',
  description:
    'Locore は、世界の街に暮らす日本人の書き手が綴る、小さな旅行誌と暮らしの掲示板。あなたは旅行者ですか、それともそこに暮らす人ですか。',
};

/**
 * 入口スプラッシュページ。
 *
 * - 初回訪問: 旅行者 / 駐在員 の 2 つの大きなカードを並べる
 * - 既に選択済み: cookie の値を読んで /explore か /expat に即リダイレクト
 * - SideMenu のモード切替からいつでも変更可能
 */
export default function SplashPage() {
  const existing = getViewerMode();
  if (existing) {
    redirect(homePathFor(existing));
  }

  return (
    // layout の SiteHeader / Footer / BottomNav の上に被せて、
    // スプラッシュではナビゲーション系を一切見せない。
    <main className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-br from-primary-50 via-card to-card">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-24 h-[480px] w-[480px] rounded-full bg-primary-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 right-0 h-[420px] w-[420px] rounded-full bg-accent-300/20 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-screen-xl flex-col px-4 py-8 sm:px-6 sm:py-12">
        <header className="mx-auto max-w-2xl text-center">
          <p
            className="text-[40px] font-bold tracking-tight sm:text-[56px]"
            style={{
              fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
            }}
          >
            <span className="bg-gradient-to-br from-primary-300 to-primary-500 bg-clip-text text-transparent">
              Locore
            </span>
            <span className="ml-2 align-middle rounded-full bg-primary-500 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-950">
              β
            </span>
          </p>
          <p
            className="mt-6 text-[22px] font-bold leading-[1.4] tracking-tight text-foreground sm:text-[28px]"
            style={{
              fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
            }}
          >
            その街を、
            <br className="sm:hidden" />
            <span className="text-primary-300">誰と</span>
            歩きますか。
          </p>
          <p className="mt-4 text-[13px] leading-[1.9] text-foreground/65 sm:text-[14px]">
            Locore は、世界の街に暮らす日本人の書き手が綴る、
            小さな旅行誌と暮らしの掲示板です。
          </p>
        </header>

        <div className="mt-12 grid flex-1 gap-4 sm:mt-16 sm:grid-cols-2 sm:gap-6">
          <ChoiceCard
            mode="traveler"
            label="Traveler"
            title="旅する人として"
            subtitle="現地に住む書き手の記事と、半日 / 1 日の歩き方ルート。観光地ではない街の輪郭。"
            tags={['スポット紹介', '旅程プラン', '掲示板']}
            imageUrl="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&auto=format&fit=crop&q=80"
            imageAlt="パリ・エッフェル塔の朝"
            accentClass="from-primary-500/60 via-primary-500/20"
            CtaIcon={Compass}
          />
          <ChoiceCard
            mode="resident"
            label="Resident"
            title="そこに暮らす人として"
            subtitle="行政の締切、邦人コミュニティ、求人、アパート、子育て情報。「住んでみて初めて困ること」のまとめ。"
            tags={['行政・締切', '求人・アパート', 'コミュニティ', '記事執筆']}
            imageUrl="https://images.unsplash.com/photo-1524396309943-e03f5249f002?w=1200&auto=format&fit=crop&q=80"
            imageAlt="パリの路地、朝のパン屋"
            accentClass="from-blue-500/60 via-blue-500/20"
            CtaIcon={Briefcase}
          />
        </div>

        <footer className="mt-10 text-center text-[11px] text-foreground/45 sm:mt-12">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            選択は後からメニューでいつでも切り替えできます
          </span>
        </footer>
      </div>
    </main>
  );
}

function ChoiceCard({
  mode,
  label,
  title,
  subtitle,
  tags,
  imageUrl,
  imageAlt,
  accentClass,
  CtaIcon,
}: {
  mode: 'traveler' | 'resident';
  label: string;
  title: string;
  subtitle: string;
  tags: string[];
  imageUrl: string;
  imageAlt: string;
  accentClass: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CtaIcon: any;
}) {
  return (
    <form action={chooseViewerMode} className="flex">
      <input type="hidden" name="mode" value={mode} />
      <button
        type="submit"
        className="group relative flex w-full flex-col overflow-hidden rounded-2xl bg-card text-left shadow-sm ring-1 ring-border transition hover:shadow-xl hover:ring-primary-300 focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted sm:aspect-[4/5]">
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            sizes="(min-width: 640px) 50vw, 100vw"
            priority
            className="object-cover transition duration-700 group-hover:scale-[1.04]"
            unoptimized
          />
          <div
            aria-hidden
            className={`absolute inset-0 bg-gradient-to-t to-transparent ${accentClass}`}
          />
        </div>

        <div className="relative flex flex-1 flex-col gap-3 p-6 sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary-300">
            {label}
          </p>
          <h2
            className="text-[24px] font-bold leading-tight tracking-tight text-foreground sm:text-[30px]"
            style={{
              fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
            }}
          >
            {title}
          </h2>
          <p className="text-[13px] leading-[1.85] text-foreground/70 sm:text-[14px]">
            {subtitle}
          </p>

          <ul className="mt-1 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <li
                key={t}
                className="rounded-full bg-primary-500/10 px-2 py-0.5 text-[10px] font-medium text-primary-300"
              >
                {t}
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-2 text-[13px] font-bold text-neutral-950 transition group-hover:bg-primary-300">
              <CtaIcon className="h-4 w-4" />
              ここから始める
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </button>
    </form>
  );
}
