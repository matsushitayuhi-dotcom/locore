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
 * /founders/deck/print — PDF 出力専用デッキ。
 *
 * 使い方:
 *   1. このページを開く
 *   2. ブラウザの「印刷」(Ctrl+P / Cmd+P) を実行
 *   3. プリンタ欄で「PDF として保存」を選択
 *   4. 用紙: A4、余白: なし、背景のグラフィック印刷: ON
 *   5. 保存 → ピッチデック PDF が完成
 *
 * 各スライドは A4 1 ページに 1 枚ぴったり収まるよう設計してある。
 *
 * 表示時:
 *   - 画面表示では各スライドが縦に並んでスクロールできる
 *   - 印刷時は各スライドの直後で改ページされる (page-break-after: always)
 *   - 操作ボタン類は @media print で非表示
 */

export const metadata = {
  title: 'Founders Deck — Print',
};

export default function DeckPrintPage() {
  return (
    <div className="deck-print-root bg-neutral-100 print:bg-white">
      {/* 印刷時には消えるツールバー */}
      <header className="deck-toolbar sticky top-0 z-30 border-b border-border bg-card/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
              Founders Deck · Print
            </p>
            <p className="mt-0.5 text-[12px] text-foreground/65">
              A4 縦 / 1 ページ 1 スライド。下のボタンか{' '}
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                Ctrl/Cmd + P
              </kbd>{' '}
              で PDF として保存できます。
            </p>
          </div>
          <PrintButton />
        </div>
      </header>

      {/* 印刷時の指示書き（画面用） */}
      <section className="deck-instructions mx-auto max-w-screen-md px-4 py-6 text-[12px] text-foreground/65 sm:px-6">
        <details className="rounded-md bg-card p-4 ring-1 ring-border">
          <summary className="cursor-pointer font-semibold text-foreground">
            きれいな PDF を出すコツ（4 つ）
          </summary>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5">
            <li>用紙サイズ: <strong>A4 (210×297mm)</strong></li>
            <li>余白: <strong>なし</strong>（または最小）</li>
            <li>
              <strong>背景のグラフィックを印刷</strong> を ON（terra-cotta
              背景や cream 背景がベタ塗りで出る）
            </li>
            <li>
              ヘッダー / フッター（URL や日付の自動挿入）を{' '}
              <strong>OFF</strong>（プリンタ設定の "オプション" 内）
            </li>
          </ol>
          <p className="mt-3 text-foreground/55">
            ※ Chrome 系ブラウザを推奨。Safari でも出ますが微妙にズレることが
            あります。
          </p>
        </details>
      </section>

      {/* スライド本体 — 印刷時はこのリストだけが残る */}
      <div className="deck-pages mx-auto flex max-w-[1080px] flex-col items-center gap-6 px-4 pb-20 print:max-w-none print:gap-0 print:p-0">
        <Page>
          <SlideCover
            kicker="Founders 50"
            title="その街は、誰が書くか。"
            subtitle="現地に住む人だけが書ける小さな旅行誌、Locore。最初の 50 人を募集します。"
            pageNumber={1}
          />
        </Page>

        <Page>
          <SlideQuote
            quote="旅は、誰の言葉で読むかで変わる。"
            attribution="Locore 編集部"
            pageNumber={2}
          />
        </Page>

        <Page>
          <SlideSection
            chapter={1}
            title="なぜ、現地民が書くのか"
            oneLiner="ガイドブックには載らない、住人だけが知っている場所の話。"
            pageNumber={3}
          />
        </Page>

        <Page>
          <SlideHeadline
            kicker="Why now"
            title="観光地は誰が紹介してもほぼ同じ顔。"
            body={[
              '検索で 5 分で出てくる情報を、わざわざお金を払って読む人はいない。',
              '半年・1 年・10 年住んでいる人だけが「この季節にここに通う」と言える店の話を、Locore はストックしていきます。',
            ]}
            pageNumber={4}
          />
        </Page>

        <Page>
          <SlideCompare
            kicker="What's different"
            title="他とどう違うのか"
            left={{
              label: '一般的なメディア',
              title: '誰でも書ける口コミ',
              bullets: [
                '匿名アカウント中心',
                'PR と本物が区別できない',
                '"映え" 優先で実用性が薄い',
              ],
            }}
            right={{
              label: 'Locore',
              title: '居住確認済みの書き手だけ',
              bullets: [
                '対象都市に 1 年以上住む書き手のみ',
                '編集チームが事実確認',
                '読み返せる短尺の有料記事',
              ],
            }}
            pageNumber={5}
          />
        </Page>

        <Page>
          <SlideSection
            chapter={2}
            title="Founders 50 という設計"
            oneLiner="最初の 50 人を、長く覚えていたい。"
            pageNumber={6}
          />
        </Page>

        <Page>
          <SlideStat
            kicker="Founders"
            value="50"
            unit="人"
            label="最初の 50 人だけ、特別に。"
            caption="認証バッジ、手数料優遇、サービス方針への発言権。先着 50 人限定です。"
            pageNumber={7}
          />
        </Page>

        <Page>
          <SlideBulletList
            kicker="Founders 特典"
            title="参加するとどうなるか"
            items={[
              {
                title: '認証バッジ',
                description:
                  '名前の横に「Founders」表示。読み手から見て最初に信頼される目印に。',
              },
              {
                title: '手数料優遇',
                description:
                  'ライターの取り分が通常 75% のところ、Founders は 90% に。',
              },
              {
                title: '発言権',
                description:
                  '機能の追加・コミュニティルール・新都市展開などに意見が反映される。',
              },
            ]}
            pageNumber={8}
          />
        </Page>

        <Page>
          <SlideQuote
            quote="現地民しか書けない記事を、読み返せる形でストックする。"
            attribution="Founders 募集 2026"
            invert
            pageNumber={9}
          />
        </Page>

        <Page>
          <SlideCTA
            title="あなたの街を、書きませんか。"
            ctaText="応募する"
            ctaUrl="locore.app/founders"
            hint="先着 50 人で締切。居住確認の書類提出と、Locore 編集チームとの 30 分面談があります。"
            pageNumber={10}
          />
        </Page>
      </div>

      {/* 印刷時の挙動を制御する CSS */}
      <style>{`
        /* A4 縦、余白ゼロで 1 スライド = 1 ページ */
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
          /* 背景色を強制印刷 */
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
