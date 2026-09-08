import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowUpRight, ExternalLink } from 'lucide-react';
import { requireUser } from '@/lib/auth/require-user';
import { getMyUnreadChatSummary } from '@/lib/chat/unread';
import { getProfileCompleteness } from '@/lib/experts/completeness';
import { deriveEnrollment } from '@/lib/experts/enrollment';
import { getExpertMetrics, hasConsultationMenu, type DailyPoint } from '@/lib/dashboard/metrics';
import { nextMilestone, syncMilestones } from '@/lib/dashboard/milestones';
import { resolveMessages, yen, type MessageContext } from '@/lib/dashboard/messages';
import { getDb } from '@/lib/db/client';
import { schema } from '@locore/db';
import { eq } from 'drizzle-orm';
import { DashboardNav } from './DashboardNav';
import { GoalCard } from './GoalCard';
import { MilestoneToast } from './MilestoneToast';

/**
 * /dashboard — エキスパートのマイページ（docs/expert-dashboard-design.md）。
 * 上から: 今やること → 今月の数字 → 今月の目標 / マイルストーン → 予定 / レビュー。
 * 文言は lib/dashboard/messages.ts（マスタ＋表示ロジック）、指標は metrics.ts、達成は milestones.ts。
 */

export const metadata = { title: 'ダッシュボード' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const me = await requireUser('/dashboard');
  const isWriter = me.role === 'resident_writer' || me.role === 'editor';
  const displayName = me.displayName ?? 'エキスパート';
  if (!isWriter) redirect('/become-writer');

  const [unread, completeness, hasMenu, profileRow] = await Promise.all([
    getMyUnreadChatSummary(),
    getProfileCompleteness(me.id),
    hasConsultationMenu(me.id),
    getDb()
      .select({ education: schema.users.education, avatarUrl: schema.users.avatarUrl })
      .from(schema.users)
      .where(eq(schema.users.id, me.id))
      .limit(1)
      .then((r) => r[0] ?? null)
      .catch(() => null),
  ]);
  const m = await getExpertMetrics(me.id, { unreadMessages: unread.count });
  const milestones = await syncMilestones(me.id, m);
  const next = nextMilestone(milestones);

  // 未完了の代表項目（必須 → 推奨の順）と行き先
  const sectionHref: Record<string, string> = {
    profile: '/settings/profile',
    services: '/settings/services',
    availability: '/settings/availability',
    verification: '/settings/verification',
  };
  let missingLabel: string | null = null;
  let missingHref = '/settings/profile';
  for (const key of ['profile', 'services', 'availability', 'verification'] as const) {
    const item = completeness.sections[key].items.find((i) => !i.done);
    if (item) {
      missingLabel = item.label;
      missingHref = sectionHref[key]!;
      break;
    }
  }

  const nowJst = new Date(Date.now() + 9 * 3600_000);
  const hourJst = nowJst.getUTCHours();
  const daysInMonth = new Date(Date.UTC(nowJst.getUTCFullYear(), nowJst.getUTCMonth() + 1, 0)).getUTCDate();
  const daysLeft = daysInMonth - nowJst.getUTCDate() + 1;

  const ctx: MessageContext = {
    m,
    displayName,
    hourJst,
    completeness: { percent: completeness.percent, missingLabel, missingHref },
    milestones,
    next,
    daysLeft,
  };
  const msg = resolveMessages(ctx);
  const enrollment = deriveEnrollment(profileRow?.education ?? []);
  const subtitle = enrollment ? `${enrollment.school} ・ ${enrollment.status === 'current' ? '在学中' : 'アルムナイ'}` : null;
  const justAchieved = milestones.filter((s) => s.justAchieved).map((s) => s.label);
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b - 1) * 100) : null);
  const monthLabel = `${nowJst.getUTCMonth() + 1} 月 1 日〜今日`;
  const fmtJst = (iso: string) => {
    const d = new Date(new Date(iso).getTime() + 9 * 3600_000);
    const w = ['日', '月', '火', '水', '木', '金', '土'][d.getUTCDay()];
    return { md: `${d.getUTCMonth() + 1}/${d.getUTCDate()}`, sub: `${w} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}` };
  };

  return (
    <main className="bg-background text-foreground">
      <MilestoneToast labels={justAchieved} />
      <div className="mx-auto max-w-[1180px] px-5 py-8 sm:px-10 sm:py-10">
        <div className="grid gap-8 md:grid-cols-[200px_1fr]">
          <DashboardNav
            displayName={displayName}
            subtitle={subtitle}
            avatarUrl={profileRow?.avatarUrl ?? me.avatarUrl ?? null}
            pendingRequests={m.todo.pendingRequests}
            unreadMessages={m.todo.unreadMessages}
          />

          <div className="min-w-0">
            {/* ===== ヘッダー ===== */}
            {/* flex-1 は flex-basis 0 なので、min-w を与えないと右側に押されて
                挨拶（22px）が 74px 幅の 4 行まで潰れる。入り切らないときは右側を次の行へ。
                md 幅（右カラム 456px）では折り返さず 1 行だったので、引き金は max-sm: に限定する。 */}
            <header className="flex flex-wrap items-start gap-3">
              <div className="flex-1 max-sm:min-w-[15rem]">
                <h1 className="text-[22px] font-semibold tracking-[-0.01em] sm:text-[24px]">{msg.greeting}</h1>
                <p className="mt-1 text-[13px] leading-[1.7] text-neutral-500">{msg.summary}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={
                    // 隣のリンクをスマホで 38px に上げるので、並びが揃うようバッジも同じ高さにする（PC は据え置き）
                    'shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-bold max-sm:py-2.5 ' +
                    (m.profilePublished ? 'border-primary-500 bg-primary-100 text-primary-900' : 'border-border-strong bg-card text-neutral-600')
                  }
                >
                  {m.profilePublished ? '● 公開中' : '○ 非公開'}
                </span>
                {/* py-1.5 だと実高さ 30px でタップ領域 36px に届かないので、スマホだけ縦を足す（幅は変わらない） */}
                <Link
                  href={`/experts/${me.id}`}
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border-strong bg-card px-3.5 py-1.5 text-[12px] font-bold transition hover:border-foreground max-sm:py-2.5"
                >
                  {/* 320px では「公開中」バッジと並べると右の塊が 272px になり収まらないので「を見る」を省く */}
                  公開プロフィール<span className="max-sm:hidden">を見る</span> <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                </Link>
              </div>
            </header>

            {!hasMenu ? (
              <div className="mt-5 rounded-2xl border border-dashed border-border bg-card p-5 text-[13px] text-neutral-700">
                相談メニューがまだありません。
                <Link href="/settings/services" className="ml-1 font-bold underline underline-offset-4">
                  相談メニューを作る
                </Link>{' '}
                と、一覧に出て予約を受けられます。
              </div>
            ) : null}

            {/* ===== 1. 今やること ===== */}
            <Section title="今やること" hint="返答が早いほど成約率が上がります">
              <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                <TodoCard n={m.todo.pendingRequests} label="未返答の相談リクエスト" hint={msg.todo.requests} href="/bookings?tab=received" tone={m.todo.pendingRequests > 0 ? 'hot' : 'normal'} />
                <TodoCard n={m.todo.unreadMessages} label="未読メッセージ" hint={msg.todo.messages} href="/chat" tone="normal" />
                <TodoCard n={m.todo.openSlots7d} label="今週の空き枠" hint={msg.todo.slots} href="/settings/availability" tone={m.todo.openSlots7d < 5 ? 'warn' : 'normal'} />
                <TodoCard n={completeness.percent} suffix="%" label="プロフィール完成度" hint={msg.todo.profile} href={missingHref} tone={completeness.percent < 100 ? 'normal' : 'done'} />
              </div>
            </Section>

            {/* ===== 2. 今月の数字 ===== */}
            <Section title="今月の数字" hint={`${monthLabel} ・ 先月同期間比`}>
              <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                <KpiCard label="相談件数（確定）" value={String(m.month.bookings)} suffix="件" delta={m.month.bookings - m.month.bookingsPrevSame} deltaNote={`先月同期 ${m.month.bookingsPrevSame} 件`} series={m.series30d.bookings} />
                <KpiCard
                  label="売上"
                  value={yen(m.month.revenueConfirmedJpy + m.month.revenueExpectedJpy)}
                  delta={m.month.revenueConfirmedJpy + m.month.revenueExpectedJpy - m.month.revenuePrevSameJpy}
                  deltaFmt={(d) => yen(Math.abs(d))}
                  deltaNote={`確定 ${yen(m.month.revenueConfirmedJpy)} ・ 見込み ${yen(m.month.revenueExpectedJpy)}`}
                  series={m.series30d.revenue}
                />
                <KpiCard
                  label="プロフィール閲覧"
                  value={String(m.month.views)}
                  suffix="回"
                  delta={m.month.views - m.month.viewsPrevSame}
                  deltaFmt={(d) => {
                    const p = pct(m.month.views, m.month.viewsPrevSame);
                    return p != null ? `${Math.abs(p)}%` : String(Math.abs(d));
                  }}
                  deltaNote={m.month.viewsPrevSame > 0 ? `先月同期 ${m.month.viewsPrevSame} 回` : '計測を始めました'}
                  series={m.series30d.views}
                />
                <KpiCard
                  label="お気に入り登録"
                  value={String(m.total.favorites)}
                  suffix="人"
                  delta={m.month.favorites - m.month.favoritesPrevSame}
                  deltaNote={m.month.views > 0 ? `今月 +${m.month.favorites} ・ 閲覧→お気に入り ${Math.round((m.month.favorites / m.month.views) * 1000) / 10}%` : `今月 +${m.month.favorites}`}
                  series={m.series30d.favorites}
                />
              </div>
              <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
                <StatNote
                  head={m.total.avgStars != null ? `★ ${m.total.avgStars}` : '★ —'}
                  sub={m.total.reviews > 0 ? `レビュー平均（${m.total.reviews} 件）${m.total.recentAllFive ? '。直近はすべて ★5' : ''}` : 'まだレビューはありません'}
                />
                <StatNote
                  head={m.total.avgResponseHours != null ? `${m.total.avgResponseHours} 時間` : '—'}
                  sub={
                    m.total.avgResponseHours == null
                      ? 'リクエストへの平均返答時間（まだ返答がありません）'
                      : m.peers.medianResponseHours != null
                        ? `平均返答時間。同じ国のエキスパート中央値 ${m.peers.medianResponseHours} 時間`
                        : '平均返答時間'
                  }
                />
                <StatNote head={m.total.acceptRate != null ? `${m.total.acceptRate}%` : '—'} sub={m.total.acceptRate != null ? `承諾率。辞退 ${m.total.declined} 件` : '承諾率（まだリクエストがありません）'} />
              </div>
            </Section>

            {/* ===== 3. 目標とマイルストーン ===== */}
            <div className="mt-7 grid gap-3 lg:grid-cols-[1.35fr_1fr]">
              <GoalCard goal={m.goal} bookings={m.month.bookings} daysLeft={daysLeft} message={msg.goal} suggestSlots={m.todo.openSlots7d < 5} />
              <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-[15px] font-bold">マイルストーン</h2>
                {/* 402px だと 4 列で 1 枚 56px しか無く、ラベルが折り返す。スマホは 2 列に */}
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {milestones.map((s) => (
                    <div key={s.code} className={'rounded-xl border border-border px-1.5 py-2.5 text-center ' + (s.achieved ? '' : 'opacity-45')}>
                      <div className={'mx-auto mb-1.5 grid h-8 w-8 place-items-center rounded-full text-[12px] font-extrabold ' + (s.achieved ? 'bg-primary-100 text-primary-900' : 'bg-muted text-neutral-500')}>
                        {s.glyph}
                      </div>
                      {/* 10px 未満は実機で読めないので 11px に。2 列なら 402px で 142px 幅あり収まる。
                          PC は 4 列でタイルが 75px しかなく、上げると折り返し行数が変わるので従来のサイズに戻す */}
                      <b className="block text-[11px] leading-tight sm:text-[10.5px]">{s.label}</b>
                      <small className="block text-[11px] text-neutral-500 max-sm:mt-0.5 max-sm:leading-tight sm:text-[9.5px]">
                        {s.achieved ? (s.achievedAt ? fmtJst(s.achievedAt).md : '達成') : s.remaining > 0 ? `あと ${s.remaining}${s.unit}` : '—'}
                      </small>
                    </div>
                  ))}
                </div>
                <p className="mt-3 rounded-lg bg-primary-50 px-3 py-2 text-[12px] leading-[1.7] text-neutral-700">
                  <b className="text-primary-900">次の一歩:</b> {msg.nextStep}
                </p>
              </div>
            </div>

            {/* ===== 4. 予定とレビュー ===== */}
            <div className="mt-7 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
              <div>
                <h2 className="text-[15px] font-bold">
                  これからの予定 <small className="ml-1 text-[12px] font-normal text-neutral-500">日本時間</small>
                </h2>
                {m.upcoming.length === 0 ? (
                  <p className="mt-2 rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center text-[12.5px] text-neutral-500">{msg.empty}</p>
                ) : (
                  <ul className="mt-2 grid gap-2">
                    {m.upcoming.map((b) => {
                      const t = fmtJst(b.startAt);
                      return (
                        <li key={b.id}>
                          <Link href="/bookings" className="grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-[13px] transition hover:border-foreground">
                            <span className="font-extrabold tabular-nums">
                              {t.md}
                              <small className="block whitespace-nowrap text-[11px] font-normal text-neutral-500">{t.sub}</small>
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate">
                                {b.requesterName} さん ・ {b.serviceTitle}（{b.durationMinutes}分）
                              </span>
                              <small className="block text-[11px] text-neutral-500">
                                {[b.hasMessage ? '事前メッセージあり' : null, b.isPlan ? '継続プラン' : null].filter(Boolean).join(' ・ ') || ' '}
                              </small>
                            </span>
                            {/* 402px だと本文に押されて「要/返/答」と縦積みになるので縮ませない。
                                文字サイズを上げると PC でも auto トラックが広がるのでスマホ限定にする */}
                            <span className={'shrink-0 whitespace-nowrap rounded-full px-2 py-[3px] text-[11px] font-bold sm:text-[10.5px] ' + (b.status === 'requested' ? 'bg-amber-100 text-amber-700' : 'bg-muted text-neutral-700')}>
                              {b.status === 'requested' ? '要返答' : '確定'}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="mt-2 text-[11px] text-neutral-400">過去の相談は「予定・履歴」へ。売上の明細と振込は決済導入後にここに出ます。</p>
              </div>
              <div>
                <h2 className="text-[15px] font-bold">最近のレビュー</h2>
                {m.recentReviews.length === 0 ? (
                  <p className="mt-2 rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center text-[12.5px] text-neutral-500">相談のあとに相談者が書いたレビューがここに出ます。</p>
                ) : (
                  <ul className="mt-2 grid gap-2">
                    {m.recentReviews.map((r) => (
                      <li key={r.id} className="rounded-xl border border-border bg-card px-3.5 py-3 text-[13px]">
                        <span className="font-extrabold text-primary-700">{'★'.repeat(r.stars)}</span>
                        <small className="ml-2 text-[11px] text-neutral-500">{fmtJst(r.createdAt).md}</small>
                        {r.body ? <p className="mt-1.5 line-clamp-3 leading-[1.7] text-neutral-700">{r.body}</p> : null}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-[11px] text-neutral-400">レビューは公開プロフィールにもそのまま表示されます。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      {/* 320px だと見出し + 補足で 277px になり、補足（日本語）が 1 文字ずつ潰れる。
          入り切らないときは補足だけ次の行へ落とす（PC は 1 行のままで見た目は変わらない）。 */}
      <h2 className="mb-2.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-[15px] font-bold">
        <span className="shrink-0">{title}</span>
        {hint ? <small className="min-w-0 text-[12px] font-normal text-neutral-500">{hint}</small> : null}
      </h2>
      {children}
    </section>
  );
}

function TodoCard({ n, suffix, label, hint, href, tone }: { n: number; suffix?: string; label: string; hint: string; href: string; tone: 'hot' | 'warn' | 'normal' | 'done' }) {
  const cls =
    tone === 'hot'
      ? 'border-neutral-900 bg-neutral-900 text-white'
      : tone === 'warn'
        ? 'border-amber-400 bg-amber-50'
        : 'border-border bg-card';
  const nCls = tone === 'hot' ? 'text-primary-500' : tone === 'warn' ? 'text-amber-700' : tone === 'done' ? 'text-primary-700' : '';
  return (
    <Link href={href} className={'group block rounded-xl border px-3.5 py-3 transition hover:border-foreground ' + cls}>
      <div className={'text-[26px] font-extrabold leading-none tracking-[-0.02em] tabular-nums ' + nCls}>
        {n}
        {suffix ? <span className="text-[13px] font-bold">{suffix}</span> : null}
      </div>
      <div className="mt-1.5 text-[12px] font-semibold">{label}</div>
      <div className={'mt-0.5 text-[11px] leading-[1.5] ' + (tone === 'hot' ? 'text-white/65' : 'text-neutral-500')}>{hint}</div>
      <ArrowUpRight className={'mt-1 h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100 ' + (tone === 'hot' ? 'text-primary-500' : 'text-neutral-400')} aria-hidden />
    </Link>
  );
}

function KpiCard({ label, value, suffix, delta, deltaFmt, deltaNote, series }: { label: string; value: string; suffix?: string; delta: number; deltaFmt?: (d: number) => string; deltaNote: string; series: DailyPoint[] }) {
  const up = delta > 0;
  const flat = delta === 0;
  const d = deltaFmt ? deltaFmt(delta) : String(Math.abs(delta));
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="text-[11px] font-bold tracking-wide text-neutral-500">{label}</div>
      {/* スマホは 2 列でカード内幅が 144px（320px 幅では 103px）しかなく、¥1,234,567 が 26px だとはみ出す。
          320px は 22px でも 7 桁が入り切らないので、最狭幅だけさらに落とす */}
      <div className="mt-1 text-[22px] font-extrabold leading-none tracking-[-0.02em] tabular-nums max-[359px]:text-[18px] sm:text-[26px]">
        {value}
        {suffix ? <span className="ml-0.5 text-[12px] font-semibold text-neutral-500">{suffix}</span> : null}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-neutral-600">
        {!flat ? <b className={'shrink-0 whitespace-nowrap ' + (up ? 'text-primary-700' : 'text-amber-700')}>{up ? '▲' : '▼'} {d}</b> : <b className="shrink-0 text-neutral-400">±0</b>}
        {/* 差分は縮ませず、補足（日本語）を min-w-0 で次の行に流す */}
        <span className="min-w-0">{deltaNote}</span>
      </div>
      <Sparkline points={series} />
    </div>
  );
}

function Sparkline({ points }: { points: DailyPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  // 30 本のバー。スマホのカード内幅（320px で 103px）だと gap 2px では隙間の方が太くなるので詰める
  return (
    <div className="mt-2 flex h-[26px] items-end gap-[2px] max-sm:gap-[1px]" aria-hidden>
      {points.map((p, i) => (
        <i
          key={p.day}
          className={'block flex-1 rounded-t-[2px] ' + (i === points.length - 1 ? 'bg-primary-500' : p.value > 0 ? 'bg-neutral-300' : 'bg-neutral-100')}
          style={{ height: `${Math.max(8, Math.round((p.value / max) * 100))}%` }}
          title={`${p.day}: ${p.value}`}
        />
      ))}
    </div>
  );
}

function StatNote({ head, sub }: { head: string; sub: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border-strong px-3.5 py-3 text-[12px] text-neutral-700">
      <b className="block text-[15px] text-foreground">{head}</b>
      {sub}
    </div>
  );
}
