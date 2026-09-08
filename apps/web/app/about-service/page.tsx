import Link from 'next/link';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Info,
  Mic,
  PhoneOff,
  Play,
  Search,
  Send,
  ShieldCheck,
  Video,
} from 'lucide-react';
import { AboutHowTabs } from './AboutHowTabs';

/**
 * `/about-service` — 「ご利用方法」ページ（v7・GrowthMentor 構成）。
 * mockups/v2/about-service-v7.html を忠実に実装:
 *   hero（写真帯 + プレイヤーカード + アバタースタック）/ 使い方（左ヘアライン
 *   タイムライン + マイルストンピル・2タブ・時系列5ステップ×2 + UI 画面モック）/
 *   よくある相談 / 在籍確認ダーク帯 / 料金（コピー修正済み）/ 30分でここまで /
 *   FAQ / 最終CTA（写真帯）。
 * 写真（/about/*.jpg・/experts/*.jpg）はデモ用プレースホルダ（Pexels 商用可素材。
 * 特定の実在人物・エキスパートではない）。白カードには text-foreground を明示して
 * ヒーローの白文字継承（保護色化）を遮断する。ゴシック統一（明朝・イタリックなし）。
 */

export const metadata = {
  title: '使い方',
  description:
    '留学のことは、通っている先輩と。学部・大学院・MBA・語学・交換留学の「あなたの場合はどうか」を、在籍確認済みの在学生・アルムナイに30分からオンラインで相談できます。ご利用方法・在籍確認・料金の説明ページです。',
};

/* ===== 小物 ===== */

function Kicker({ dark = false, children }: { dark?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={
        'inline-flex items-center gap-2 rounded-full border px-4 py-[5px] text-[12.5px] font-bold ' +
        (dark
          ? 'border-primary-500/45 bg-transparent text-primary-500'
          : 'border-primary-300 bg-primary-100 text-primary-900')
      }
    >
      <i
        className={
          'h-[7px] w-[7px] rounded-full not-italic ' +
          (dark ? 'bg-primary-500' : 'bg-primary-700')
        }
        aria-hidden
      />
      {children}
    </span>
  );
}

function SectionH({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-[18px] text-[clamp(25px,3.6vw,38px)] font-black leading-[1.4] tracking-[-0.028em]">
      {children}
    </h2>
  );
}

/** 強調: ゴシックのままウェイト + ライム色（明朝・イタリック不使用） */
function Em({ children }: { children: React.ReactNode }) {
  // 320px の見出しは 1 行 10 文字ほど。強調は語の途中で折り返さず 1 かたまりで送る。
  // PC は元の改行位置を保つため max-sm 限定（sm 以上の見た目は変えない）
  return (
    <span className="font-black text-primary-700 max-sm:whitespace-nowrap">{children}</span>
  );
}

function VBadge({ label = '在籍確認済み' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-[5px] whitespace-nowrap rounded-full border border-primary-300 bg-primary-100 px-2.5 py-[3px] text-[11px] font-bold text-primary-900">
      <ShieldCheck className="h-[11px] w-[11px] shrink-0" aria-hidden />
      {label}
    </span>
  );
}

/** 実写アバター（デモ用プレースホルダ）。/experts/<name>.jpg を丸クロップ */
function PhotoAva({ src, size }: { src: string; size: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={`${size} shrink-0 rounded-full bg-muted object-cover`} />
  );
}

/** 検索ヒット風カード（①とtrustデモで共用） */
function SfHit({ shadow = true }: { shadow?: boolean }) {
  return (
    <div
      className={
        'rounded-[14px] bg-card px-4 py-3.5 text-foreground ' +
        (shadow
          ? 'border-[1.5px] border-primary-300 shadow-sm'
          : 'border border-border')
      }
    >
      <div className="flex items-center gap-[11px]">
        <PhotoAva src="/experts/aya.jpg" size="h-11 w-11" />
        {/* バッジは肩書きの行から外して名前の隣へ（320px での縦積み対策） */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="min-w-0 truncate text-[13.5px] font-extrabold">高村 里奈</span>
            <span className="shrink-0">
              <VBadge label="認証済み" />
            </span>
          </div>
          <div className="mt-px truncate text-[11.5px] text-neutral-500">
            🇺🇸 ボストン ・ HBS在学中
          </div>
        </div>
      </div>
      {/* 価格と評価で 200px 要るのに 320px では行が 200px しかない。
          入り切らないときは評価を次の行へ（ml-auto で右寄せのまま落ちる） */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-dashed border-border pt-2.5">
        <span className="shrink-0 whitespace-nowrap text-[14px] font-extrabold tabular-nums">
          ¥6,000
          {/* 9.5px は実機で読めないのでスマホだけ 11px（PC は据え置き） */}
          <small className="text-[11px] font-normal text-neutral-500 sm:text-[9.5px]"> / 30分〜</small>
        </span>
        <span className="ml-auto whitespace-nowrap text-[10.5px] font-bold text-neutral-700">
          <i className="not-italic text-primary-700">★</i> 4.9 ・ レビュー12件
        </span>
      </div>
    </div>
  );
}

/* ===== 使い方: マイルストンピル + ステップ行 ===== */

function Milestone({ n, now = false, children }: { n: number; now?: boolean; children: React.ReactNode }) {
  return (
    <div className="relative z-[2] -ml-[39px] inline-flex items-center gap-2.5 rounded-xl border border-border-strong bg-card py-1.5 pl-2 pr-[15px] text-[13px] font-extrabold text-foreground shadow-sm sm:-ml-[66px] sm:py-2 sm:pl-2.5 sm:pr-[18px] sm:text-[14px]">
      <span
        className={
          'grid h-5 w-5 shrink-0 place-items-center rounded-[7px] bg-primary-500 text-[11px] font-extrabold tabular-nums text-neutral-950 sm:h-[22px] sm:w-[22px] sm:text-[12px] ' +
          (now ? 'ring-[5px] ring-primary-100' : '')
        }
      >
        {n}
      </span>
      {children}
    </div>
  );
}

function StepRow({
  cop,
  shot,
  small = false,
}: {
  cop: React.ReactNode;
  shot: React.ReactNode;
  small?: boolean;
}) {
  return (
    // グリッドの子は既定で min-content 未満に縮まない。UI モックが要求する幅で
    // 列ごと画面外に出ていたので、両方の子に min-w-0 を置く
    <div className="mt-[26px] grid items-center gap-6 md:grid-cols-[.9fr_1.1fr] md:gap-11">
      <div className="min-w-0">{cop}</div>
      <div className={'min-w-0 ' + (small ? 'max-w-[440px]' : 'max-w-[540px] md:max-w-none')}>
        {shot}
      </div>
    </div>
  );
}

function StepH({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[22px] font-black tracking-[-0.018em]">{children}</h3>
  );
}

function StepP({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 max-w-[34em] text-[15px] leading-[2.05] text-neutral-500 [&_b]:font-bold [&_b]:text-foreground">
      {children}
    </p>
  );
}

function MiniCheck({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 text-[14px] leading-[1.9] text-neutral-500 [&_b]:font-bold [&_b]:text-foreground">
      <span className="mt-[5px] grid h-[19px] w-[19px] shrink-0 place-items-center rounded-full bg-primary-500 text-neutral-950">
        <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
      </span>
      <span>{children}</span>
    </div>
  );
}

const shotCls = 'overflow-hidden rounded-[18px] border border-border shadow-md';

/* ===== 相談者フロー（時系列 ①〜⑤） ===== */

function UserFlowPanel() {
  return (
    <>
      {/* ① 探す */}
      <div className="pb-[72px] pt-2">
        <Milestone n={1} now>
          情報収集
        </Milestone>
        <StepRow
          cop={
            <>
              <StepH>志望校の先輩を探す</StepH>
              <StepP>
                学校・専攻・相談テーマで絞り込んだり、検索したり。先輩のプロフィールや相談メニュー、レビューを見ながらコンタクトを取りたい人を決めます。表示されるエキスパートは全員、学生証や入学証明書・卒業証書で在学・卒業の実態を運営が確認しているので、安心して相談できます。
              </StepP>
            </>
          }
          shot={
            <div className={`${shotCls} about-shot-lime p-5`}>
              <div className="flex gap-2">
                <span className="flex min-w-0 flex-1 items-center gap-[9px] rounded-full border-[1.5px] border-border-strong bg-card px-4 py-[11px] text-[12.5px] text-neutral-700">
                  <Search className="h-3.5 w-3.5 shrink-0 text-neutral-500" aria-hidden />
                  {/* 320px では文字領域が 78px しかなく、丸ピルの中で 2 行になる */}
                  <b className="min-w-0 truncate font-bold text-foreground">MBA エッセイ</b>
                </span>
                <span className="inline-flex shrink-0 items-center rounded-full bg-primary-500 px-5 text-[12.5px] font-extrabold text-neutral-950">
                  探す
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-neutral-900 px-3 py-1 text-[10.5px] font-bold text-white">
                  🇺🇸 アメリカ
                </span>
                {['MBA', 'エッセイ', '¥6,000まで'].map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-border bg-card px-3 py-1 text-[10.5px] font-bold text-neutral-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-3.5">
                <SfHit />
              </div>
              <div className="mt-2.5 flex items-center gap-[11px] rounded-[14px] border border-border bg-card px-4 py-[11px] opacity-55">
                <PhotoAva src="/experts/misaki.jpg" size="h-8 w-8" />
                <span className="h-[7px] flex-1 rounded bg-muted" />
              </div>
            </div>
          }
        />
      </div>

      {/* ② チャット */}
      <div className="pb-[72px] pt-2">
        <Milestone n={2}>出願校決め</Milestone>
        <StepRow
          cop={
            <>
              <StepH>チャットで出願校を壁打ち（無料）</StepH>
              <StepP>
                直接話をする前に本人とコンタクト。出願校の候補や相談内容に適した先輩かを、事前に確認することができます。
              </StepP>
              <span className="mt-3.5 inline-flex items-center gap-1.5 rounded-full border border-primary-300 bg-primary-100 px-[15px] py-[5px] text-[12.5px] font-bold text-primary-900">
                ここまで完全無料
              </span>
            </>
          }
          shot={
            <div className={`${shotCls} about-shot-fade p-5`}>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-border pb-3">
                <PhotoAva src="/experts/aya.jpg" size="h-9 w-9" />
                {/* 320px では行が 200px しかなく、名前列が潰れて縦積みになる。
                    縮む側は min-w-0 + truncate、バッジは shrink-0 で守る。
                    ただし shrink-0 のバッジ 104px を引くと名前列が 46px しか残らず
                    「高村…」まで切れるので、min-w-[7rem] を折り返しの引き金にして
                    バッジを次の行へ落とす（402px の 128px は超えないので PC/402 は不変） */}
                <div className="min-w-0 flex-1 max-sm:min-w-[7rem]">
                  <div className="truncate text-[13px] font-extrabold">高村 里奈</div>
                  <div className="truncate text-[10px] font-bold text-primary-700">● オンライン</div>
                </div>
                <span className="ml-auto inline-flex shrink-0 items-center gap-[5px] whitespace-nowrap rounded-full border border-primary-300 bg-primary-100 px-[11px] py-[3px] text-[10px] font-extrabold text-primary-900">
                  事前チャット無料
                </span>
              </div>
              <div className="mt-3.5 flex flex-col gap-[9px] text-[12.5px] leading-[1.8]">
                <div className="max-w-[88%] self-end rounded-[14px] rounded-br-[5px] bg-neutral-900 px-[13px] py-[9px] text-white">
                  来年秋入学でMBA出願予定です。出願校を3校に絞る相談、30分でできますか？
                </div>
                {/* エキスパート側は薄ライム地 + 濃文字（保護色回避のため色を明示） */}
                <div className="max-w-[88%] self-start rounded-[14px] rounded-bl-[5px] border border-primary-100 bg-primary-50 px-[13px] py-[9px] text-foreground">
                  できますよ。ご職歴とスコアを事前に教えてもらえると、当日が濃くなります。
                </div>
              </div>
              <div className="mt-3.5 flex items-center gap-2 rounded-full border-[1.5px] border-border-strong bg-card py-[9px] pl-4 pr-[9px] text-[11.5px] text-neutral-400">
                メッセージを入力…
                <span className="ml-auto grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-primary-500">
                  <Send className="h-[13px] w-[13px] text-neutral-950" aria-hidden />
                </span>
              </div>
            </div>
          }
        />
      </div>

      {/* ③ 日程（時差の話を統合） */}
      <div className="pb-[72px] pt-2">
        <Milestone n={3}>出願書類</Milestone>
        <StepRow
          cop={
            <>
              <StepH>エッセイ・書類は、セッションで伴走</StepH>
              <StepP>
                エッセイや研究計画のレビューは、空き枠からセッションを予約するだけ。
              </StepP>
              <div className="mt-3.5 flex flex-col gap-[9px]">
                <MiniCheck>
                  空き枠も確定日時も<b>ユーザーの現地時間で表示</b>
                  。地球の裏側にいても迷いません。
                </MiniCheck>
                <MiniCheck>
                  リクエストが承諾されるとインタビューが確定。
                  <b>前日にリマインドが届きます</b>。
                </MiniCheck>
              </div>
            </>
          }
          shot={
            <div className={`${shotCls} bg-card p-[22px] max-sm:p-4`}>
              {/* 矢印 + 日付 + 「すべて日本時間」で 320px 必要なのに、402px の行は
                  296px しかなく日付が 2 行に折り返していた。入らなければ
                  バッジを次の行へ（ml-auto で右寄せのまま落ちる） */}
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-[1.5px] border-border-strong bg-card text-neutral-700">
                  <ChevronLeft className="h-[11px] w-[11px]" aria-hidden />
                </span>
                <span className="shrink-0 whitespace-nowrap text-[13px] font-extrabold tabular-nums">
                  9月14日〜9月20日
                </span>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-[1.5px] border-border-strong bg-card text-neutral-700">
                  <ChevronRight className="h-[11px] w-[11px]" aria-hidden />
                </span>
                <span className="ml-auto inline-flex shrink-0 items-center gap-[5px] whitespace-nowrap rounded-full border border-primary-300 bg-primary-100 px-3 py-[3px] text-[10.5px] font-extrabold text-primary-900">
                  <Clock className="h-[11px] w-[11px] text-primary-700" aria-hidden />
                  すべて日本時間
                </span>
              </div>
              <div className="mt-[13px] grid grid-cols-4 gap-[7px]">
                {[
                  { w: '水', d: '16', slots: ['20:00', '20:30', '21:00'], on: -1 },
                  { w: '木', d: '17', slots: null, on: -1 },
                  { w: '金', d: '18', slots: ['20:00', '20:30', '21:00'], on: 0 },
                  { w: '土', d: '19', slots: ['16:00', '16:30', '17:00'], on: -1 },
                ].map((c) => (
                  <div key={c.d} className="flex flex-col gap-1.5">
                    <div
                      className={
                        'border-b-[1.5px] border-border pb-1.5 text-center leading-[1.3] ' +
                        (c.slots ? '' : 'opacity-40')
                      }
                    >
                      <span className="block text-[10px] font-bold text-neutral-500">{c.w}</span>
                      <span className="block text-[14px] font-extrabold tabular-nums">{c.d}</span>
                    </div>
                    {c.slots ? (
                      c.slots.map((s, i) => (
                        <span
                          key={s}
                          className={
                            'rounded-[9px] border-[1.5px] py-2 text-center text-[11.5px] font-bold tabular-nums ' +
                            (i === c.on
                              ? 'border-primary-500 bg-primary-500 font-extrabold text-neutral-950'
                              : 'border-border-strong text-neutral-700')
                          }
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="py-2 text-center text-[12px] text-border-strong">—</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          }
        />
      </div>

      {/* ④ 通話（アプリ不要・Zoom/Meet を統合） */}
      <div className="pb-[72px] pt-2">
        <Milestone n={4}>合否・渡航準備</Milestone>
        <StepRow
          cop={
            <>
              <StepH>面接対策も渡航準備も、オンラインで</StepH>
              <StepP>
                ビデオ通話で、模擬面接から合格後のビザ・住まい・持ち物まで相談できます。
              </StepP>
              <div className="mt-3.5 flex flex-col gap-[9px]">
                <MiniCheck>
                  <b>特別なアプリは不要</b>
                  。確定後に届く参加リンクを、当日クリックするだけ。
                </MiniCheck>
                <MiniCheck>
                  <b>Zoom / Google Meet でもOK</b>。使い慣れたツールのままで構いません。
                </MiniCheck>
              </div>
            </>
          }
          shot={
            <CallShot
              leftTag="高村 里奈 — ボストン"
              leftTagSm="高村 里奈"
              rightInitial="あ"
              rightTag="あなた — 東京"
              rightTagSm="あなた"
              bar
            />
          }
        />
      </div>

      {/* ⑤ 相談のあと（大ダークカード） */}
      <div className="pb-6 pt-2">
        <Milestone n={5} now>
          現地生活
        </Milestone>
        {/* スマホは 34px の余白で中身が 260px まで痩せるので p-6 に。
            グリッドの子は min-w-0（中のパネルで列が押し広がるのを防ぐ） */}
        <div className="about-darkcard-bg mt-[26px] grid items-center gap-8 rounded-[22px] p-[34px] text-white shadow-lg max-sm:p-6 md:grid-cols-[1.04fr_.96fr] md:gap-12 md:p-12">
          <div className="min-w-0">
            <h3 className="text-[clamp(22px,3vw,30px)] font-black leading-[1.45] tracking-[-0.022em]">
              合格のあとも、<b className="font-black text-primary-500">継続的なメンター</b>に
            </h3>
            <p className="mt-3.5 max-w-[32em] text-[14.5px] leading-[2.05] text-white/75">
              合格して終わりではありません。住まい探し、履修の組み方、現地生活の立ち上げまで、先輩に継続的に伴走してもらえます。1回では解決できないことも一緒なら最後まで走り切れます。
            </p>
            <p className="mt-[18px] text-[10.5px] tracking-[0.08em] text-white/50">
              SESSION NOTES ・ CHAT LOG ・ REBOOK
            </p>
          </div>
          {/* 白パネルは text-foreground を明示（ダークカードの白文字継承を遮断） */}
          <div className="min-w-0 rounded-2xl bg-card px-[22px] py-5 text-foreground max-sm:px-4">
            {/* 9.5px は実機で読めない。スマホは 11px にし、伸びた分は名前を畳む */}
            <span className="text-[11px] font-semibold tracking-[0.14em] text-neutral-500 sm:text-[9.5px]">
              SESSION NOTES — 9/18<span className="max-sm:hidden"> 高村 里奈さん</span>
            </span>
            <div className="mt-[11px] flex items-start gap-2.5 text-[13px] leading-[1.8]">
              <span className="mt-0.5 shrink-0 whitespace-nowrap rounded-[7px] bg-muted px-[9px] py-0.5 text-[10px] font-extrabold text-neutral-500">
                相談前
              </span>
              <span className="text-neutral-500">エッセイのテーマが決まらず白紙のまま</span>
            </div>
            <div className="mt-[11px] flex items-start gap-2.5 text-[13px] leading-[1.8]">
              <span className="mt-0.5 shrink-0 whitespace-nowrap rounded-[7px] bg-primary-500 px-[9px] py-0.5 text-[10px] font-extrabold text-neutral-950">
                相談後
              </span>
              <span className="font-semibold text-neutral-700">
                職歴から軸が1本＋段落構成のメモ
              </span>
            </div>
            <div className="mt-[11px] flex items-start gap-2.5 text-[13px] leading-[1.8]">
              <span className="mt-0.5 shrink-0 whitespace-nowrap rounded-[7px] bg-primary-500 px-[9px] py-0.5 text-[10px] font-extrabold text-neutral-950">
                次にやる
              </span>
              <span className="font-semibold text-neutral-700">
                推薦者への依頼メール送付（今週）
              </span>
            </div>
            {/* 行の幅が 189px しかなく、114px のボタンを入れると文が 23px に潰れて
                1 文字ずつ縦積みになる。入り切らないときはボタンを次の行へ落とす。 */}
            <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-2.5 border-t border-dashed border-border-strong pt-3.5">
              <PhotoAva src="/experts/aya.jpg" size="h-8 w-8" />
              <p className="min-w-[8rem] flex-1 text-[11.5px] leading-[1.6] text-neutral-500">
                続きの相談も、同じ流れで。
              </p>
              <span className="ml-auto shrink-0 rounded-full bg-primary-500 px-[15px] py-1.5 text-[11px] font-extrabold text-neutral-950">
                もう一度相談する
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-11">
        <Link
          href="/experts"
          className="inline-flex items-center gap-[9px] rounded-full bg-primary-500 px-8 py-3.5 text-[15px] font-bold text-neutral-950 shadow-sm transition hover:bg-primary-300"
        >
          エキスパートを探す
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <div className="mt-[13px] text-[13.5px] text-neutral-500">
          会員登録は無料。チャットでの事前相談から始められます。
        </div>
      </div>
    </>
  );
}

/** ダーク通話カード（④とエキスパート⑤で共用。背景は実写を薄く敷く） */
function CallShot({
  leftTag,
  leftTagSm,
  rightInitial,
  rightTag,
  rightTagSm,
  bar = false,
}: {
  leftTag: string;
  /** スマホ用の短縮タグ（402px でもタイルが 126px しかなく、フルの文言は切れる） */
  leftTagSm: string;
  rightInitial: string;
  rightTag: string;
  rightTagSm: string;
  bar?: boolean;
}) {
  return (
    <div className={`${shotCls} about-call-bg p-[18px]`}>
      <div className="flex items-center px-0.5 pb-2.5">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.08em] text-white">
          <i className="h-2 w-2 rounded-full bg-danger-500 not-italic" aria-hidden />
          REC
        </span>
        <span className="ml-auto rounded-full bg-white/10 px-[11px] py-[3px] text-[10px] text-white/75">
          オンライン ・ 30分
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="about-tile-lime relative grid aspect-[1/0.92] place-items-center overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/experts/aya.jpg"
            alt=""
            className="aspect-square w-[56%] rounded-full bg-muted object-cover"
          />
          {/* 9.5px はスマホで読めないので 11px に。ただし 11px だと 402px でも
              タイルの 126px に収まらないので、スマホは地名を落とした短縮版を出す
              （truncate は保険） */}
          <span className="absolute bottom-2 left-2 max-w-[calc(100%-16px)] truncate rounded-lg bg-black/55 px-[9px] py-[3px] text-[11px] font-bold text-white sm:text-[9.5px]">
            <span className="max-sm:hidden">{leftTag}</span>
            <span className="sm:hidden">{leftTagSm}</span>
          </span>
        </div>
        <div className="about-tile-gray relative grid aspect-[1/0.92] place-items-center overflow-hidden rounded-xl">
          <span className="grid aspect-square w-[56%] place-items-center rounded-full bg-neutral-700 text-[clamp(20px,2.4vw,28px)] font-extrabold text-white">
            {rightInitial}
          </span>
          <span className="absolute bottom-2 left-2 max-w-[calc(100%-16px)] truncate rounded-lg bg-black/55 px-[9px] py-[3px] text-[11px] font-bold text-white sm:text-[9.5px]">
            <span className="max-sm:hidden">{rightTag}</span>
            <span className="sm:hidden">{rightTagSm}</span>
          </span>
        </div>
      </div>
      {bar ? (
        <div className="mt-3 flex items-center justify-center gap-2.5">
          <i className="grid h-8 w-8 place-items-center rounded-full bg-white/15 not-italic">
            <Mic className="h-[13px] w-[13px] text-white" aria-hidden />
          </i>
          <i className="grid h-8 w-8 place-items-center rounded-full bg-white/15 not-italic">
            <Video className="h-[13px] w-[13px] text-white" aria-hidden />
          </i>
          <i className="grid h-8 w-[42px] place-items-center rounded-full bg-danger-500 not-italic">
            <PhoneOff className="h-[13px] w-[13px] text-white" aria-hidden />
          </i>
        </div>
      ) : null}
    </div>
  );
}

/* ===== エキスパートフロー（時系列 ①〜⑤） ===== */

function XField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border border-border bg-card px-[13px] py-[9px] text-[11.5px] text-neutral-700">
      {/* 9px は実機で読めないのでスマホだけ 11px（PC は据え置き） */}
      <b className="block text-[11px] font-semibold tracking-[0.08em] text-neutral-500 sm:text-[9px]">
        {label}
      </b>
      {children}
    </div>
  );
}

function ExpertFlowPanel() {
  return (
    <>
      {/* ① 登録 */}
      <div className="pb-[72px] pt-2">
        <Milestone n={1} now>
          登録する
        </Milestone>
        <StepRow
          small
          cop={
            <>
              <StepH>まずは、無料登録から</StepH>
              <StepP>
                会員登録のあと、エキスパート参加を申請。<b>大学・プログラム・得意なこと</b>
                を入力するだけです。
              </StepP>
            </>
          }
          shot={
            <div className={`${shotCls} about-shot-lime space-y-2 p-5`}>
              <XField label="在学中・出身の大学">🇺🇸 ハーバード（ボストン）</XField>
              <XField label="プログラム">MBA・2025年入学</XField>
              <XField label="得意なこと">MBA出願・エッセイ・面接対策</XField>
              <div className="rounded-full bg-primary-500 py-2 text-center text-[11.5px] font-extrabold text-neutral-950">
                この内容で申請する
              </div>
            </div>
          }
        />
      </div>

      {/* ② 在籍確認 */}
      <div className="pb-[72px] pt-2">
        <Milestone n={2}>在籍確認を受ける</Milestone>
        <StepRow
          small
          cop={
            <>
              <StepH>書類で、在学・卒業を証明</StepH>
              <StepP>
                入学証明書・学生証・卒業証書のいずれかを提出し、運営が確認します。
                <b>通過した人だけ</b>が一覧に掲載され、バッジが付きます。
              </StepP>
            </>
          }
          shot={
            <div className={`${shotCls} about-shot-fade p-5`}>
              {['入学証明書.pdf', '学生証.jpg'].map((doc) => (
                <div
                  key={doc}
                  className="mt-2 flex items-center gap-[9px] rounded-xl border-[1.5px] border-dashed border-border-strong bg-card px-[13px] py-[11px] text-[11.5px] text-neutral-700 first:mt-0"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-primary-700" aria-hidden />
                  {doc}
                </div>
              ))}
              <span className="mt-[11px] inline-flex items-center gap-[7px] rounded-full border border-primary-300 bg-primary-100 px-3.5 py-1.5 text-[11px] font-extrabold text-primary-900">
                <ShieldCheck className="h-3 w-3" aria-hidden />
                審査通過 — バッジ付与
              </span>
            </div>
          }
        />
      </div>

      {/* ③ メニュー作成 */}
      <div className="pb-[72px] pt-2">
        <Milestone n={3}>相談メニューを作る</Milestone>
        <StepRow
          small
          cop={
            <>
              <StepH>料金もテーマも、あなたが決める</StepH>
              <StepP>
                30分・60分のメニューを作成し、<b>空き時間はあなたの現地時間</b>
                で登録。相談者には日本時間で表示されます。
              </StepP>
            </>
          }
          shot={
            <div className={`${shotCls} about-shot-lime p-5`}>
              <div className="rounded-xl border border-border bg-card px-[15px] py-[13px]">
                <div className="flex items-baseline gap-1.5 text-[12.5px] font-extrabold">
                  30分相談
                  <i className="ml-auto text-[15px] font-extrabold not-italic tabular-nums">
                    ¥4,000
                  </i>
                </div>
                <div className="mt-2 h-1.5 rounded bg-muted" />
                <div className="mt-2 h-1.5 w-[60%] rounded bg-muted" />
              </div>
              <div className="mt-2.5 flex flex-wrap gap-[5px]">
                <span className="rounded-full bg-neutral-900 px-[11px] py-[3px] text-[10px] font-bold text-white">MBA</span>
                <span className="rounded-full bg-neutral-900 px-[11px] py-[3px] text-[10px] font-bold text-white">エッセイ・出願書類</span>
                <span className="rounded-full border border-border bg-card px-[11px] py-[3px] text-[10px] font-bold text-neutral-700">面接対策</span>
              </div>
            </div>
          }
        />
      </div>

      {/* ④ 予約が入る */}
      <div className="pb-[72px] pt-2">
        <Milestone n={4}>予約が入る</Milestone>
        <StepRow
          small
          cop={
            <>
              <StepH>リクエストを、承諾するだけ</StepH>
              <StepP>
                空き枠に予約リクエストが届きます。内容を見て<b>承諾したら確定</b>
                。参加リンクは自動で相手に共有されます。
              </StepP>
            </>
          }
          shot={
            <div className={`${shotCls} about-shot-faint p-5`}>
              <div className="rounded-[13px] border-[1.5px] border-warning-500/40 bg-card px-3.5 py-3">
                <div className="flex items-center gap-2 text-[12px] font-extrabold">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-bold text-neutral-700">
                    伊
                  </span>
                  {/* しわ寄せを受ける側。裸のテキストノードだと日本語 min-content
                      （1 文字）まで潰れて縦積みになるので min-w-0 + truncate */}
                  <span className="min-w-0 flex-1 truncate">伊藤さん</span>
                  {/* 9px は実機で読めないのでスマホだけ 11px。潰れないよう shrink-0 */}
                  <span className="ml-auto shrink-0 whitespace-nowrap rounded-full border border-warning-500/40 bg-warning-50 px-[9px] py-0.5 text-[11px] font-extrabold text-warning-700 sm:text-[9px]">
                    リクエスト中
                  </span>
                </div>
                <div className="mt-[7px] text-[10.5px] tabular-nums text-neutral-500">
                  9/18（金）13:00 現地時間 ・ 30分相談 ¥6,000
                </div>
                <div className="mt-[9px] flex items-center gap-2">
                  <span className="rounded-full bg-primary-500 px-4 py-[5px] text-[10.5px] font-extrabold text-neutral-950">
                    承諾する
                  </span>
                  <span className="text-[10.5px] font-semibold text-neutral-500">辞退</span>
                </div>
              </div>
            </div>
          }
        />
      </div>

      {/* ⑤ オンラインで相談 */}
      <div className="pb-6 pt-2">
        <Milestone n={5} now>
          オンラインで相談
        </Milestone>
        <StepRow
          small
          cop={
            <>
              <StepH>あなたの経験が、誰かの30分に</StepH>
              <StepP>
                当日はビデオ通話で30分。<b>Zoom / Google Meet</b>
                の固定リンクを登録しておけば、毎回そのまま使えます。
              </StepP>
            </>
          }
          shot={
            <CallShot
              leftTag="あなた — ボストン"
              leftTagSm="あなた"
              rightInitial="伊"
              rightTag="伊藤さん — 東京"
              rightTagSm="伊藤さん"
            />
          }
        />
      </div>

      <div className="mt-11">
        <Link
          href="/become-writer"
          className="inline-flex items-center gap-[9px] rounded-full bg-primary-500 px-8 py-3.5 text-[15px] font-bold text-neutral-950 shadow-sm transition hover:bg-primary-300"
        >
          エキスパートとして参加する
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <div className="mt-[13px] text-[13.5px] text-neutral-500">
          参加は無料。あなたの海外経験が、誰かの30分になります。
        </div>
      </div>
    </>
  );
}

/* ===== ユースケース ===== */

const USE_CASES: Array<{ q: string; label: string; topic: string }> = [
  { q: '出願校、どうやって3校に絞る？', label: '大学院出願', topic: 'grad_school' },
  { q: 'MBAエッセイ、何を軸に書けば刺さる？', label: 'MBA', topic: 'mba' },
  { q: '日本の高校から、直接出願できる？', label: '学部出願', topic: 'undergrad' },
  { q: '交換留学の学内選考、何を準備する？', label: '語学・交換留学', topic: 'language_exchange' },
  { q: 'SoP・志望理由書、書き出しから相談したい', label: 'エッセイ・出願書類', topic: 'application_docs' },
  { q: '面接で何を聞かれる？想定問答を作りたい', label: '面接対策', topic: 'interview' },
  { q: '奨学金、自分の条件ならどれが現実的？', label: '奨学金・費用', topic: 'funding' },
  { q: '寮とシェアハウス、実際どっちがいい？', label: '現地生活・キャンパス', topic: 'campus_life' },
  { q: '研究室選び、教授へのコンタクトはどう取る？', label: '専攻・研究室選び', topic: 'majors_labs' },
];

/* ===== 相談例 ===== */

function OutcomeCard({
  theme,
  title,
  before,
  after,
}: {
  theme: string;
  title: string;
  before: string;
  after: string;
}) {
  return (
    <div className="relative rounded-[18px] border border-border bg-card px-[23px] py-[25px] shadow-xs">
      {/* 9.5px は実機で読めないのでスマホだけ 11px（PC は据え置き） */}
      <span className="absolute -top-3 left-[18px] rounded-full bg-neutral-900 px-3 py-[3px] text-[11px] font-semibold tracking-[0.12em] text-white sm:text-[9.5px]">
        相談例
      </span>
      <span className="inline-flex rounded-full border border-primary-300 bg-primary-100 px-[13px] py-[3px] text-[11.5px] font-extrabold text-primary-900">
        {theme}
      </span>
      <h3 className="mt-3 text-[16px] font-extrabold leading-[1.6]">{title}</h3>
      <div className="mt-[15px] flex flex-col gap-2.5 text-[13.5px] leading-[1.85]">
        <div className="flex items-start gap-[9px]">
          <span className="mt-[3px] shrink-0 whitespace-nowrap rounded-[7px] bg-muted px-[9px] py-0.5 text-[10px] font-extrabold text-neutral-500">
            相談前
          </span>
          <span className="text-neutral-500">{before}</span>
        </div>
        <div className="flex items-start gap-[9px]">
          <span className="mt-[3px] shrink-0 whitespace-nowrap rounded-[7px] bg-primary-500 px-[9px] py-0.5 text-[10px] font-extrabold text-neutral-950">
            30分後
          </span>
          <span className="font-semibold text-neutral-700">{after}</span>
        </div>
      </div>
    </div>
  );
}

/* ===== FAQ ===== */

function FaqItem({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-[15px] border border-border bg-card px-6 py-[18px] shadow-xs transition hover:border-border-strong open:border-primary-500 open:shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3.5 text-[15px] font-extrabold [&::-webkit-details-marker]:hidden">
        {q}
        <span
          className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-primary-100 text-[15px] font-bold leading-none text-primary-900 transition-transform group-open:rotate-45 group-open:bg-primary-500 group-open:text-neutral-950"
          aria-hidden
        >
          +
        </span>
      </summary>
      <div className="mt-3 text-[14px] leading-[2.05] text-neutral-500 [&_b]:font-bold [&_b]:text-foreground">
        {children}
      </div>
    </details>
  );
}

/* ============================== page ============================== */

export default function AboutServicePage() {
  return (
    <main className="overflow-hidden bg-background text-foreground">
      {/* ===== hero（写真帯・線なし）。写真はデモ用プレースホルダ ===== */}
      <section className="about-hero-bg relative px-6 pb-[92px] pt-[76px] text-white">
        {/* グリッドの子は既定で min-content 未満に縮まない。中のピルやモックが
            要求する幅で列が 410px まで広がり、402px の画面からはみ出していた */}
        <div className="mx-auto grid max-w-[1080px] items-center gap-[52px] lg:grid-cols-[1.04fr_.96fr]">
          <div className="min-w-0">
            <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary-500/50 bg-white/10 px-4 py-[5px] text-[12.5px] font-bold text-primary-500">
              <i className="h-[7px] w-[7px] shrink-0 rounded-full bg-primary-500 not-italic" aria-hidden />
              {/* 22 文字のピルは 320px に入らない。スマホは短い言い回しに畳む */}
              <span className="sm:hidden">在籍確認つき・先輩に留学相談</span>
              <span className="max-sm:hidden">在籍確認つき・在学生/アルムナイへの留学相談</span>
            </span>
            <h1 className="mt-[22px] text-[clamp(31px,4.8vw,52px)] font-black leading-[1.3] tracking-[-0.03em] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.35)]">
              留学のことは、
              <br />
              <span className="text-primary-500">通っている先輩</span>と。
            </h1>
            <p className="mt-[22px] max-w-[30em] text-[16px] leading-[2.1] text-white/85">
              学部、大学院、MBA、語学・交換留学。ひとりで検索し続けるのは、今日でおしまい。
              <b className="font-bold text-white">いまその大学で学ぶ先輩</b>
              に、30分からオンラインで相談できます。
            </p>
            <div className="mt-[30px] flex flex-wrap items-center gap-6">
              <Link
                href="/experts"
                className="inline-flex items-center gap-[9px] rounded-full bg-primary-500 px-8 py-3.5 text-[15px] font-bold text-neutral-950 shadow-sm transition hover:bg-primary-300"
              >
                エキスパートを探す
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/become-writer"
                className="inline-flex items-center gap-[7px] text-[15px] font-bold text-white"
              >
                <u className="underline decoration-primary-500 decoration-[3px] underline-offset-[5px] hover:decoration-primary-300">
                  エキスパートとして参加
                </u>
              </Link>
            </div>
            {/* アバター列だけで 190px 固定。402px だと文が 150px に潰れて
                1 行 11 文字になるので、入らないときは文を次の行へ落とす */}
            <div className="mt-[30px] flex flex-wrap items-center gap-x-3.5 gap-y-3">
              <span className="flex shrink-0" aria-hidden>
                {['aya', 'kentaro', 'misaki', 'daisuke', 'eri', 'haruka'].map(
                  (n, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={n}
                      src={`/experts/${n}.jpg`}
                      alt=""
                      className={
                        'h-10 w-10 shrink-0 rounded-full border-[2.5px] border-white/90 bg-muted object-cover shadow-xs ' +
                        (i > 0 ? '-ml-2.5' : '')
                      }
                    />
                  ),
                )}
              </span>
              <p className="min-w-[12rem] flex-1 text-[13.5px] leading-[1.8] text-white/80">
                <b className="font-bold text-white">ボストンからロンドンまで。</b>
                世界の大学の「先輩」が、全員・在籍確認済みで待っています。
              </p>
            </div>
          </div>

          {/* プレイヤーカード。text-foreground 明示でヒーロー白文字の継承を遮断 */}
          <div
            className="min-w-0 rounded-[20px] border border-border bg-card p-4 pb-3.5 text-foreground shadow-lg"
            aria-hidden
          >
            <div className="flex items-center gap-1.5 px-1 pb-3">
              <i className="h-[9px] w-[9px] rounded-full bg-border-strong not-italic" />
              <i className="h-[9px] w-[9px] rounded-full bg-border-strong not-italic" />
              <i className="h-[9px] w-[9px] rounded-full bg-border-strong not-italic" />
              <span className="ml-2 text-[10.5px] text-neutral-500">locore.app</span>
              {/* 9.5px は実機で読めないのでスマホだけ 11px（PC は据え置き） */}
              <span className="ml-auto inline-flex shrink-0 items-center gap-[5px] whitespace-nowrap rounded-full bg-primary-100 px-[9px] py-0.5 text-[11px] font-semibold text-primary-900 sm:text-[9.5px]">
                <b className="h-1.5 w-1.5 rounded-full bg-primary-700" />
                相談中
              </span>
            </div>
            <div className="rounded-[14px] border border-border bg-card px-[15px] py-[13px] shadow-xs">
              <div className="flex items-center gap-[11px]">
                <PhotoAva src="/experts/aya.jpg" size="h-11 w-11" />
                <div className="min-w-0 flex-1">
                  {/* 320px では名前列が 90px しかなく、既定ラベルのバッジ（約 104px・
                      whitespace-nowrap）が折り返しても列からはみ出して価格へ重なる。
                      スマホだけ短いラベルにし、名前は min-w-0 + truncate で縮ませる */}
                  <div className="flex flex-wrap items-center gap-2 text-[14px] font-bold">
                    <span className="min-w-0 truncate">高村 里奈</span>
                    <span className="shrink-0 max-sm:hidden">
                      <VBadge />
                    </span>
                    <span className="shrink-0 sm:hidden">
                      <VBadge label="認証済み" />
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-[12px] text-neutral-500">
                    🇺🇸 ボストン ・ HBS在学中（元総合商社）
                  </div>
                </div>
                <div className="ml-auto shrink-0 text-right leading-[1.3]">
                  <b className="block text-[15px] font-bold tabular-nums">¥6,000</b>
                  <span className="text-[10px] text-neutral-500">/ 30分〜</span>
                </div>
              </div>
            </div>
            <div className="mt-2.5 flex flex-col gap-2 text-[12.5px] leading-[1.8]">
              <div className="max-w-[88%] self-end rounded-[14px] rounded-br-[5px] bg-neutral-900 px-[13px] py-[9px] text-white">
                来年秋入学でMBA出願を予定しています。エッセイの方向性を相談したいです…!
              </div>
              <div className="max-w-[88%] self-start rounded-[14px] rounded-bl-[5px] border border-primary-100 bg-primary-50 px-[13px] py-[9px] text-foreground">
                もちろんです。ご職歴とターゲット校を教えてください。エッセイの軸を一緒に絞りましょう。
              </div>
            </div>
            <div className="mt-[13px] flex items-center gap-[11px] px-1">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-500">
                <Play className="h-[11px] w-[11px] fill-neutral-950 text-neutral-950" aria-hidden />
              </span>
              <span className="relative h-1.5 flex-1 rounded-full bg-muted">
                <i className="absolute bottom-0 left-0 top-0 w-[38%] rounded-full bg-primary-500 not-italic" />
              </span>
              <time className="text-[10px] tabular-nums text-neutral-500">11:23 / 30:00</time>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 使い方（ここだけ左タイムライン） ===== */}
      <section className="px-6 pb-[92px] pt-[84px]">
        <div className="mx-auto max-w-[1080px]">
          <div className="mx-auto max-w-[720px] text-center">
            <Kicker>How it works</Kicker>
            <SectionH>ご利用方法</SectionH>
          </div>
          <AboutHowTabs userPanel={<UserFlowPanel />} expertPanel={<ExpertFlowPanel />} />
        </div>
      </section>

      {/* ===== よくある相談 ===== */}
      <section className="about-tint-b px-6 pb-[84px] pt-[76px]">
        <div className="mx-auto max-w-[1080px]">
          <div className="mx-auto max-w-[720px] text-center">
            <Kicker>Use cases</Kicker>
            <SectionH>よくある相談内容</SectionH>
          </div>
          <div className="mt-[38px] grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map((u) => (
              <Link
                key={u.q}
                href={`/experts?topic=${u.topic}`}
                className="flex flex-col gap-3.5 rounded-2xl border border-border bg-card px-[23px] py-[21px] shadow-xs transition hover:border-primary-300 hover:shadow-md"
              >
                <span className="text-[14.5px] font-bold leading-[1.7]">
                  <span className="text-primary-700">「</span>
                  {u.q}
                  <span className="text-primary-700">」</span>
                </span>
                <span className="mt-auto flex items-center gap-2">
                  <span className="rounded-full border border-primary-300 bg-primary-100 px-[13px] py-[3px] text-[11.5px] font-extrabold text-primary-900">
                    {u.label}
                  </span>
                  <ArrowRight className="ml-auto h-3.5 w-3.5 text-primary-700" aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 在籍確認（ダーク帯） ===== */}
      <section className="about-trust-bg px-6 pb-[84px] pt-[76px] text-white">
        <div className="mx-auto max-w-[1080px]">
          <Kicker dark>Trust — Locoreの核</Kicker>
          <h2 className="mt-5 text-[clamp(25px,3.6vw,38px)] font-black leading-[1.4] tracking-[-0.028em] text-white">
            誰でもは、載れません。
            <br />
            <b className="font-black text-primary-500">在籍確認</b>という関門。
          </h2>
          <p className="mt-3.5 max-w-[38em] text-[15.5px] leading-[2.05] text-white/75">
            SNSで見つけた「合格者」「在学生」は、本当にその学校の人でしょうか。Locoreに掲載される全エキスパートは、在学・卒業の実態を書類で確認済みです。
          </p>
          <div className="mt-10 grid items-center gap-9 lg:grid-cols-[1.04fr_.96fr] lg:gap-14">
            {/* 3ステップ縦タイムライン（丸数字 + 縦ライン）。
                グリッドの子は min-w-0（中身の min-content で列が広がるのを防ぐ） */}
            <div className="flex min-w-0 flex-col">
              {[
                {
                  n: 1,
                  t: '在学・卒業を証明する書類の提出',
                  p: '入学証明書・在籍証明書、学生証、卒業証書・学位記のいずれかを提出。氏名と学校名が読めれば、学籍番号などはマスクして構いません。',
                  gate: null,
                },
                {
                  n: 2,
                  t: '運営による審査',
                  p: '書類と申告内容（学校名・在学中か卒業か）を運営が照合します。',
                  gate: '基準を満たさなければ、掲載されません',
                },
                {
                  n: 3,
                  t: '認証バッジの付与',
                  p: '通過した人だけに「在籍確認済み」バッジ。在学中かアルムナイかも表示され、相談後の公開レビューと合わせて信頼の目印に。',
                  gate: null,
                },
              ].map((s, i, arr) => (
                <div
                  key={s.n}
                  className={
                    'relative flex gap-[18px]' +
                    (i === arr.length - 1 ? '' : ' pb-[30px]')
                  }
                >
                  {i !== arr.length - 1 ? (
                    <span
                      className="absolute bottom-1 left-[18px] top-11 w-px bg-primary-500/40"
                      aria-hidden
                    />
                  ) : null}
                  <span className="z-[1] grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-primary-500 text-[15px] font-extrabold tabular-nums text-neutral-950">
                    {s.n}
                  </span>
                  <div>
                    <b className="block text-[16.5px] font-extrabold">{s.t}</b>
                    <p className="mt-1.5 text-[14.5px] leading-[2] text-white/70">
                      {s.p}
                      {/* 320px では丸数字 38 + gap 18 を引いた 216px に入らず
                          rounded-full の中で 2 行になるので、スマホだけ角丸の板に */}
                      {s.gate ? (
                        <span className="mt-2.5 inline-flex rounded-full border border-primary-500/50 px-3.5 py-[3px] text-[11.5px] font-extrabold text-primary-500 max-sm:rounded-[10px] max-sm:py-1">
                          {s.gate}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {/* 白カード。text-foreground 明示 */}
            <div className="min-w-0 rounded-[22px] bg-card px-8 py-[34px] text-center text-foreground shadow-[0_26px_60px_-20px_rgba(0,0,0,0.5)] max-sm:px-5">
              <div className="mx-auto mb-4 grid h-[84px] w-[84px] place-items-center rounded-full border-[1.5px] border-primary-200 bg-primary-50 text-primary-700">
                <ShieldCheck className="h-10 w-10" strokeWidth={1.8} aria-hidden />
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-300 bg-primary-100 px-[18px] py-1.5 text-[13.5px] font-bold text-primary-900">
                <ShieldCheck className="h-[13px] w-[13px]" aria-hidden />
                在籍確認済み
              </span>
              <p className="mt-[15px] text-[14px] leading-[2] text-neutral-500">
                このバッジは、運営が書類で在学・卒業を確認したエキスパートだけのもの。「詳しいらしい」ではなく、
                <b className="font-bold text-foreground">「本当にその学校で学んだ」</b>
                人の言葉です。
              </p>
              <div className="mt-5 border-t border-dashed border-border-strong pt-4 text-left">
                {/* 9.5px は実機で読めないのでスマホだけ 11px（PC は据え置き） */}
                <div className="mb-2.5 text-[11px] tracking-[0.12em] text-neutral-500 sm:text-[9.5px]">
                  ▼ 一覧でもプロフィールでも
                </div>
                <SfHit shadow={false} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 料金（ユーザー指定のコピー修正済み） ===== */}
      <section className="about-tint-t px-6 pb-[84px] pt-[76px]">
        <div className="mx-auto max-w-[1080px]">
          <div className="mx-auto max-w-[720px] text-center">
            <Kicker>Pricing</Kicker>
            <SectionH>
              料金は、エキスパートが<Em>サービス内容に応じて</Em>設定。
            </SectionH>
          </div>
          <div className="mx-auto mb-[26px] mt-10 flex max-w-[720px] items-center gap-[18px] rounded-[18px] border-[1.5px] border-primary-300 bg-card px-[26px] py-5 shadow-sm max-sm:items-start max-sm:px-5">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary-500 text-[16px] font-extrabold tabular-nums text-neutral-950">
              ¥0
            </span>
            {/* 56px の丸に対して、文の側が縮む担当。min-w-0 で潰れ方を制御する */}
            <div className="min-w-0">
              <b className="text-[16px] font-extrabold">予約前のチャット相談は、無料。</b>
              <p className="mt-[3px] text-[13.5px] leading-[1.9] text-neutral-500">
                エキスパート探しも、読みものも、申し込む前の質問も無料。合わなければ、やめてOK。
              </p>
            </div>
          </div>
          <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative flex flex-col rounded-[18px] border-[1.5px] border-primary-500 bg-card px-[26px] py-7 shadow-md">
              {/* 重ね置きは幅に余裕がある前提。スマホでは通常の流し込みに戻して
                  「30分相談」の上に置く（重なって読めなくなっていた） */}
              <span className="absolute right-[18px] top-[18px] rounded-full border border-primary-300 bg-primary-100 px-[13px] py-[3px] text-[11px] font-extrabold text-primary-900 max-sm:static max-sm:mb-2.5 max-sm:self-start">
                はじめての方に
              </span>
              <div className="text-[15px] font-extrabold">30分相談</div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <b className="text-[31px] font-extrabold tabular-nums tracking-[-0.02em]">¥3,000</b>
                <span className="text-[12.5px] text-neutral-500">〜 / 30分・税込</span>
              </div>
              <ul className="mt-[15px] flex flex-col gap-[9px] text-[13.5px] leading-[1.85] text-neutral-700">
                <PriceLi>ピンポイントの疑問に。テーマ1〜2個をじっくり</PriceLi>
              </ul>
              <div className="mt-[15px] text-[11.5px] text-neutral-500">
                料金はエキスパート設定の目安です
              </div>
            </div>
            <div className="flex flex-col rounded-[18px] border border-border bg-card px-[26px] py-7 shadow-xs">
              <div className="text-[15px] font-extrabold">60分相談</div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <b className="text-[31px] font-extrabold tabular-nums tracking-[-0.02em]">¥6,000</b>
                <span className="text-[12.5px] text-neutral-500">〜 / 60分・税込</span>
              </div>
              <ul className="mt-[15px] flex flex-col gap-[9px] text-[13.5px] leading-[1.85] text-neutral-700">
                <PriceLi>エッセイレビューや出願の全体設計など、腰を据えた相談に</PriceLi>
                <PriceLi>「出願までのやること」を時系列で一緒に整理</PriceLi>
              </ul>
              <div className="mt-[15px] text-[11.5px] text-neutral-500">
                料金はエキスパート設定の目安です
              </div>
            </div>
            <div className="flex flex-col rounded-[18px] border border-border bg-card px-[26px] py-7 shadow-xs">
              <div className="text-[15px] font-extrabold">継続プラン（月額）</div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <b className="text-[31px] font-extrabold tracking-[-0.02em]">月額</b>
                <span className="text-[12.5px] text-neutral-500">サービス内容に応じて設定</span>
              </div>
              <ul className="mt-[15px] flex flex-col gap-[9px] text-[13.5px] leading-[1.85] text-neutral-700">
                <PriceLi>渡航準備の数か月、同じ人に伴走してほしいときに</PriceLi>
                <PriceLi>定期相談＋チャットでの継続フォロー</PriceLi>
              </ul>
              <div className="mt-[15px] text-[11.5px] text-neutral-500">
                対応しているエキスパートのみ
              </div>
            </div>
          </div>
          <div className="mx-auto mt-[22px] flex max-w-[720px] items-start gap-2.5 rounded-[14px] border-[1.5px] border-dashed border-border-strong bg-card px-5 py-3.5 text-[13.5px] leading-[1.95] text-neutral-700">
            <Info className="mt-1 h-[15px] w-[15px] shrink-0 text-primary-700" aria-hidden />
            決済機能は現在準備中です。まずは無料のチャットと予約リクエストからお試しください。
          </div>
        </div>
      </section>

      {/* ===== 30分でここまで ===== */}
      <section className="px-6 pb-[84px] pt-[76px]">
        <div className="mx-auto max-w-[1080px]">
          <div className="mx-auto max-w-[720px] text-center">
            <Kicker>In 30 minutes</Kicker>
            <SectionH>
              30分で、<Em>ここまで進む</Em>。
            </SectionH>
            <p className="mt-3.5 text-[15.5px] leading-[2.05] text-neutral-500">
              実際にできる相談の「例」です。あなたの事情に合わせて、もっと具体的に聞けます。
            </p>
          </div>
          <div className="mt-[42px] grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
            <OutcomeCard
              theme="MBA"
              title="MBAエッセイ、何を軸にする？"
              before="テーマが決まらず、ドラフトが2週間白紙のまま。"
              after="職歴の棚卸しから軸が1本決まり、段落構成のメモが残る。推薦者に頼む内容も明確に。"
            />
            <OutcomeCard
              theme="大学院出願"
              title="出願校リスト、どう絞る？"
              before="ランキングを眺めては閉じるの繰り返しで、堂々巡り。"
              after="研究テーマと予算で現実的な5校に絞れて、各校の締切と必要書類のカレンダーができる。"
            />
            <OutcomeCard
              theme="奨学金・費用"
              title="奨学金、自分ならどれが現実的？"
              before="制度が多すぎて、条件の違いが比較できない。"
              after="自分の条件で出せる2つに絞れて、エッセイの締切から逆算したスケジュールが決まる。"
            />
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="about-tint-t px-6 pb-[84px] pt-[76px]">
        <div className="mx-auto max-w-[1080px]">
          <div className="mx-auto max-w-[720px] text-center">
            <Kicker>FAQ</Kicker>
            <SectionH>
              はじめる前に、<Em>気になること</Em>。
            </SectionH>
          </div>
          <div className="mx-auto mt-[38px] max-w-[760px] space-y-3">
            <FaqItem q="料金はいくらですか？">
              相談メニューごとにエキスパートが設定しています。目安は
              <b>30分 ¥3,000〜、60分 ¥6,000〜</b>
              。各エキスパートのページで、時間と料金を確認してから申し込めます。継続プラン（月額）を用意しているエキスパートもいます。
            </FaqItem>
            <FaqItem q="予約や決済はどうやるのですか？">
              空き枠からの予約リクエストとチャットは使えます。
              <b>決済機能は現在準備中</b>
              のため、料金の支払いが必要になる段階の前で止まります。まずはチャットでの相談内容のすり合わせからお試しください。
            </FaqItem>
            <FaqItem q="「在籍確認」は何を確認しているのですか？">
              入学証明書・在籍証明書、学生証、卒業証書・学位記のいずれかで、
              <b>「本当にその学校に在学している / 卒業した」こと</b>
              を運営が確認しています。相談内容の良し悪しを審査するものではなく、在籍実態の確認です。確認済みのエキスパートだけにバッジが表示されます。TOEFL・GMAT などのスコアや資格も、合格証明を確認したものだけを「確認済み」として表示しています。
            </FaqItem>
            <FaqItem q="無料でできることはありますか？">
              会員登録・エキスパート探し・記事（読みもの）・
              <b>申し込み前のチャットでの質問</b>
              まで、すべて無料です。有料になるのは相談メニューを申し込んでからです。
            </FaqItem>
            <FaqItem q="どんなことを相談できますか？">
              学部・大学院・MBA・語学・交換留学の出願準備、エッセイや研究計画のレビュー、面接対策、奨学金、渡航後の住まいやキャンパス生活まで。各エキスパートの「こんな相談に乗れます」を見て選んでください。医療・法律・税務など資格が必要な業務のアドバイスは対象外です（経験談としてのお話は可能です）。
            </FaqItem>
            <FaqItem q="エキスパートは海外在住。時差は大丈夫？">
              空き枠も確定日時も<b>あなたの現地時間で表示</b>
              されるので、時差の計算は不要です。エキスパート側にも相手の現地時間で表示され、換算はLocoreが自動で行います。多くのエキスパートが日本時間の夜・週末に枠を設定しています。
            </FaqItem>
            <FaqItem q="キャンセルはできますか？">
              エキスパートが承諾する前のリクエストは、いつでも取り消せます。確定後に都合が悪くなった場合は、できるだけ早くチャットで相手に連絡して日程を調整してください。決済導入にあわせて、キャンセルポリシーを正式に整備する予定です。
            </FaqItem>
            <FaqItem q="相談相手と合わなかったら？">
              そのために<b>申し込み前の無料チャット</b>
              があります。話し方や詳しさが合うか、まず質問して確かめてください。相談後はレビューで率直な評価を残せます。やり取りで問題があった場合は、運営までご連絡ください。
            </FaqItem>
          </div>
        </div>
      </section>

      {/* ===== 最終CTA（写真帯）。写真はデモ用プレースホルダ ===== */}
      <section className="px-6 pb-[88px] pt-6">
        <div className="mx-auto max-w-[1080px]">
          <div className="about-final-bg overflow-hidden rounded-3xl px-10 py-[72px] text-center text-white max-sm:px-[22px] max-sm:py-12">
            <h2 className="text-[clamp(27px,4.2vw,44px)] font-black leading-[1.35] tracking-[-0.03em] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.35)]">
              あなたの海外を、
              <b className="font-black text-primary-500">経験者</b>と。
            </h2>
            <p className="mt-4 text-[15.5px] text-white/85">
              検索を3時間続けるより、住んでいる人にひとこと聞いてみませんか。
            </p>
            <div className="mt-[30px] flex flex-wrap items-center justify-center gap-6">
              <Link
                href="/experts"
                className="inline-flex items-center gap-[9px] rounded-full bg-primary-500 px-8 py-3.5 text-[15px] font-bold text-neutral-950 shadow-sm transition hover:bg-primary-300"
              >
                エキスパートを探す
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/become-writer"
                className="inline-flex items-center text-[15px] font-bold text-white"
              >
                <u className="underline decoration-primary-500 decoration-[3px] underline-offset-[5px] hover:decoration-primary-300">
                  エキスパートとして参加
                </u>
              </Link>
            </div>
            <div className="mt-[15px] text-[13.5px] text-white/70">
              会員登録は無料。チャットでの事前相談から始められます。
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function PriceLi({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-[9px] leading-[1.85]">
      <span className="mt-1 grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full bg-primary-100 text-primary-900">
        <Check className="h-[9px] w-[9px]" strokeWidth={3} aria-hidden />
      </span>
      {children}
    </li>
  );
}
