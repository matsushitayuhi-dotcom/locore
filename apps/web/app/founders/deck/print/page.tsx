import { SlideCover } from '@/components/deck/slides/Cover';
import { SlideSection } from '@/components/deck/slides/Section';
import { SlideHeadline } from '@/components/deck/slides/Headline';
import { SlideStat } from '@/components/deck/slides/Stat';
import { SlideQuote } from '@/components/deck/slides/Quote';
import { SlideBulletList } from '@/components/deck/slides/BulletList';
import { SlideCompare } from '@/components/deck/slides/Compare';
import { SlideCTA } from '@/components/deck/slides/CTA';
import { PrintButton } from './PrintButton';

/**
 * /founders/deck/print — Founders 50 募集 PDF 配布用デッキ。
 *
 * 構成 (20 ページ):
 *   1. Cover
 *   2. Mission Quote
 *   3-5. Section 01 + Problem ×2
 *   6-10. Section 02 + コアコンピタンス + 3 サービス + ローカルスコア + Compare
 *   11. 3 Reader segments
 *   12-13. Section 03 + Revenue model
 *   14-17. Section 04 + Founders 50 design
 *   18-19. Application flow / Roadmap
 *   20. CTA
 *
 * 内容は 05-14 打合せ議事録に基づく。
 *
 * 使い方:
 *   1. このページを開く
 *   2. ブラウザの「印刷」(Cmd+P) を実行
 *   3. プリンタ欄で「PDF として保存」
 *   4. 用紙: A4 / 余白: なし / 背景のグラフィック印刷: ON
 *   5. 保存
 */

export const metadata = {
  title: 'Locore Founders 50 — 募集要項',
};

export default function DeckPrintPage() {
  return (
    <div className="deck-print-root bg-neutral-100 print:bg-white">
      {/* 印刷時には消えるツールバー */}
      <header className="deck-toolbar sticky top-0 z-30 border-b border-border bg-card/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
              Founders 50 — 募集要項
            </p>
            <p className="mt-0.5 text-[12px] text-foreground/65">
              A4 縦 / 20 ページ。下のボタンか{' '}
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                Cmd + P
              </kbd>{' '}
              で PDF として保存できます。
            </p>
          </div>
          <PrintButton />
        </div>
      </header>

      <section className="deck-instructions mx-auto max-w-screen-md px-4 py-6 text-[12px] text-foreground/65 sm:px-6">
        <details className="rounded-md bg-card p-4 ring-1 ring-border">
          <summary className="cursor-pointer font-semibold text-foreground">
            きれいな PDF を出すコツ（4 つ）
          </summary>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5">
            <li>用紙サイズ: <strong>A4 (210×297mm)</strong></li>
            <li>余白: <strong>なし</strong></li>
            <li><strong>背景のグラフィックを印刷</strong> を ON</li>
            <li>ヘッダー / フッターを <strong>OFF</strong>（プリンタオプション内）</li>
          </ol>
          <p className="mt-3 text-foreground/55">
            ※ Chrome 系ブラウザを推奨
          </p>
        </details>
      </section>

      {/* スライド本体 */}
      <div className="deck-pages mx-auto flex max-w-[1080px] flex-col items-center gap-6 px-4 pb-20 print:max-w-none print:gap-0 print:p-0">

        {/* ────────────────────────────────────────────────────────── */}
        {/* 1. Cover                                                    */}
        {/* ────────────────────────────────────────────────────────── */}
        <Page>
          <SlideCover
            kicker="Founders 50 募集"
            title="在外邦人の価値を、最大限発信する。"
            subtitle="Locore は、駐在員・留学生・ワーホリの「時間・人脈・知見」を発信と収益に変える 3 サービスのプラットフォームです。最初の Founders 50 人を募集します。"
            pageNumber={1}
          />
        </Page>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 2. Mission Quote                                            */}
        {/* ────────────────────────────────────────────────────────── */}
        <Page>
          <SlideQuote
            quote="ローカル × コア。住んでいる人の時間と人脈を、価値に変える。"
            attribution="Locore（ロコア）"
            pageNumber={2}
          />
        </Page>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 3. Section 01: なぜ Locore を作るのか                       */}
        {/* ────────────────────────────────────────────────────────── */}
        <Page>
          <SlideSection
            chapter={1}
            title="なぜ Locore を作るのか"
            oneLiner="既存の旅行情報の課題と、駐在員の眠っている知見について。"
            pageNumber={3}
          />
        </Page>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 4. Problem 1: 旅行情報の画一化                              */}
        {/* ────────────────────────────────────────────────────────── */}
        <Page>
          <SlideHeadline
            kicker="課題 ①"
            title="旅行情報は、もう同じ顔ばかり。"
            body={[
              'ガイドブックも、SNS も、検索結果も、似たような観光地の似たような写真ばかりが並ぶ。AI で 5 分で出てくる情報を、わざわざお金を払って読む人はいません。',
              '既存メディアは広告依存で匿名性が高く、誰がどんな立場で書いた情報なのかが見えづらい。結果、混雑する場所に観光客が集中し、本当に良い場所は埋もれていきます。',
            ]}
            pageNumber={4}
          />
        </Page>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 5. Problem 2: 駐在員の知見が流れる                          */}
        {/* ────────────────────────────────────────────────────────── */}
        <Page>
          <SlideHeadline
            kicker="課題 ②"
            title="駐在員の知見が、SNS に流れて消えていく。"
            body={[
              '海外に住む日本人は、現地にしかない知識を毎日蓄積しています。でも Instagram のストーリーは 24 時間で消え、ブログは技術的負担が大きく、YouTube は収益の不確実性が高い。',
              '結果、価値ある情報が「個人の善意」だけに支えられて流れていく。発信者には対価が回らず、読み手は信頼できる情報源にたどり着けない。',
            ]}
            pageNumber={5}
          />
        </Page>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 6. Section 02: 解決策                                       */}
        {/* ────────────────────────────────────────────────────────── */}
        <Page>
          <SlideSection
            chapter={2}
            title="Locore の解決策"
            oneLiner="駐在員価値最大化プラットフォーム = 1 つのコア × 3 つのサービス。"
            pageNumber={6}
          />
        </Page>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 7. コアコンピタンス: 駐在員価値最大化                       */}
        {/* ────────────────────────────────────────────────────────── */}
        <Page>
          <SlideHeadline
            kicker="Core Competence"
            title="駐在員の「時間・人脈・知見」を価値に。"
            body={[
              '在外邦人は、現地での時間・現地語・現地人脈・本業スキル・失敗の蓄積という 5 つの希少資産を持っています。これらを発信と収益に変えるための専用プラットフォームを作ります。',
              'Locore は単一サービスではなく、3 つのプロダクト (トラベル / サービス / コミュニティ) で同じ駐在員の活動を多面的に発信・収益化する設計です。1 人の駐在員が記事を書き、サービスを出品し、同胞のコミュニティに関わる ─ すべてが 1 つのプロフィールに統合されます。',
            ]}
            pageNumber={7}
          />
        </Page>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 7-b. 3 サービスの体系                                        */}
        {/* ────────────────────────────────────────────────────────── */}
        <Page>
          <SlideBulletList
            kicker="3 Services"
            title="1 つのコアに、3 つのサービス。"
            items={[
              {
                title: 'ロコア トラベル — 旅行者へ届ける記事',
                description:
                  '駐在員が書く旅程プラン・スポット紹介・写真ジャーナル。観光地の表層ではなく、住んでいる人の輪郭で都市を見せる。記事は駐在員自身のポートフォリオも兼ね、サービス出品への信頼の入口になる。',
              },
              {
                title: 'ロコア サービス — 駐在員のスキルを売る',
                description:
                  '買付代行・現地案内・撮影・通訳・コンサル・アクセスコーディネートなど、駐在員が提供する有償サービスの取引マーケット。Stripe Connect ベースのエスクローで安全に決済 + 取引手数料 10–15% が Locore の収益。',
              },
              {
                title: 'ロコア コミュニティ — 同胞の相互扶助',
                description:
                  '求人・住居・売買・集まり・習い事・助け合いの 6 カテゴリで在外邦人同士をつなぐ。既存掲示板を超える「本人確認 + レビュー + 安全なメッセージング」付き。流動性エンジンとして他 2 サービスへの導線にもなる。',
              },
            ]}
            pageNumber={9}
          />
        </Page>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 8. ローカルスコアの説明                                     */}
        {/* ────────────────────────────────────────────────────────── */}
        <Page>
          <SlideHeadline
            kicker="ロコア トラベル の核"
            title="ローカルスコアで、選別する。"
            body={[
              'ロコア トラベル のすべての記事は「どれだけローカルか」のスコアで評価されます。Google マップでレビュー数が多い観光地は低評価 (ブロンズ)、住人だけが知る場所や時間帯は高評価 (ゴールド) でバッジ表示。',
              '観光地の「裏技」(混まない時間帯、地元の楽しみ方) は許容しますが、単なる紹介は修正対象。理念に共感した書き手だけが残る仕組みです。記事 = 駐在員のポートフォリオ = サービス出品への信頼の土台、という連鎖がここから始まります。',
            ]}
            pageNumber={9}
          />
        </Page>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 9. Compare: 既存 vs Locore                                 */}
        {/* ────────────────────────────────────────────────────────── */}
        <Page>
          <SlideCompare
            kicker="既存サービスとの違い"
            title="3 領域を 1 つのプロフィールに統合"
            left={{
              label: '既存の在外邦人サービス',
              title: '分断されたまま、対価が回らない',
              bullets: [
                '旅行記事 = 匿名ブログ / SNS、収益化が不確実',
                'サービス = 無料掲示板で雑に成約、信頼レイヤー無し',
                'コミュニティ = パリ掲示板等、決済 / 本人確認なし',
                '駐在員の活動が 3 つの別世界に散らばっている',
              ],
            }}
            right={{
              label: 'Locore',
              title: '駐在員プロフィール 1 つで 3 領域に発信',
              bullets: [
                '本人確認 + 在住年数バッジ + ローカルスコア',
                'エスクロー付き取引 (Stripe Connect、手数料 10–15%)',
                '記事の閲覧 → サービス予約 → 信頼の循環',
                'Founders 50 + 創業期手数料 0% で初期参加者を厚く',
              ],
            }}
            pageNumber={10}
          />
        </Page>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 10. 3 つの読者層                                            */}
        {/* ────────────────────────────────────────────────────────── */}
        <Page>
          <SlideBulletList
            kicker="Market"
            title="3 つの読者層に届ける。"
            items={[
              {
                title: '観光地を避けたい旅行者',
                description:
                  '混雑する有名観光地ではなく、ローカルが普通に通う場所を求める層。年に 1〜2 回の海外旅行で、調査に時間をかけたくない人。',
              },
              {
                title: '海外を志向する若手',
                description:
                  '留学・駐在・ワーホリを検討中の人。SNS では聞きづらい本音の話を、近い境遇の書き手から直接聞きたい層。',
              },
              {
                title: '現地在住の駐在員・留学生',
                description:
                  '日々の発信を価値化したい人。技術的負担なく書け、執筆と提供サービスの両方で収益機会を得たい層。',
              },
            ]}
            pageNumber={11}
          />
        </Page>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 11. Section 03: ビジネスモデル                              */}
        {/* ────────────────────────────────────────────────────────── */}
        <Page>
          <SlideSection
            chapter={3}
            title="ビジネスモデル"
            oneLiner="3 サービスから手数料を取る。広告に依存しない。"
            pageNumber={12}
          />
        </Page>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 13. 3 サービス別 収益源                                     */}
        {/* ────────────────────────────────────────────────────────── */}
        <Page>
          <SlideBulletList
            kicker="3 つの収益源 = 3 サービスから"
            title="広告は載せない。"
            items={[
              {
                title: 'ロコア トラベル — 記事決済手数料',
                description:
                  '1 本 ¥600〜¥1,500 の有料記事。決済手数料 25% を運営費・編集人件費・サーバー費に充当。70% は執筆者へ、Founders は最終的に 90% に優遇。',
              },
              {
                title: 'ロコア サービス — 取引手数料 10–15%',
                description:
                  '駐在員が出品する有償サービス (買付・案内・撮影・通訳・アクセス) の取引額に対し 10–15% の手数料。エスクローと紛争処理を運営が担うことで対価を取る。Founders は創業期 50 取引まで 0%。',
              },
              {
                title: 'ロコア コミュニティ — サブスク + 月額枠',
                description:
                  '月額会員向けの限定記事・先行公開、駐在員サービスの優先表示枠、コミュニティ投稿のハイライト枠。コア利用者からの安定収益と、流動性エンジンとしての他 2 サービス送客の役割。',
              },
            ]}
            pageNumber={13}
          />
        </Page>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 13. Section 04: Founders 50                                 */}
        {/* ────────────────────────────────────────────────────────── */}
        <Page>
          <SlideSection
            chapter={4}
            title="Founders 50"
            oneLiner="最初の 50 人を、長く覚えていたい。"
            pageNumber={14}
          />
        </Page>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 14. Stat: 50                                                */}
        {/* ────────────────────────────────────────────────────────── */}
        <Page>
          <SlideStat
            kicker="Founders"
            value="50"
            unit="人"
            label="先着 50 人、限定で。"
            caption="認証バッジ、優遇手数料、方針への発言権。すべて帰任後も続く恒久的な特典です。"
            pageNumber={15}
          />
        </Page>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 15. Founders 特典                                           */}
        {/* ────────────────────────────────────────────────────────── */}
        <Page>
          <SlideBulletList
            kicker="参加するとどうなるか"
            title="3 つの恒久的特典。"
            items={[
              {
                title: '認証バッジ',
                description:
                  '名前の横に「Founders」表示。読み手から見て最初に信頼される目印。プロフィールにも常時表示。',
              },
              {
                title: '優遇手数料',
                description:
                  'ライターの取り分が通常 75% のところ、Founders は最終的に 90% に。条件は帰任後も継続。',
              },
              {
                title: 'サービス方針への発言権',
                description:
                  '機能追加・コミュニティルール・新都市展開などに、Founders の意見が反映される仕組み。',
              },
            ]}
            pageNumber={16}
          />
        </Page>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 16. 参加条件 + 初期買取                                     */}
        {/* ────────────────────────────────────────────────────────── */}
        <Page>
          <SlideHeadline
            kicker="参加条件"
            title="在住 1 年以上、月 5 本、理念への共感。"
            body={[
              '対象都市に 1 年以上居住している方。月 5 本以上の執筆コミットメントをお願いしています。記事の質はローカルスコアと編集チームの審査を通過する必要があります。',
              '初期 (ローンチ前) は 1 本 2,000 円で買い取り、ローンチ後は売上連動に移行します。観光地の「裏技」は OK ですが、単純な紹介記事は修正対象です。',
            ]}
            pageNumber={17}
          />
        </Page>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 17. 応募の流れ                                              */}
        {/* ────────────────────────────────────────────────────────── */}
        <Page>
          <SlideBulletList
            kicker="Application"
            title="応募の流れ"
            items={[
              {
                title: '応募フォームの提出',
                description:
                  '自己紹介、希望都市・テーマ、過去の記事サンプル、SNS リンク、居住証明（公共料金請求書や賃貸契約書）を提出。',
              },
              {
                title: '書類選考',
                description:
                  '理念への共感、現地知見、執筆の継続力を判断。3〜5 営業日でご連絡します。',
              },
              {
                title: 'Zoom 面談（15〜30 分）',
                description:
                  '編集チームと簡単な対話。書きたいテーマ、Locore に期待することを伺います。',
              },
              {
                title: '結果通知 → 執筆開始',
                description:
                  '採用された方には Founders オンボーディング（執筆ガイドラインと初期サポート）を案内。',
              },
            ]}
            pageNumber={18}
          />
        </Page>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 18. ロードマップ + 運営チーム                               */}
        {/* ────────────────────────────────────────────────────────── */}
        <Page>
          <SlideHeadline
            kicker="Roadmap & Team"
            title="2026 年 9 月公開、フランスから。"
            body={[
              '公開目標は 2026 年 9 月 30 日。Founders 募集は 50 名に到達次第締切。初期展開はフランス（パリ・ボルドー等）、その後ヨーロッパ各都市、将来的に日本展開も視野に。',
              '運営チームは現在、創業者（チェコ在住・フランス留学経験・コンサル業）とエンジニアの 2 名で進行中。各拠点に編集・運営ヘッドを順次採用予定です。',
            ]}
            pageNumber={19}
          />
        </Page>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 19. CTA                                                     */}
        {/* ────────────────────────────────────────────────────────── */}
        <Page>
          <SlideCTA
            kicker="Apply"
            title="あなたの街を、書きませんか。"
            ctaText="応募する"
            ctaUrl="locore.app/founders"
            hint="先着 50 人で締切。応募 → 書類選考 → Zoom 面談 → 結果通知。ご質問は hello@locore.app まで。"
            pageNumber={20}
          />
        </Page>
      </div>

      {/* 印刷時の挙動を制御する CSS */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }
        @media print {
          .deck-toolbar,
          .deck-instructions {
            display: none !important;
          }
          /* 親レイアウトの SiteHeader / BottomNav / Footer / Sonner も非表示 */
          body > div > header,
          body > div > nav,
          body > div > footer,
          .app-main-pad > header,
          .app-main-pad ~ nav,
          .app-main-pad ~ footer,
          [data-sonner-toaster],
          [aria-label="Notifications"] {
            display: none !important;
          }
          .app-main-pad {
            padding: 0 !important;
            min-height: 0 !important;
          }
          .deck-print-root {
            background: white !important;
          }
          .deck-page {
            width: 210mm;
            height: 297mm;
            page-break-after: always;
            break-after: page;
            margin: 0;
            padding: 0;
            box-shadow: none !important;
          }
          .deck-page > * {
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="deck-page w-full max-w-[820px] shadow-sm">{children}</div>
  );
}
