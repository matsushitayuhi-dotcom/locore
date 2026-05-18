import Link from 'next/link';
import { Printer } from 'lucide-react';
import { DECK } from '@/lib/deck/tokens';
import { SlideCover } from '@/components/deck/slides/Cover';
import { SlideSection } from '@/components/deck/slides/Section';
import { SlideHeadline } from '@/components/deck/slides/Headline';
import { SlideStat } from '@/components/deck/slides/Stat';
import { SlideQuote } from '@/components/deck/slides/Quote';
import { SlideBulletList } from '@/components/deck/slides/BulletList';
import { SlideCompare } from '@/components/deck/slides/Compare';
import { SlideCTA } from '@/components/deck/slides/CTA';

/**
 * Founders Deck — ブランドキット + 8 種類のスライドマスター サンプル。
 *
 * 表示構成:
 *   1. ブランドキット（カラーパレット / タイポグラフィ / スペーシング）
 *   2. スライドマスター 8 種を 9:16 縦長カードで並べる
 *
 * モバイルでは 1 カラム、デスクトップでは 2-3 カラムグリッド。
 */

export const metadata = {
  title: 'Founders Deck Preview',
  description:
    'Locore Founders 募集スライドのブランドキットと、再利用可能な 8 種類のスライドマスター。',
};

export default function DeckPreviewPage() {
  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-10 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
              Founders Deck · Preview
            </p>
            <h1
              className="mt-2 text-[28px] font-semibold tracking-tight sm:text-[36px]"
              style={{
                fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
              }}
            >
              ブランドキット + スライドマスター
            </h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-foreground/65 sm:text-[14px]">
              A4 縦（210×297mm）で組んだ Founders 50 募集用のスライド見本。
              そのまま PDF として書き出して配布できます。8 種類のレイアウトを混ぜて
              編集します。
            </p>
          </div>
          <Link
            href="/founders/deck/print"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-500 px-4 py-2 text-[12px] font-bold text-neutral-950 hover:bg-primary-300"
          >
            <Printer className="h-3.5 w-3.5" />
            PDF 出力ページへ
          </Link>
        </header>

        {/* ============================================================ */}
        {/* 1. ブランドキット                                              */}
        {/* ============================================================ */}
        <section className="mb-16">
          <SectionTitle kicker="01 / Brand Kit" title="カラーパレット" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Swatch label="Cream" hex={DECK.color.cream} />
            <Swatch label="Cream Deep" hex={DECK.color.creamDeep} />
            <Swatch label="Sand" hex={DECK.color.sand} />
            <Swatch label="Terracotta" hex={DECK.color.terracotta} dark />
            <Swatch label="Terracotta Soft" hex={DECK.color.terracottaSoft} dark />
            <Swatch label="Amber" hex={DECK.color.amber} />
            <Swatch label="Coffee" hex={DECK.color.coffee} dark />
            <Swatch label="Ink" hex={DECK.color.ink} dark />
          </div>

          <SectionTitle kicker="" title="タイポグラフィ" className="mt-12" />
          <div className="grid gap-4 sm:grid-cols-2">
            <TypeSample
              label="Display 88 — Serif"
              fontFamily={DECK.font.serif}
              fontSize="56px"
              text="その街で書く"
            />
            <TypeSample
              label="H1 64 — Serif"
              fontFamily={DECK.font.serif}
              fontSize="40px"
              text="現地民の輪郭"
            />
            <TypeSample
              label="H2 48 — Serif"
              fontFamily={DECK.font.serif}
              fontSize="30px"
              text="ガイドブックに載らない場所"
            />
            <TypeSample
              label="Body 22 — Sans"
              fontFamily={DECK.font.sans}
              fontSize="15px"
              text="現地に住む書き手が、観光地ではなく自分が通う場所のことを記事にする。"
            />
            <TypeSample
              label="Kicker 14 — Sans Caps"
              fontFamily={DECK.font.sans}
              fontSize="11px"
              letterSpacing={DECK.tracking.kicker}
              uppercase
              text="Founders 50"
            />
            <TypeSample
              label="Mono — Numeric"
              fontFamily={DECK.font.mono}
              fontSize="18px"
              text="locore.app/founders"
            />
          </div>

          <SectionTitle kicker="" title="スペーシング" className="mt-12" />
          <div className="rounded-xl bg-card p-4 ring-1 ring-border sm:p-6">
            <ul className="grid gap-2 text-[12px] text-foreground/70 sm:grid-cols-4">
              <li><strong>pad</strong> : 80px</li>
              <li><strong>section</strong> : 56px</li>
              <li><strong>gap</strong> : 24px</li>
              <li><strong>inline</strong> : 12px</li>
            </ul>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 2. スライドマスター 8 種                                       */}
        {/* ============================================================ */}
        <section>
          <SectionTitle
            kicker="02 / Slide Masters"
            title="8 種類のレイアウト"
            note="各カードは 9:16（モバイル縦）固定。テキストはそのまま編集できます。"
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <DeckSlide name="Cover — 表紙">
              <SlideCover
                kicker="Founders 50"
                title="その街は、誰が書くか。"
                subtitle="現地に住む人だけが書ける小さな旅行誌、Locore。最初の 50 人を募集します。"
                pageNumber={1}
              />
            </DeckSlide>

            <DeckSlide name="Section — 章扉">
              <SlideSection
                chapter={2}
                title="なぜ、現地民が書くのか"
                oneLiner="ガイドブックには載らない、住人だけが知っている場所の話。"
                pageNumber={5}
              />
            </DeckSlide>

            <DeckSlide name="Headline — 標準コンテンツ">
              <SlideHeadline
                kicker="Why Locore"
                title="観光地は誰が紹介してもほぼ同じ顔。"
                body={[
                  '検索で 5 分で出てくる情報を、わざわざお金を払って読む人はいない。',
                  '半年・1 年・10 年住んでいる人だけが「この季節にここに通う」と言える店の話を、Locore は集めています。',
                ]}
                pageNumber={6}
              />
            </DeckSlide>

            <DeckSlide name="Stat — 大きな数字">
              <SlideStat
                kicker="Founders"
                value="50"
                unit="人"
                label="最初の Founders だけ、特別に。"
                caption="認証バッジ、手数料優遇、サービス方針への発言権。先着 50 人限定です。"
                pageNumber={9}
              />
            </DeckSlide>

            <DeckSlide name="Quote — 引用">
              <SlideQuote
                quote="旅は、誰の言葉で読むかで変わる。"
                attribution="Locore 編集部"
                pageNumber={3}
              />
            </DeckSlide>

            <DeckSlide name="Quote (Ink) — 反転引用">
              <SlideQuote
                quote="現地民しか書けない記事を、読み返せる形でストックする。"
                attribution="Founders 募集 2026"
                invert
                pageNumber={4}
              />
            </DeckSlide>

            <DeckSlide name="BulletList — リスト">
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
                pageNumber={10}
              />
            </DeckSlide>

            <DeckSlide name="Compare — 比較">
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
                  title: '本人確認済みの書き手だけ',
                  bullets: [
                    '対象都市に 1 年以上住む書き手のみ',
                    '編集チームが事実確認',
                    '読み返せる短尺の記事',
                  ],
                }}
                pageNumber={11}
              />
            </DeckSlide>

            <DeckSlide name="CTA — 応募">
              <SlideCTA
                title="あなたの街を、書きませんか。"
                ctaText="応募する"
                ctaUrl="locore.app/founders"
                hint="先着 50 人で締切。本人確認の書類提出と、Locore 編集チームとの 30 分面談があります。"
                pageNumber={20}
              />
            </DeckSlide>
          </div>
        </section>

        <footer className="mt-16 border-t border-border pt-6 text-[11px] text-foreground/45">
          <p>
            このプレビューは <code className="rounded bg-muted px-1.5 py-0.5">/founders/deck/preview</code>
            から見れます。各スライドのソースは
            <code className="rounded bg-muted px-1.5 py-0.5">apps/web/components/deck/slides/</code>
            にあり、コピーをすぐに編集できます。
          </p>
        </footer>
      </div>
    </main>
  );
}

// ============================================================================
// プレビュー用の小さなプレゼンテーション部品
// ============================================================================

function SectionTitle({
  kicker,
  title,
  note,
  className = '',
}: {
  kicker?: string;
  title: string;
  note?: string;
  className?: string;
}) {
  return (
    <div className={`mb-5 ${className}`}>
      {kicker ? (
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
          {kicker}
        </p>
      ) : null}
      <h2
        className="mt-1 text-[20px] font-semibold tracking-tight sm:text-[24px]"
        style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
      >
        {title}
      </h2>
      {note ? (
        <p className="mt-1 text-[12px] text-foreground/55">{note}</p>
      ) : null}
    </div>
  );
}

function Swatch({
  label,
  hex,
  dark,
}: {
  label: string;
  hex: string;
  dark?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-border">
      <div
        className="aspect-[5/3] w-full"
        style={{ backgroundColor: hex }}
        aria-hidden
      />
      <div className="bg-card px-3 py-2">
        <p className="text-[12px] font-semibold">{label}</p>
        <p
          className="text-[10px] tabular text-foreground/55"
          style={{ fontFamily: DECK.font.mono }}
        >
          {hex.toUpperCase()}
        </p>
      </div>
    </div>
  );
}

function TypeSample({
  label,
  fontFamily,
  fontSize,
  text,
  letterSpacing,
  uppercase,
}: {
  label: string;
  fontFamily: string;
  fontSize: string;
  text: string;
  letterSpacing?: string;
  uppercase?: boolean;
}) {
  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-border sm:p-5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">
        {label}
      </p>
      <p
        className="mt-3"
        style={{
          fontFamily,
          fontSize,
          letterSpacing: letterSpacing ?? '-0.005em',
          textTransform: uppercase ? 'uppercase' : 'none',
          lineHeight: 1.4,
          color: DECK.color.ink,
        }}
      >
        {text}
      </p>
    </div>
  );
}

function DeckSlide({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-2xl shadow-sm">
        {/* SlideFrame 自体が aspect-ratio を持つので、外側は幅だけ与える */}
        {children}
      </div>
      <figcaption className="px-1 text-[12px] font-semibold text-foreground/65">
        {name}
      </figcaption>
    </figure>
  );
}
