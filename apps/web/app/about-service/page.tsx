import Link from 'next/link';
import { ArrowLeft, PenSquare } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'サービス概要 — Locore',
  description:
    'Locore は、在外邦人がつくる「もう一段深い旅」のためのメディアです。サービスの思想とこれからの方向性についてまとめています。',
};

/**
 * サービス概要 — 後で本人が編集する想定のプレースホルダ。
 *
 * /about（公開向け LP）とは別軸で、SideMenu からアクセスできる
 * 「思想・なぜ作ったか・どこに向かっているか」のページ。
 * Markdown ライクな見出し + 段落構成で土台を作っておき、ここを
 * 中心に編集してもらう。
 */
export default function AboutServicePage() {
  return (
    <main className="mx-auto max-w-screen-md px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        ホームに戻る
      </Link>

      <header className="mt-4">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-500" />
          サービス概要
        </p>
        <h1
          className="mt-3 text-[34px] font-bold leading-tight tracking-tight text-foreground sm:text-[40px]"
          style={{
            fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
          }}
        >
          Locore とは、何のためにあるのか
        </h1>
        <p className="mt-3 max-w-prose text-[14px] leading-relaxed text-foreground/65">
          ※ このページは編集予定のプレースホルダです。
          サービスの思想・つくった経緯・今後の方向性をここにまとめます。
        </p>
      </header>

      <section className="prose-locore mt-10 space-y-10">
        <Block title="なぜ作ったか">
          <p>
            旅行ガイドの大半は「映え」と「効率」に寄りすぎていて、
            その土地に実際に住んでいる人たちが日常で大切にしているものは、
            なかなか旅行者に届かない。
          </p>
          <p>
            一方で、現地に住む邦人クリエイターは、
            毎日歩く街の文脈や、観光地として消費されていない場所の話を持っている。
            この距離を埋めたい、というのが Locore を始めた最初の動機。
          </p>
          <p className="text-foreground/45">
            ※ ここはあとで筆者本人の言葉で書き換える。
          </p>
        </Block>

        <Block title="何を売っているのか">
          <p>
            観光ガイドではなく、<strong>編集された短尺の旅行誌</strong>。
            1 本 ¥600〜¥1,500 で、現地に住む人だけが書ける視点を切り取った
            読み物として届ける。
          </p>
          <p>
            無料 SNS 投稿との違いは、
          </p>
          <ul>
            <li>編集が入っていること（事実確認・構成・読みやすさ）</li>
            <li>ストックされること（タイムラインで流れない）</li>
            <li>クリエイターに利益が戻る経済圏になっていること</li>
          </ul>
        </Block>

        <Block title="誰のためのサービスか">
          <p>
            <strong>読み手</strong>:
            旅行先で「観光地ではないところを 1〜2 個入れたい」と思っている、
            英語と現地語が中途半端で情報の解像度に困っている日本人旅行者。
          </p>
          <p>
            <strong>書き手</strong>:
            現地に 1 年以上住んでいる邦人で、文章を書くこと自体に
            ある程度の責任感とこだわりを持てる人。フォロワー数は問わない。
          </p>
        </Block>

        <Block title="どこに向かっているか">
          <p>
            まずはパリ。次にロンドン・NYC・台北・ソウル。
            英語圏／非英語圏に偏らないバランスで広げる。
          </p>
          <p>
            「AI が公開情報を要約して掲示板に出す」「危機情報を日本語で速報」
            のように、滞在中に役立つレイヤーも順次乗せていく。
          </p>
          <p className="text-foreground/45">
            ※ ロードマップ詳細はあとで書き加える。
          </p>
        </Block>

        <Block title="価格・取り分">
          <p>
            記事 1 本 ¥600 〜 ¥1,500、初期は手数料控除後の{' '}
            <strong>70% をクリエイター</strong>に還元する設計。
            Founders（先着 50 人）枠はさらに優遇あり。
          </p>
          <p className="text-foreground/45">
            ※ 数字はサービス進捗で更新。
          </p>
        </Block>

        <Block title="運営について">
          <p>
            日本の個人事業主として運営しています。
            決済は Stripe、クリエイター送金は手動運用（規模に応じて自動化）。
            技術スタック・データの扱いについては、別途プライバシーポリシーをご参照ください。
          </p>
        </Block>
      </section>

      <footer className="mt-14 rounded-2xl bg-primary-500/10 px-6 py-8 text-center ring-1 ring-border">
        <p className="text-[14px] font-semibold text-foreground">
          Locore で書いてみたい方へ
        </p>
        <p className="mt-1 text-[12px] text-foreground/65">
          Founders 枠は先着 50 人。フォロワー数より、街への深さを最優先で選びます。
        </p>
        <Link
          href="/founders"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-1.5 text-[12px] font-bold text-neutral-950 transition hover:bg-primary-300"
        >
          <PenSquare className="h-3.5 w-3.5" />
          応募ページを見る
        </Link>
      </footer>
    </main>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2
        className="text-[22px] font-bold leading-tight tracking-tight text-foreground"
        style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
      >
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[14px] leading-[1.85] text-foreground/80">
        {children}
      </div>
    </div>
  );
}
