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
 * 構成 (19 ページ):
 *   1. Cover
 *   2. Mission Quote
 *   3-5. Section 01 + Problem ×2
 *   6-9. Section 02 + Solution / LocalScore / Compare
 *   10. 3 Reader segments
 *   11-12. Section 03 + Revenue model
 *   13-16. Section 04 + Founders 50 design
 *   17-18. Application flow / Roadmap
 *   19. CTA
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
              A4 縦 / 19 ページ。下のボタンか{' '}
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
            title="現地民が語る、もう一段深い旅。"
            subtitle="駐在員が書く、信頼できる旅行誌。Locore は最初の書き手 50 人を募集します。"
            pageNumber={1}
          />
        </Page>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 2. Mission Quote                                            */}
        {/* ────────────────────────────────────────────────────────── */}
        <Page>
          <SlideQuote
            quote="ローカル × 語り部 × コア。その街の輪郭を、住人の言葉で。"
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
            oneLiner="一次情報・モデルコース・ローカルスコアの 3 つで、画一化を超える。"
            pageNumber={6}
          />
        </Page>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 7. 3 つの設計原則                                           */}
        {/* ────────────────────────────────────────────────────────── */}
        <Page>
          <SlideBulletList
            kicker="3 つの設計原則"
            title="Locore は、これだけはやらない。"
            items={[
              {
                title: '一次情報・自撮しか載せない',
                description:
                  '投稿者本人が現地で撮った写真、現地で体験した内容のみ。AI 生成画像と、検索で出てくる一般情報は掲載対象外。',
              },
              {
                title: 'スポット単発ではなくモデルコース',
                description:
                  '時間帯・混雑・移動難易度まで含めた「実際に辿れるルート」を提示。旅行者の調査負担と不安を減らす。',
              },
              {
                title: 'ローカルスコアで選別',
                description:
                  '記事はローカル度を採点。観光地の単純紹介は低評価・修正対象。住人だけが知る場所が上位に来るよう設計。',
              },
            ]}
            pageNumber={7}
          />
        </Page>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 8. ローカルスコアの説明                                     */}
        {/* ────────────────────────────────────────────────────────── */}
        <Page>
          <SlideHeadline
            kicker="ローカルスコア"
            title="ローカル性が高いほど、上位に。"
            body={[
              'すべての記事は「どれだけローカルか」のスコアで評価されます。Google マップでレビュー数が多い観光地は低評価、住人だけが知る場所や時間帯は高評価。',
              '観光地の「裏技」(混まない時間帯、地元の楽しみ方) は許容しますが、単なる紹介は修正対象。理念に共感した書き手だけが残る仕組みです。',
            ]}
            pageNumber={8}
          />
        </Page>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 9. Compare: 既存 vs Locore                                 */}
        {/* ────────────────────────────────────────────────────────── */}
        <Page>
          <SlideCompare
            kicker="何が違うのか"
            title="既存メディアとの違い"
            left={{
              label: '既存の旅行メディア',
              title: '広告依存・匿名・一律',
              bullets: [
                '匿名アカウント中心で誰が書いたか不明',
                'PR と本物が区別できない',
                '"映え" 優先で実用性が薄い',
                '広告がコンテンツに混入',
              ],
            }}
            right={{
              label: 'Locore',
              title: '居住確認済みの書き手だけ',
              bullets: [
                '対象都市に 1 年以上住む書き手のみ',
                '編集チームが事実確認',
                '広告なし。読者課金で運営',
                '一次情報・自撮・モデルコース重視',
              ],
            }}
            pageNumber={9}
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
            pageNumber={10}
          />
        </Page>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 11. Section 03: ビジネスモデル                              */}
        {/* ────────────────────────────────────────────────────────── */}
        <Page>
          <SlideSection
            chapter={3}
            title="ビジネスモデル"
            oneLiner="広告に依存せず、読者と書き手の信頼で成り立つ仕組み。"
            pageNumber={11}
          />
        </Page>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 12. 収益源                                                  */}
        {/* ────────────────────────────────────────────────────────── */}
        <Page>
          <SlideBulletList
            kicker="3 つの収益源"
            title="広告は載せない。"
            items={[
              {
                title: '記事の決済手数料',
                description:
                  '1 本 ¥600〜¥1,500 の有料記事。決済手数料の一部を運営費・編集チームの人件費に充当。',
              },
              {
                title: 'サブスクリプション',
                description:
                  '月額会員向けの限定記事・先行公開・特集アクセス。コア読者からの安定収益を作る。',
              },
              {
                title: 'ユーザー提供サービス（無手数料）',
                description:
                  '駐在員が個別に提供する相談・ガイド・撮影アテンドなど。プラットフォーム手数料は取らず、書き手のビジネス機会を最大化。',
              },
            ]}
            pageNumber={12}
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
            pageNumber={13}
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
            pageNumber={14}
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
            pageNumber={15}
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
            pageNumber={16}
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
            pageNumber={17}
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
            pageNumber={18}
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
            pageNumber={19}
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
