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
 *   よくある相談 / 居住認証ダーク帯 / 料金（コピー修正済み）/ 30分でここまで /
 *   FAQ / 最終CTA（写真帯）。
 * 写真（/about/*.jpg・/experts/*.jpg）はデモ用プレースホルダ（Pexels 商用可素材。
 * 特定の実在人物・エキスパートではない）。白カードには text-foreground を明示して
 * ヒーローの白文字継承（保護色化）を遮断する。ゴシック統一（明朝・イタリックなし）。
 */

export const metadata = {
  title: '使い方',
  description:
    '海外のことは、現地にいる人と。移住・留学・駐在準備・旅行の「あなたの場合はどうか」を、居住認証済みの海外在住日本人に30分からオンラインで相談できます。ご利用方法・居住認証・料金の説明ページです。',
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
  return <span className="font-black text-primary-700">{children}</span>;
}

function VBadge({ label = '居住認証済み' }: { label?: string }) {
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
        <div>
          <div className="text-[13.5px] font-extrabold">佐々木 彩</div>
          <div className="mt-px text-[11.5px] text-neutral-500">
            🇫🇷 パリ在住 8年 ・ 現地で起業
          </div>
        </div>
        <span className="ml-auto">
          <VBadge label="認証済み" />
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-2 border-t border-dashed border-border pt-2.5">
        <span className="text-[14px] font-extrabold tabular-nums">
          ¥4,000
          <small className="text-[9.5px] font-normal text-neutral-500"> / 30分〜</small>
        </span>
        <span className="ml-auto text-[10.5px] font-bold text-neutral-700">
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
    <div className="mt-[26px] grid items-center gap-6 md:grid-cols-[.9fr_1.1fr] md:gap-11">
      <div>{cop}</div>
      <div className={small ? 'max-w-[440px]' : 'max-w-[540px] md:max-w-none'}>{shot}</div>
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
          エキスパートを探す
        </Milestone>
        <StepRow
          cop={
            <>
              <StepH>気になる人を探す</StepH>
              <StepP>
                興味のある場所やテーマで絞り込んだり、検索したり。エキスパートのプロフィールや相談メニュー、レビューを見ながらコンタクトを取りたい人を決めます。表示されるエキスパートは全員、当サイトで居住実績の認定を行っているのでご安心してご相談いただけます。
              </StepP>
            </>
          }
          shot={
            <div className={`${shotCls} about-shot-lime p-5`}>
              <div className="flex gap-2">
                <span className="flex flex-1 items-center gap-[9px] rounded-full border-[1.5px] border-border-strong bg-card px-4 py-[11px] text-[12.5px] text-neutral-700">
                  <Search className="h-3.5 w-3.5 shrink-0 text-neutral-500" aria-hidden />
                  <b className="font-bold text-foreground">パリ 子連れ移住</b>
                </span>
                <span className="inline-flex shrink-0 items-center rounded-full bg-primary-500 px-5 text-[12.5px] font-extrabold text-neutral-950">
                  探す
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-neutral-900 px-3 py-1 text-[10.5px] font-bold text-white">
                  🇫🇷 フランス
                </span>
                {['移住', '子育て', '¥5,000まで'].map((t) => (
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
        <Milestone n={2}>チャットで相談（無料）</Milestone>
        <StepRow
          cop={
            <>
              <StepH>カジュアル相談</StepH>
              <StepP>
                直接話をする前に本人とコンタクト。相談内容に適したエキスパートかを事前に確認することができます。
              </StepP>
              <span className="mt-3.5 inline-flex items-center gap-1.5 rounded-full border border-primary-300 bg-primary-100 px-[15px] py-[5px] text-[12.5px] font-bold text-primary-900">
                ここまで完全無料
              </span>
            </>
          }
          shot={
            <div className={`${shotCls} about-shot-fade p-5`}>
              <div className="flex items-center gap-2.5 border-b border-border pb-3">
                <PhotoAva src="/experts/aya.jpg" size="h-9 w-9" />
                <div>
                  <div className="text-[13px] font-extrabold">佐々木 彩</div>
                  <div className="text-[10px] font-bold text-primary-700">● オンライン</div>
                </div>
                <span className="ml-auto inline-flex items-center gap-[5px] rounded-full border border-primary-300 bg-primary-100 px-[11px] py-[3px] text-[10px] font-extrabold text-primary-900">
                  事前チャット無料
                </span>
              </div>
              <div className="mt-3.5 flex flex-col gap-[9px] text-[12.5px] leading-[1.8]">
                <div className="max-w-[88%] self-end rounded-[14px] rounded-br-[5px] bg-neutral-900 px-[13px] py-[9px] text-white">
                  来春パリ移住予定です。ビザとエリア選び、30分で相談できますか？
                </div>
                {/* エキスパート側は薄ライム地 + 濃文字（保護色回避のため色を明示） */}
                <div className="max-w-[88%] self-start rounded-[14px] rounded-bl-[5px] border border-primary-100 bg-primary-50 px-[13px] py-[9px] text-foreground">
                  できますよ。現在のお仕事と予算感を事前に教えてもらえると、当日が濃くなります。
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
        <Milestone n={3}>相談日を決める</Milestone>
        <StepRow
          cop={
            <>
              <StepH>空き枠から選ぶだけ</StepH>
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
            <div className={`${shotCls} bg-card p-[22px]`}>
              <div className="flex items-center gap-2.5">
                <span className="grid h-7 w-7 place-items-center rounded-full border-[1.5px] border-border-strong bg-card text-neutral-700">
                  <ChevronLeft className="h-[11px] w-[11px]" aria-hidden />
                </span>
                <span className="text-[13px] font-extrabold tabular-nums">
                  9月14日〜9月20日
                </span>
                <span className="grid h-7 w-7 place-items-center rounded-full border-[1.5px] border-border-strong bg-card text-neutral-700">
                  <ChevronRight className="h-[11px] w-[11px]" aria-hidden />
                </span>
                <span className="ml-auto inline-flex items-center gap-[5px] rounded-full border border-primary-300 bg-primary-100 px-3 py-[3px] text-[10.5px] font-extrabold text-primary-900">
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
        <Milestone n={4}>オンライン相談</Milestone>
        <StepRow
          cop={
            <>
              <StepH>エキスパートへいざ相談！</StepH>
              <StepP>ビデオ通話で、抱えている悩み事や課題をエキスパートに相談できます。</StepP>
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
          shot={<CallShot leftTag="佐々木 彩 — パリ" rightInitial="あ" rightTag="あなた — 東京" bar />}
        />
      </div>

      {/* ⑤ 相談のあと（大ダークカード） */}
      <div className="pb-6 pt-2">
        <Milestone n={5} now>
          相談相手から伴走相手へ
        </Milestone>
        <div className="about-darkcard-bg mt-[26px] grid items-center gap-8 rounded-[22px] p-[34px] text-white shadow-lg md:grid-cols-[1.04fr_.96fr] md:gap-12 md:p-12">
          <div>
            <h3 className="text-[clamp(22px,3vw,30px)] font-black leading-[1.45] tracking-[-0.022em]">
              気に入れば<b className="font-black text-primary-500">継続的なメンター</b>に
            </h3>
            <p className="mt-3.5 max-w-[32em] text-[14.5px] leading-[2.05] text-white/75">
              エキスパートの方のアドバイスが参考になれば、継続的に伴走支援を行ってもらうこともできます。1回では解決できないことも一緒なら最後まで走り切れます。
            </p>
            <p className="mt-[18px] text-[10.5px] tracking-[0.08em] text-white/50">
              SESSION NOTES ・ CHAT LOG ・ REBOOK
            </p>
          </div>
          {/* 白パネルは text-foreground を明示（ダークカードの白文字継承を遮断） */}
          <div className="rounded-2xl bg-card px-[22px] py-5 text-foreground">
            <span className="text-[9.5px] font-semibold tracking-[0.14em] text-neutral-500">
              SESSION NOTES — 9/18 佐々木 彩さん
            </span>
            <div className="mt-[11px] flex items-start gap-2.5 text-[13px] leading-[1.8]">
              <span className="mt-0.5 shrink-0 whitespace-nowrap rounded-[7px] bg-muted px-[9px] py-0.5 text-[10px] font-extrabold text-neutral-500">
                相談前
              </span>
              <span className="text-neutral-500">ビザの候補が多すぎて決められない</span>
            </div>
            <div className="mt-[11px] flex items-start gap-2.5 text-[13px] leading-[1.8]">
              <span className="mt-0.5 shrink-0 whitespace-nowrap rounded-[7px] bg-primary-500 px-[9px] py-0.5 text-[10px] font-extrabold text-neutral-950">
                相談後
              </span>
              <span className="font-semibold text-neutral-700">
                自分の場合の最適1つ＋申請書類の順番
              </span>
            </div>
            <div className="mt-[11px] flex items-start gap-2.5 text-[13px] leading-[1.8]">
              <span className="mt-0.5 shrink-0 whitespace-nowrap rounded-[7px] bg-primary-500 px-[9px] py-0.5 text-[10px] font-extrabold text-neutral-950">
                次にやる
              </span>
              <span className="font-semibold text-neutral-700">
                戸籍謄本のアポスティーユ取得（今週）
              </span>
            </div>
            <div className="mt-4 flex items-center gap-2.5 border-t border-dashed border-border-strong pt-3.5">
              <PhotoAva src="/experts/aya.jpg" size="h-8 w-8" />
              <p className="text-[11.5px] leading-[1.6] text-neutral-500">
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
  rightInitial,
  rightTag,
  bar = false,
}: {
  leftTag: string;
  rightInitial: string;
  rightTag: string;
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
          <span className="absolute bottom-2 left-2 rounded-lg bg-black/55 px-[9px] py-[3px] text-[9.5px] font-bold text-white">
            {leftTag}
          </span>
        </div>
        <div className="about-tile-gray relative grid aspect-[1/0.92] place-items-center overflow-hidden rounded-xl">
          <span className="grid aspect-square w-[56%] place-items-center rounded-full bg-neutral-700 text-[clamp(20px,2.4vw,28px)] font-extrabold text-white">
            {rightInitial}
          </span>
          <span className="absolute bottom-2 left-2 rounded-lg bg-black/55 px-[9px] py-[3px] text-[9.5px] font-bold text-white">
            {rightTag}
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
      <b className="block text-[9px] font-semibold tracking-[0.08em] text-neutral-500">{label}</b>
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
                会員登録のあと、エキスパート参加を申請。<b>都市・在住年数・得意なこと</b>
                を入力するだけです。
              </StepP>
            </>
          }
          shot={
            <div className={`${shotCls} about-shot-lime space-y-2 p-5`}>
              <XField label="お住まいの都市">🇫🇷 パリ（フランス）</XField>
              <XField label="在住年数">8年</XField>
              <XField label="得意なこと">移住・起業・生活手続き</XField>
              <div className="rounded-full bg-primary-500 py-2 text-center text-[11.5px] font-extrabold text-neutral-950">
                この内容で申請する
              </div>
            </div>
          }
        />
      </div>

      {/* ② 居住認証 */}
      <div className="pb-[72px] pt-2">
        <Milestone n={2}>居住認証を受ける</Milestone>
        <StepRow
          small
          cop={
            <>
              <StepH>書類で、居住実態を証明</StepH>
              <StepP>
                滞在許可証などの書類を提出し、運営が審査します。<b>通過した人だけ</b>
                が一覧に掲載され、バッジが付きます。
              </StepP>
            </>
          }
          shot={
            <div className={`${shotCls} about-shot-fade p-5`}>
              {['滞在許可証.pdf', '公共料金の請求書.pdf'].map((doc) => (
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
                <span className="rounded-full bg-neutral-900 px-[11px] py-[3px] text-[10px] font-bold text-white">移住</span>
                <span className="rounded-full bg-neutral-900 px-[11px] py-[3px] text-[10px] font-bold text-white">生活手続き</span>
                <span className="rounded-full border border-border bg-card px-[11px] py-[3px] text-[10px] font-bold text-neutral-700">子育て</span>
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
                    高
                  </span>
                  高橋さん
                  <span className="ml-auto rounded-full border border-warning-500/40 bg-warning-50 px-[9px] py-0.5 text-[9px] font-extrabold text-warning-700">
                    リクエスト中
                  </span>
                </div>
                <div className="mt-[7px] text-[10.5px] tabular-nums text-neutral-500">
                  9/18（金）13:00 現地時間 ・ 30分相談 ¥4,000
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
          shot={<CallShot leftTag="あなた — パリ" rightInitial="高" rightTag="高橋さん — 東京" />}
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
  { q: '子連れでの移住、何から始めればいい？', label: '移住', topic: 'immigration' },
  { q: '現地校とインター、うちの子はどっち？', label: '子育て・教育', topic: 'childcare' },
  { q: 'ワーホリの家探し、保証人がいない', label: '住まい', topic: 'housing' },
  { q: '駐在の帯同、会社任せで大丈夫？', label: '駐在準備', topic: 'expat_prep' },
  { q: '現地就職のリアル。求人の探し方から', label: '就職・転職', topic: 'work' },
  { q: '口座・保険・携帯、最初の1か月の順番', label: '生活手続き', topic: 'procedures' },
  { q: 'フリーランス登録と税金の段取りは？', label: '仕事・起業', topic: 'work' },
  { q: '留学前に、学校のリアルを聞きたい', label: '留学', topic: 'study_abroad' },
  { q: '観光じゃない旅がしたい。住民の目線で', label: '旅行プラン', topic: 'travel' },
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
      <span className="absolute -top-3 left-[18px] rounded-full bg-neutral-900 px-3 py-[3px] text-[9.5px] font-semibold tracking-[0.12em] text-white">
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
        <div className="mx-auto grid max-w-[1080px] items-center gap-[52px] lg:grid-cols-[1.04fr_.96fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-500/50 bg-white/10 px-4 py-[5px] text-[12.5px] font-bold text-primary-500">
              <i className="h-[7px] w-[7px] rounded-full bg-primary-500 not-italic" aria-hidden />
              居住認証つき・海外在住日本人への相談サービス
            </span>
            <h1 className="mt-[22px] text-[clamp(31px,4.8vw,52px)] font-black leading-[1.3] tracking-[-0.03em] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.35)]">
              海外のことは、
              <br />
              <span className="text-primary-500">現地にいる人</span>と。
            </h1>
            <p className="mt-[22px] max-w-[30em] text-[16px] leading-[2.1] text-white/85">
              移住、留学、駐在準備、こだわりの旅行。ひとりで検索し続けるのは、今日でおしまい。
              <b className="font-bold text-white">いまその街で暮らす日本人</b>
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
            <div className="mt-[30px] flex items-center gap-3.5">
              <span className="flex" aria-hidden>
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
              <p className="text-[13.5px] leading-[1.8] text-white/80">
                <b className="font-bold text-white">パリからバンコクまで。</b>
                世界の街の「先輩」が、全員・居住認証済みで待っています。
              </p>
            </div>
          </div>

          {/* プレイヤーカード。text-foreground 明示でヒーロー白文字の継承を遮断 */}
          <div
            className="rounded-[20px] border border-border bg-card p-4 pb-3.5 text-foreground shadow-lg"
            aria-hidden
          >
            <div className="flex items-center gap-1.5 px-1 pb-3">
              <i className="h-[9px] w-[9px] rounded-full bg-border-strong not-italic" />
              <i className="h-[9px] w-[9px] rounded-full bg-border-strong not-italic" />
              <i className="h-[9px] w-[9px] rounded-full bg-border-strong not-italic" />
              <span className="ml-2 text-[10.5px] text-neutral-500">locore.app</span>
              <span className="ml-auto inline-flex items-center gap-[5px] rounded-full bg-primary-100 px-[9px] py-0.5 text-[9.5px] font-semibold text-primary-900">
                <b className="h-1.5 w-1.5 rounded-full bg-primary-700" />
                相談中
              </span>
            </div>
            <div className="rounded-[14px] border border-border bg-card px-[15px] py-[13px] shadow-xs">
              <div className="flex items-center gap-[11px]">
                <PhotoAva src="/experts/aya.jpg" size="h-11 w-11" />
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-[14px] font-bold">
                    佐々木 彩
                    <VBadge />
                  </div>
                  <div className="mt-0.5 text-[12px] text-neutral-500">
                    🇫🇷 パリ在住 8年 ・ 輸入雑貨会社 経営
                  </div>
                </div>
                <div className="ml-auto text-right leading-[1.3]">
                  <b className="block text-[15px] font-bold tabular-nums">¥4,000</b>
                  <span className="text-[10px] text-neutral-500">/ 30分〜</span>
                </div>
              </div>
            </div>
            <div className="mt-2.5 flex flex-col gap-2 text-[12.5px] leading-[1.8]">
              <div className="max-w-[88%] self-end rounded-[14px] rounded-br-[5px] bg-neutral-900 px-[13px] py-[9px] text-white">
                来月からパリ駐在が決まりました。子連れで住むエリアの「実際のところ」を教えてほしいです…!
              </div>
              <div className="max-w-[88%] self-start rounded-[14px] rounded-bl-[5px] border border-primary-100 bg-primary-50 px-[13px] py-[9px] text-foreground">
                もちろんです。お子さんの年齢と職場の場所を教えてください。候補を3つに絞りましょう。
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

      {/* ===== 居住認証（ダーク帯） ===== */}
      <section className="about-trust-bg px-6 pb-[84px] pt-[76px] text-white">
        <div className="mx-auto max-w-[1080px]">
          <Kicker dark>Trust — Locoreの核</Kicker>
          <h2 className="mt-5 text-[clamp(25px,3.6vw,38px)] font-black leading-[1.4] tracking-[-0.028em] text-white">
            誰でもは、載れません。
            <br />
            <b className="font-black text-primary-500">居住認証</b>という関門。
          </h2>
          <p className="mt-3.5 max-w-[38em] text-[15.5px] leading-[2.05] text-white/75">
            SNSで見つけた「現地在住」は、本当にいまその街に住んでいるでしょうか。Locoreに掲載される全エキスパートは、現地の居住実態を書類で確認済みです。
          </p>
          <div className="mt-10 grid items-center gap-9 lg:grid-cols-[1.04fr_.96fr] lg:gap-14">
            {/* 3ステップ縦タイムライン（丸数字 + 縦ライン） */}
            <div className="flex flex-col">
              {[
                {
                  n: 1,
                  t: '居住を証明する書類の提出',
                  p: '現地の滞在許可証・公共料金の請求書・賃貸契約書など、「いま住んでいる」ことを示す書類を提出。',
                  gate: null,
                },
                {
                  n: 2,
                  t: '運営による審査',
                  p: '書類と申告内容（都市・在住年数）を運営が照合します。',
                  gate: '基準を満たさなければ、掲載されません',
                },
                {
                  n: 3,
                  t: '認証バッジの付与',
                  p: '通過した人だけに「居住認証済み」バッジ。相談後の公開レビューと合わせて、信頼の目印に。',
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
                      {s.gate ? (
                        <span className="mt-2.5 inline-flex rounded-full border border-primary-500/50 px-3.5 py-[3px] text-[11.5px] font-extrabold text-primary-500">
                          {s.gate}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {/* 白カード。text-foreground 明示 */}
            <div className="rounded-[22px] bg-card px-8 py-[34px] text-center text-foreground shadow-[0_26px_60px_-20px_rgba(0,0,0,0.5)]">
              <div className="mx-auto mb-4 grid h-[84px] w-[84px] place-items-center rounded-full border-[1.5px] border-primary-200 bg-primary-50 text-primary-700">
                <ShieldCheck className="h-10 w-10" strokeWidth={1.8} aria-hidden />
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-300 bg-primary-100 px-[18px] py-1.5 text-[13.5px] font-bold text-primary-900">
                <ShieldCheck className="h-[13px] w-[13px]" aria-hidden />
                居住認証済み
              </span>
              <p className="mt-[15px] text-[14px] leading-[2] text-neutral-500">
                このバッジは、運営が書類で居住実態を確認したエキスパートだけのもの。「行ったことがある」ではなく、
                <b className="font-bold text-foreground">「いま住んでいる」</b>
                人の言葉です。
              </p>
              <div className="mt-5 border-t border-dashed border-border-strong pt-4 text-left">
                <div className="mb-2.5 text-[9.5px] tracking-[0.12em] text-neutral-500">
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
          <div className="mx-auto mb-[26px] mt-10 flex max-w-[720px] items-center gap-[18px] rounded-[18px] border-[1.5px] border-primary-300 bg-card px-[26px] py-5 shadow-sm max-sm:items-start">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary-500 text-[16px] font-extrabold tabular-nums text-neutral-950">
              ¥0
            </span>
            <div>
              <b className="text-[16px] font-extrabold">予約前のチャット相談は、無料。</b>
              <p className="mt-[3px] text-[13.5px] leading-[1.9] text-neutral-500">
                エキスパート探しも、読みものも、申し込む前の質問も無料。合わなければ、やめてOK。
              </p>
            </div>
          </div>
          <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative flex flex-col rounded-[18px] border-[1.5px] border-primary-500 bg-card px-[26px] py-7 shadow-md">
              <span className="absolute right-[18px] top-[18px] rounded-full border border-primary-300 bg-primary-100 px-[13px] py-[3px] text-[11px] font-extrabold text-primary-900">
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
                <PriceLi>移住・駐在の全体設計など、腰を据えた相談に</PriceLi>
                <PriceLi>「渡航までのやること」を時系列で一緒に整理</PriceLi>
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
              theme="移住"
              title="パリ移住のビザ、どれで行く？"
              before="ビザの種類が多すぎて、1か月調べても決められない。"
              after="自分の職歴・予算なら現実的な選択肢は2つ。必要書類と申請の順番までメモが残る。"
            />
            <OutcomeCard
              theme="子育て・教育"
              title="現地校の見学、何を見ればいい？"
              before="学校のWebサイトを眺めても、違いが分からない。"
              after="子連れ移住の先輩から「見学で必ず確認する5点」と学区の実情を聞き、候補が3校に絞れる。"
            />
            <OutcomeCard
              theme="住まい"
              title="保証人なしの家探し、詰まない段取り"
              before="内見の申し込みが全部スルーされる。理由も分からない。"
              after="書類（ドシエ）の作り方と保証人サービスの現実的な使い方が分かり、次の一手が決まる。"
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
            <FaqItem q="「居住認証」は何を確認しているのですか？">
              現地の滞在許可証・公共料金の請求書・賃貸契約書などの書類で、
              <b>「いま、その街に実際に住んでいる」こと</b>
              を運営が確認しています。経歴や肩書きの審査ではなく、居住実態の審査です。確認済みのエキスパートだけにバッジが表示されます。
            </FaqItem>
            <FaqItem q="無料でできることはありますか？">
              会員登録・エキスパート探し・記事（読みもの）・
              <b>申し込み前のチャットでの質問</b>
              まで、すべて無料です。有料になるのは相談メニューを申し込んでからです。
            </FaqItem>
            <FaqItem q="どんなことを相談できますか？">
              移住・留学・駐在準備の段取り、住むエリア選び、生活の手続き、子育てや学校、仕事や起業、こだわりの旅行プランまで。各エキスパートの「こんな相談に乗れます」を見て選んでください。医療・法律・税務など資格が必要な業務のアドバイスは対象外です（経験談としてのお話は可能です）。
            </FaqItem>
            <FaqItem q="エキスパートは海外在住。時差は大丈夫？">
              空き枠も確定日時も<b>すべて日本時間で表示</b>
              されるので、時差の計算は不要です。エキスパート側には現地時間で表示され、換算はLocoreが自動で行います。多くのエキスパートが日本時間の夜・週末に枠を設定しています。
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
