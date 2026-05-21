import Link from 'next/link';
import { ArrowLeft, PenSquare } from 'lucide-react';

export const revalidate = 300;

export const metadata = {
  title: 'サービス概要 — Locore',
  description:
    'Locore は、世界の街に暮らす日本人の書き手が、現地で取材した小さな旅行誌を届けるメディアです。なぜ作ったのか、何を売っているのか、どこに向かっているのかをまとめました。',
};

/**
 * サービス概要 — Locore の思想を読み手に伝えるための主要ページ。
 *
 * SideMenu「Locore について」からの導線。
 * 仮テキスト感を避け、実際に「読み手・書き手募集」両方に効くよう編集トーンで書く。
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
        <h1
          className="text-[22px] font-semibold tracking-tight text-foreground sm:text-[26px]"
          style={{
            fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
          }}
        >
          Locore について
        </h1>
      </header>

      <section className="prose-locore mt-12 space-y-12">
        <Block title="ガイドブックには載らないものを、信頼できる人から">
          <p>
            観光地は、誰が紹介してもほとんど同じ顔をしています。
            写真も、入り方も、ベストシーズンも、検索すれば 5 分で出てきます。
          </p>
          <p>
            でも、その街に半年・1 年・10 年と住んでいる人が
            「ここは観光客が来ないんですけど、自分はこの季節になると週に 2 回通っています」
            と言える場所の話は、検索では出てきません。
          </p>
          <p>
            Locore は、そういう <strong>「現地に住む人にだけ書ける記事」</strong>を
            読み返せる形でストックしていくためのサービスです。
          </p>
        </Block>

        <Block title="何を読めるのか">
          <p>
            1 本 ¥600〜¥1,500 の短い記事を、3 種類のかたちで出しています。
          </p>
          <ul>
            <li>
              <strong>スポット紹介</strong>
              ——
              1 軒の店、1 本の坂道、1 つの市場を深く掘り下げる
            </li>
            <li>
              <strong>旅程プラン</strong>
              ——
              半日や 1 日で辿れる、書き手自身が歩いてきたルート
            </li>
            <li>
              <strong>駐在者情報</strong>
              ——
              現地で暮らす人のための実務情報（蚊取り線香、保険、納税など）
            </li>
          </ul>
          <p>
            映え目当てではなく、その街の輪郭を一段だけ深く知るための、
            <strong>編集された読み物</strong>を意識しています。
          </p>
        </Block>

        <Block title="どうやって「現地民の本物」を担保するか">
          <p>
            書き手は、対象都市に <strong>1 年以上</strong>住んでいる日本語ネイティブに絞っています。
            投稿前には本人確認と、編集チームによる事実チェックが入ります。
          </p>
          <p>
            また、地図上のスポットは購入するまで H3 という六角形グリッドで広めにぼかして表示し、
            「現地民の通う店をスクショで持っていかれて荒らされる」というよくある問題を避ける設計にしています。
          </p>
        </Block>

        <Block title="読み手のため、書き手のため">
          <p>
            <strong>読み手</strong>には、
            英語と現地語が中途半端でうまく検索できない、
            でも「観光地以外も 1 つ 2 つ入れたい」と思っている旅行者に向けて作っています。
          </p>
          <p>
            <strong>書き手</strong>は、現地で生活している在外邦人のうち、
            文章を書くこと自体に責任感とこだわりを持てる方を歓迎します。
            フォロワー数や肩書は問いません。街への愛着の深さで選びます。
          </p>
        </Block>

        <Block title="広げ方">
          <p>
            まずはフランス。パリ＆近郊から始めて、リヨン、ボルドー、ニース、
            プロヴァンス、ノルマンディーなど、書き手が育ったタイミングで地域ごとに開けていきます。
          </p>
          <p>
            その先は、ロンドン・NYC・台北・ハノイ・リスボン。
            信頼できる現地ライターが見つかった街から、ひとつずつ。
            ペースを優先するつもりはありません。
          </p>
        </Block>

        <Block title="お金のこと">
          <p>
            記事 1 本 ¥600〜¥1,500。
            決済手数料を差し引いた残りのうち、
            <strong>70% を書き手に</strong>お渡しする設計です。
          </p>
          <p>
            Founders（先着 50 人）として参加してくださる方には、
            さらに優遇された取り分と、サービス方針への発言権をお渡しします。
          </p>
        </Block>

        <Block title="運営について">
          <p>
            日本の個人事業主として運営しています。
            決済は Stripe を経由しています。
            書き手への送金は、規模に応じて手動から自動に切り替えていく予定です。
          </p>
          <p>
            データの扱いについては、別途プライバシーポリシーをご覧ください。
          </p>
        </Block>
      </section>

      <footer className="mt-14 rounded-2xl bg-primary-500/10 px-6 py-8 text-center ring-1 ring-border">
        <p className="text-[14px] font-semibold text-foreground">
          書いてみたい方へ
        </p>
        <p className="mt-1 text-[12px] text-foreground/65">
          現在は Founders 枠（先着 50 人）を募集しています。
          現地に 1 年以上暮らしていて、文章で「街のこと」を書いてみたい方は、応募ページをのぞいてみてください。
        </p>
        <Link
          href="/founders"
          className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-1.5 text-[12px] font-bold text-neutral-950 transition hover:bg-primary-300"
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
        className="text-[22px] font-bold leading-tight tracking-tight text-foreground sm:text-[24px]"
        style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
      >
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[14px] leading-[1.9] text-foreground/80">
        {children}
      </div>
    </div>
  );
}
