import Link from 'next/link';
import { Button } from '@locore/ui';
import { Sparkles, BadgeCheck } from '@locore/ui/icons';
import { ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'Locore とは',
  description:
    'Locore は、在外邦人クリエイターが現地で書く有料・編集的な旅行誌。観光ガイドにはない街の輪郭を、現地で暮らす人の目線から届けます。',
};

export default function AboutPage() {
  return (
    <main className="bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 -top-40 h-[400px] w-[400px] rounded-full bg-primary-500/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 right-0 h-[300px] w-[300px] rounded-full bg-accent-500/10 blur-3xl"
        />
        <div className="relative mx-auto max-w-screen-md px-4 py-16 sm:px-6 sm:py-24">
          <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300 ring-1 ring-border">
            <Sparkles className="h-3 w-3" />
            About Locore
          </p>
          <h1
            className="text-[36px] font-semibold leading-[1.15] tracking-tight text-foreground sm:text-[52px]"
          >
            観光ガイドの 1 行先にある、
            <br className="hidden sm:block" />
            街の本当の輪郭を持ち帰る
          </h1>
          <p className="mt-6 text-[16px] leading-[1.9] text-foreground/70">
            Locore（ロコレ）は、在外邦人のクリエイターが現地で書く、有料・短尺の旅行誌です。
            映え目当ての観光ガイドや、誰でも書ける AI 旅行記事ではなく、
            <strong className="font-semibold text-foreground">
              {' '}その街で実際に暮らしている人だけが知っている「もう一段深い情報」
            </strong>
            を、編集の手を入れて届けます。
          </p>
        </div>
      </section>

      {/* Why */}
      <section className="mx-auto max-w-screen-md px-4 py-16 sm:px-6 sm:py-20">
        <SectionHeader kicker="Why" title="なぜ Locore か" />
        <p className="mt-6 text-[15px] leading-[1.9] text-foreground/75">
          海外旅行の情報源は、いま 3 種類に集約されつつあります — 観光ガイドブック、SNS、そして AI 旅行アシスタント。
          どれもそれぞれの便利さがありますが、
          <strong className="font-semibold text-foreground">
            {' '}「現地で実際に暮らしている人が、平日の昼に通っている店」
          </strong>
          のような情報は、いずれにもほぼ載っていません。
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <ContrastCard
            label="観光ガイド"
            issue="情報が古い・大規模店舗中心・現地民の感覚は薄い"
          />
          <ContrastCard
            label="SNS / 映え系"
            issue="集客のために観光地化が加速、リアルな日常からは離れる"
          />
          <ContrastCard
            label="AI 旅行アシスタント"
            issue="既存の Web 上の情報の編集に過ぎず、ローカル経験を持たない"
          />
        </div>
        <div className="mt-10 rounded-xl border border-primary-500/30 bg-primary-500/5 p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary-300">
            Locore のスタンス
          </p>
          <p
            className="mt-2 text-[20px] font-semibold leading-snug text-foreground"
          >
            居住経験 = 信頼レイヤー、編集の手 = 品質レイヤー。
          </p>
          <p className="mt-3 text-[14px] leading-[1.9] text-foreground/70">
            執筆者は全員、現地に一定期間以上住んでいる日本人。さらに編集チームが
            内容の独自性とローカル度をチェックし、観光地寄りに偏ったものは
            ローカルスコアを下げて読者に明示します。
          </p>
        </div>
      </section>

      {/* Who: creators */}
      <section className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-screen-md px-4 py-16 sm:px-6 sm:py-20">
          <SectionHeader kicker="Who" title="書き手 — クリエイター" />
          <p className="mt-6 text-[15px] leading-[1.9] text-foreground/75">
            Locore のクリエイターは、現地に住む日本人。商業的に動くインフルエンサーではなく、
            自分の街への愛着で書く生活者です。3 つの Tier に分かれており、
            居住年数とコンテンツ実績で判定します。
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <TierCard
              tier="S"
              years="5 年以上"
              note="居住認証 + 編集部レビュー通過 + 累計売上 50 万円以上"
            />
            <TierCard
              tier="A"
              years="3 年以上"
              note="居住認証 + 編集部レビュー通過"
            />
            <TierCard
              tier="B"
              years="1 年以上"
              note="居住認証のみ。書き手としての修行段階"
            />
          </div>
          <p className="mt-8 text-[13px] leading-[1.9] text-foreground/60">
            クリエイターになるには
            <Link
              href="/become-writer"
              className="ml-1 text-primary-300 underline-offset-4 hover:underline"
            >
              こちら
            </Link>
            から申請してください。Founders 枠（先着 50 名）は手数料優遇 + 永久バッジ付き。
          </p>
        </div>
      </section>

      {/* What: content principles */}
      <section className="mx-auto max-w-screen-md px-4 py-16 sm:px-6 sm:py-20">
        <SectionHeader kicker="What" title="コンテンツの方針" />
        <ul className="mt-8 space-y-6">
          <PrincipleItem
            title="編集の手が入っている"
            body="自由投稿の SNS と違い、すべての公開記事は編集チームのレビューを経ます。事実の裏取り・規約違反のスクリーニング・観光客向けすぎないかの判定を行います。"
          />
          <PrincipleItem
            title="ローカルスコアで透明性を担保"
            body="各記事に 0–100 のローカルスコアを付与します。Google 評価件数・SNS 露出度・クリエイターの主観などをハイブリッドで算出。観光地寄りの記事もスコアを明示した上で公開します。"
          />
          <PrincipleItem
            title="映え禁止"
            body="カバー画像は 3:2、本文は短尺の編集的文体。SNS 的な過剰演出ではなく、平日の昼の店内のような「普段の街の表情」を尊重します。"
          />
          <PrincipleItem
            title="スポット位置情報は購入後に解放"
            body="無料プレビューではエリアまでしか表示しません。具体的な店舗・住所・営業時間は購入後に解放されます。クリエイターの取材コストを保護するための設計です。"
          />
        </ul>
      </section>

      {/* How */}
      <section className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-screen-md px-4 py-16 sm:px-6 sm:py-20">
          <SectionHeader kicker="How" title="使い方" />
          <ol className="mt-8 space-y-4">
            <StepItem
              n={1}
              title="記事を読む"
              body="フィードまたはマップから、街・テーマ・ローカル度で記事を選びます。無料プレビューで雰囲気を確認できます。"
            />
            <StepItem
              n={2}
              title="気になったら購入"
              body="1 記事 ¥600〜3,000 程度。購入と同時に本文・スポット詳細・地図ピンが解放されます。返金不可ですが、品質が著しく低い場合は個別対応します。"
            />
            <StepItem
              n={3}
              title="気になることはクリエイターに直接質問"
              body="記事クリエイターとは 1:1 のメッセージで質問できます。営業時間の変動など現地でないと分からないことも、直接聞けます。"
            />
            <StepItem
              n={4}
              title="旅程に追加して、地図で見ながら歩く"
              body="購入した記事のスポットは旅程ページに自由に組み合わせられます。Google マップ連携で道順も確認できます。"
            />
          </ol>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-screen-md px-4 py-16 sm:px-6 sm:py-20">
        <SectionHeader kicker="Pricing" title="価格・手数料" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/50">
              読者
            </p>
            <p
              className="mt-2 text-[28px] font-semibold tabular text-foreground"
            >
              ¥600 〜 ¥3,000
              <span className="ml-1 text-[14px] font-normal text-foreground/50">
                / 1 記事
              </span>
            </p>
            <p className="mt-2 text-[13px] leading-[1.9] text-foreground/70">
              ガイドブック 1 章分相当が、現地民の編集付きで手に入る価格帯。
              月額サブスクではなく、買い切り。
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/50">
              クリエイター
            </p>
            <p
              className="mt-2 text-[28px] font-semibold tabular text-foreground"
            >
              売上の 70%
              <span className="ml-1 text-[14px] font-normal text-foreground/50">
                を還元
              </span>
            </p>
            <p className="mt-2 text-[13px] leading-[1.9] text-foreground/70">
              プラットフォーム手数料は 30%。決済・モデレーション・配信・サポートを含みます。
              Founders 枠は最初の 2 年間 80% 還元。
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-screen-md px-4 py-16 sm:px-6 sm:py-20">
          <SectionHeader kicker="FAQ" title="よくある質問" />
          <div className="mt-8 space-y-3">
            <FaqItem
              q="記事の返金はできますか？"
              a="原則できません。デジタルコンテンツの性質上、購入後すぐに本文と位置情報が解放されるためです。ただし、記載情報に重大な誤り（店舗閉業・全く異なる場所）がある場合は個別に審査のうえ対応します。"
            />
            <FaqItem
              q="クリエイターはどう選んでいますか？"
              a="現地居住 1 年以上の証明（在留カード・公共料金の請求書等）を編集部が確認します。さらに最初の 3 本の投稿は編集レビュー必須。観光地紹介に偏ったり、事実誤認があれば差し戻します。"
            />
            <FaqItem
              q="他のサービスや雑誌で見た店も Locore に載りますか？"
              a="載ることはあります。ただし「観光地化済み」と編集が判断するとローカルスコアが下がる仕組みです。Locore の主役は「ガイドブックにまだ載っていない場所」ですが、地元の人が日常で通う店なら有名店も対象です。"
            />
            <FaqItem
              q="購入後にクリエイターにどこまで質問できますか？"
              a="基本的に 1 記事あたり数往復までは無料の範囲。「平日の何時頃が空いている？」「ベジタリアン対応？」のようなライトな質問が想定されています。深掘りした 1on1 コンサルティングは別途有料サービスとして提供しているクリエイターもいます。"
            />
            <FaqItem
              q="海外からでも使えますか？"
              a="はい。アカウント言語は日本語ですが、ブラウザ・スマホからどこからでも利用できます。決済は Stripe（日本円建て）です。多言語対応は順次拡大予定。"
            />
            <FaqItem
              q="プライバシー・規約について"
              a={
                <>
                  <Link
                    href="/legal/privacy"
                    className="text-primary-300 underline-offset-4 hover:underline"
                  >
                    プライバシーポリシー
                  </Link>
                  {' / '}
                  <Link
                    href="/legal/terms"
                    className="text-primary-300 underline-offset-4 hover:underline"
                  >
                    利用規約
                  </Link>
                  {' / '}
                  <Link
                    href="/contact?category=takedown"
                    className="text-primary-300 underline-offset-4 hover:underline"
                  >
                    送信防止措置申出（プロ責法）
                  </Link>
                  をご覧ください。
                </>
              }
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-screen-md px-4 py-16 sm:px-6 sm:py-20">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500/15 via-card to-card p-8 ring-1 ring-border sm:p-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary-500/20 blur-3xl"
          />
          <p className="inline-flex items-center gap-1 rounded-full bg-primary-500 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-950">
            Founders 枠 — 先着 50 名
          </p>
          <h2
            className="mt-4 text-[28px] font-semibold leading-snug tracking-tight text-foreground"
          >
            Locore を一緒に育てるクリエイター、
            <br className="hidden sm:block" />
            いま探しています。
          </h2>
          <p className="mt-4 text-[14px] leading-[1.9] text-foreground/70">
            取り分の優遇（最初 2 年 80%）、永久 Founders バッジ、編集チームへのフィードバック権。
            フォロワー数ではなく、街への深さを最優先で選びます。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/founders">
              <Button variant="primary" size="lg">
                応募ページを見る
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="lg">
                まず記事を見てみる
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function SectionHeader({
  kicker,
  title,
}: {
  kicker: string;
  title: string;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
        {kicker}
      </p>
      <h2
        className="text-[28px] font-semibold leading-tight tracking-tight text-foreground sm:text-[34px]"
      >
        {title}
      </h2>
    </div>
  );
}

function ContrastCard({ label, issue }: { label: string; issue: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-foreground/60">
        {label}
      </p>
      <p className="mt-2 text-[13px] leading-[1.85] text-foreground/75">
        {issue}
      </p>
    </div>
  );
}

function TierCard({
  tier,
  years,
  note,
}: {
  tier: string;
  years: string;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-500 text-[14px] font-bold text-neutral-950">
          {tier}
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/60">
          居住 {years}
        </p>
      </div>
      <p className="mt-3 text-[13px] leading-[1.85] text-foreground/75">{note}</p>
    </div>
  );
}

function PrincipleItem({ title, body }: { title: string; body: string }) {
  return (
    <li className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start gap-3">
        <BadgeCheck
          className="mt-0.5 size-5 shrink-0 text-primary-300"
          aria-hidden
        />
        <div className="flex-1">
          <p className="text-[16px] font-semibold text-foreground">{title}</p>
          <p className="mt-2 text-[14px] leading-[1.85] text-foreground/70">{body}</p>
        </div>
      </div>
    </li>
  );
}

function StepItem({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-4">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500 text-[14px] font-bold text-neutral-950 tabular">
        {n}
      </span>
      <div className="flex-1 pb-1">
        <p className="text-[16px] font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-[14px] leading-[1.85] text-foreground/70">
          {body}
        </p>
      </div>
    </li>
  );
}

function FaqItem({ q, a }: { q: string; a: React.ReactNode }) {
  return (
    <details className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-border-strong">
      <summary className="flex cursor-pointer items-center justify-between gap-3 text-[14px] font-semibold text-foreground">
        <span>{q}</span>
        <span className="text-[18px] text-foreground/40 transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="mt-3 text-[13px] leading-[1.9] text-foreground/70">{a}</div>
    </details>
  );
}
