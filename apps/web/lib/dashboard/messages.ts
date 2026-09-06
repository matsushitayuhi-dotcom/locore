import type { ExpertMetrics } from '@/lib/dashboard/metrics';
import type { MilestoneState } from '@/lib/dashboard/milestones';

/**
 * ダッシュボードに出す文言のマスタと表示ロジック。docs/expert-dashboard-design.md §4。
 *
 * 設計:
 *   - 文言は「スロット」ごとに候補（ルール）を並べ、条件を満たすもののうち優先度が最も高い 1 本を出す
 *   - 数字は必ず「比較」か「次の一手」を添える。悪い数字は責めず、伸びしろで言う
 *   - 文言はここに集約する（コンポーネントに直書きしない）。追加はルールを 1 行足すだけ
 *
 * スロット:
 *   greeting   ヘッダーのあいさつ（時間帯）
 *   summary    ヘッダー下の要約 1 行
 *   todo.*     「今やること」各カードの補足（requests / messages / slots / profile）
 *   goal       「今月の目標」の本文
 *   next_step  マイルストーンの「次の一歩」
 *   empty      予約ゼロ・データが薄いときの励まし
 */

export type MessageContext = {
  m: ExpertMetrics;
  displayName: string;
  /** 日本時間の時（0-23） */
  hourJst: number;
  /** プロフィール完成度（0-100）と未完了の代表項目 */
  completeness: { percent: number; missingLabel: string | null; missingHref: string };
  milestones: MilestoneState[];
  next: MilestoneState | null;
  /** 今月の残り日数（今日を含む） */
  daysLeft: number;
};

export type Rule = {
  id: string;
  /** 大きいほど優先 */
  priority: number;
  when: (c: MessageContext) => boolean;
  text: (c: MessageContext) => string;
};

const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`;
const h = (hours: number) => (hours < 1 ? `${Math.max(1, Math.round(hours * 60))} 分` : hours < 48 ? `${Math.round(hours)} 時間` : `${Math.round(hours / 24)} 日`);

/** 文言マスタ。スロットごとにルールを priority の高い順に評価し、最初に when を満たしたものを出す */
export const MESSAGE_RULES: Record<string, Rule[]> = {
  greeting: [
    { id: 'morning', priority: 1, when: (c) => c.hourJst >= 5 && c.hourJst < 11, text: (c) => `おはようございます、${c.displayName}さん` },
    { id: 'evening', priority: 1, when: (c) => c.hourJst >= 18 || c.hourJst < 5, text: (c) => `こんばんは、${c.displayName}さん` },
    { id: 'day', priority: 0, when: () => true, text: (c) => `こんにちは、${c.displayName}さん` },
  ],
  summary: [
    {
      id: 'unpublished',
      priority: 100,
      when: (c) => !c.m.profilePublished,
      text: (c) =>
        c.completeness.missingLabel
          ? `プロフィールはまだ非公開です。「${c.completeness.missingLabel}」を埋めると公開できます。`
          : 'プロフィールはまだ非公開です。公開ステータスから公開できます。',
    },
    {
      id: 'pending_old',
      priority: 90,
      when: (c) => c.m.todo.pendingRequests > 0 && (c.m.todo.oldestPendingHours ?? 0) >= 24,
      text: (c) => `${h(c.m.todo.oldestPendingHours ?? 0)}前のリクエストに返答がありません。早い返答ほど成約率が上がります。`,
    },
    {
      id: 'pending',
      priority: 80,
      when: (c) => c.m.todo.pendingRequests > 0,
      text: (c) => `未返答のリクエストが ${c.m.todo.pendingRequests} 件。今週の予定は ${c.m.todo.upcoming7d} 件です。`,
    },
    {
      id: 'views_up',
      priority: 60,
      when: (c) => c.m.month.viewsPrevSame > 0 && c.m.month.views > c.m.month.viewsPrevSame * 1.2,
      text: (c) => `今週は相談 ${c.m.todo.upcoming7d} 件。プロフィールは先月同期より ${Math.round((c.m.month.views / c.m.month.viewsPrevSame - 1) * 100)}% 多く見られています。`,
    },
    {
      id: 'no_slots',
      priority: 55,
      when: (c) => c.m.todo.openSlots7d === 0,
      text: () => '今週の空き枠がありません。空き枠を出しておくと一覧で「直近の空き」が表示され、予約されやすくなります。',
    },
    {
      id: 'goal_progress',
      priority: 50,
      when: (c) => c.m.goal != null && c.m.goal > 0,
      text: (c) => `今月は相談 ${c.m.month.bookings} 件（目標 ${c.m.goal} 件）。残り ${c.daysLeft} 日です。`,
    },
    {
      id: 'first_steps',
      priority: 40,
      when: (c) => c.m.total.bookings === 0,
      text: (c) => (c.m.total.favorites > 0 ? `お気に入りに入れた人が ${c.m.total.favorites} 人います。空き枠と自己紹介を整えて、最初の相談を待ちましょう。` : '公開直後は閲覧が集まる時期です。自己紹介と得意分野を仕上げて、最初の相談につなげましょう。'),
    },
    { id: 'default', priority: 0, when: () => true, text: (c) => `今週の予定は ${c.m.todo.upcoming7d} 件。今月の相談は ${c.m.month.bookings} 件です。` },
  ],
  'todo.requests': [
    { id: 'old', priority: 10, when: (c) => (c.m.todo.oldestPendingHours ?? 0) >= 24, text: (c) => `最古 ${h(c.m.todo.oldestPendingHours ?? 0)}前 ・ 相談者が待っています` },
    { id: 'some', priority: 5, when: (c) => c.m.todo.pendingRequests > 0, text: (c) => `最古 ${h(c.m.todo.oldestPendingHours ?? 0)}前 ・ 24 時間以内に返答を` },
    { id: 'none', priority: 0, when: () => true, text: () => '未返答はありません' },
  ],
  'todo.messages': [
    { id: 'some', priority: 5, when: (c) => c.m.todo.unreadMessages > 0, text: () => '事前質問には早めの返信を' },
    { id: 'none', priority: 0, when: () => true, text: () => '未読はありません' },
  ],
  'todo.slots': [
    { id: 'zero', priority: 10, when: (c) => c.m.todo.openSlots7d === 0, text: () => '空き枠なし。一覧の「直近の空き」に出ません' },
    { id: 'few', priority: 5, when: (c) => c.m.todo.openSlots7d < 5, text: () => '少なめ。空き枠が多いほど予約されやすい' },
    { id: 'ok', priority: 0, when: () => true, text: (c) => `今週の予定 ${c.m.todo.upcoming7d} 件` },
  ],
  'todo.profile': [
    { id: 'missing', priority: 5, when: (c) => !!c.completeness.missingLabel, text: (c) => `${c.completeness.missingLabel}（完成度 ${c.completeness.percent}%）` },
    { id: 'done', priority: 0, when: () => true, text: () => 'プロフィールは完成しています' },
  ],
  goal: [
    {
      id: 'no_goal',
      priority: 100,
      when: (c) => c.m.goal == null || c.m.goal <= 0,
      text: (c) => (c.m.month.bookingsPrevSame > 0 ? `先月の同じ時期は ${c.m.month.bookingsPrevSame} 件でした。今月の目標を決めると、達成見込みと打ち手を出します。` : '今月の目標を決めると、達成見込みと打ち手をここに出します。まずは 3 件から。'),
    },
    {
      id: 'achieved',
      priority: 90,
      when: (c) => c.m.goal != null && c.m.month.bookings >= c.m.goal,
      text: (c) => `目標達成です。残り ${c.daysLeft} 日でさらに ${Math.max(1, Math.ceil((c.m.goal ?? 0) * 0.3))} 件伸ばせると、来月の目標を上げられます。`,
    },
    {
      id: 'on_track',
      priority: 50,
      when: (c) => {
        const g = c.m.goal ?? 0;
        const elapsed = 30 - c.daysLeft + 1;
        return g > 0 && c.m.month.bookings / Math.max(1, elapsed) * 30 >= g;
      },
      text: (c) => {
        const g = c.m.goal ?? 0;
        const elapsed = 30 - c.daysLeft + 1;
        const eta = Math.ceil((g - c.m.month.bookings) / Math.max(0.01, c.m.month.bookings / Math.max(1, elapsed)));
        return `このペースなら約 ${Math.max(1, eta)} 日後に達成見込みです。空き枠を増やすと前倒しできます。`;
      },
    },
    {
      id: 'behind',
      priority: 10,
      when: (c) => (c.m.goal ?? 0) > 0,
      text: (c) => {
        const remain = (c.m.goal ?? 0) - c.m.month.bookings;
        const perWeek = Math.ceil(remain / Math.max(1, c.daysLeft / 7));
        return c.m.todo.openSlots7d < 5
          ? `あと ${remain} 件。週に ${perWeek} 件のペースが必要です。今週の空き枠 ${c.m.todo.openSlots7d} → 6 以上にすると予約されやすくなります。`
          : `あと ${remain} 件。週に ${perWeek} 件のペースが必要です。得意分野や相談メニューの見出しを見直すと閲覧からの予約が増えます。`;
      },
    },
  ],
  next_step: [
    { id: 'all_done', priority: 100, when: (c) => c.next == null, text: () => 'マイルストーンはすべて達成しています。次の目標は相談 100 件です。' },
    {
      id: 'fast_reply',
      priority: 50,
      when: (c) => c.next?.code === 'fast_reply_10',
      text: (c) => `返答 24 時間以内をあと ${c.next!.remaining} 回続けると「返答が早い」バッジが公開プロフィールに付きます。`,
    },
    {
      id: 'favorites',
      priority: 50,
      when: (c) => c.next?.code === 'favorites_50',
      text: (c) => `お気に入り登録があと ${c.next!.remaining} 人。発信・メディアに動画や記事を載せると登録が増えやすくなります。`,
    },
    {
      id: 'first_plan',
      priority: 50,
      when: (c) => c.next?.code === 'first_plan',
      text: () => '継続プランを 1 本出品すると、出願まで伴走したい相談者に選ばれやすくなります。',
    },
    { id: 'verified', priority: 50, when: (c) => c.next?.code === 'verified', text: () => '在籍確認を出すと「在籍確認済み」バッジが付き、一覧での信頼度が上がります。' },
    { id: 'generic', priority: 0, when: (c) => c.next != null, text: (c) => `「${c.next!.label}」まであと ${c.next!.remaining} ${c.next!.unit}。` },
  ],
  empty: [
    { id: 'no_data', priority: 0, when: () => true, text: () => '最初の相談が入ると、ここに数字と推移が出ます。' },
  ],
};

/** スロットの文言を 1 本選ぶ。該当なしは空文字 */
export function pickMessage(slot: keyof typeof MESSAGE_RULES | string, c: MessageContext): string {
  const rules = MESSAGE_RULES[slot] ?? [];
  const hit = [...rules].sort((a, b) => b.priority - a.priority).find((r) => r.when(c));
  return hit ? hit.text(c) : '';
}

/** 表示に使う文言をまとめて解決（コンポーネントはこれだけ受け取る） */
export function resolveMessages(c: MessageContext) {
  return {
    greeting: pickMessage('greeting', c),
    summary: pickMessage('summary', c),
    todo: {
      requests: pickMessage('todo.requests', c),
      messages: pickMessage('todo.messages', c),
      slots: pickMessage('todo.slots', c),
      profile: pickMessage('todo.profile', c),
    },
    goal: pickMessage('goal', c),
    nextStep: pickMessage('next_step', c),
    empty: pickMessage('empty', c),
  };
}

export { yen };
