'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { setMonthlyGoal } from './actions';

/**
 * 「今月の目標」カード（client）。目標の編集はインライン。文言は messages.ts が解決したものを受け取る。
 */
export function GoalCard({
  goal,
  bookings,
  daysLeft,
  message,
  suggestSlots,
}: {
  goal: number | null;
  bookings: number;
  daysLeft: number;
  message: string;
  /** 空き枠が少ないときは「空き枠を追加する」を主ボタンに */
  suggestSlots: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(goal == null);
  const [draft, setDraft] = useState(goal ?? 3);
  const [pending, start] = useTransition();
  const pct = goal ? Math.min(100, Math.round((bookings / goal) * 100)) : 0;

  const save = () => {
    start(async () => {
      const res = await setMonthlyGoal({ goal: draft });
      if (res.ok) {
        toast.success(draft > 0 ? `今月の目標を ${draft} 件にしました` : '目標を外しました');
        setEditing(false);
        router.refresh();
      } else toast.error(res.error);
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-baseline gap-3">
        <h2 className="text-[15px] font-bold">今月の目標</h2>
        {!editing && goal != null ? (
          <button type="button" onClick={() => setEditing(true)} className="text-[11.5px] text-neutral-500 underline underline-offset-4 hover:text-foreground">
            目標を変える
          </button>
        ) : null}
      </div>
      {editing ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 text-[13px]">
            今月の相談
            <input
              type="number"
              min={0}
              max={200}
              value={draft}
              onChange={(e) => setDraft(Number(e.target.value))}
              className="h-10 w-20 rounded-md border border-border bg-background px-2 text-center text-[15px] font-bold tabular-nums focus:border-2 focus:border-primary-500 focus:outline-none"
            />
            件
          </label>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-full bg-neutral-900 px-4 py-2 text-[12.5px] font-bold text-white transition hover:bg-neutral-700 disabled:opacity-60"
          >
            {pending ? '保存中…' : '目標にする'}
          </button>
          {goal != null ? (
            <button type="button" onClick={() => setEditing(false)} className="text-[12px] text-neutral-500 hover:text-foreground">
              キャンセル
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <b className="text-[32px] leading-none tracking-[-0.02em] tabular-nums">{bookings}</b>
            <span className="text-[13px] text-neutral-500">/ {goal} 件の相談</span>
            <span className="ml-auto text-[12px] text-neutral-500">
              {goal != null && bookings >= goal ? '達成' : `あと ${Math.max(0, (goal ?? 0) - bookings)} 件 ・ 残り ${daysLeft} 日`}
            </span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-to-r from-primary-700 to-primary-500 transition-[width]" style={{ width: `${pct}%` }} />
          </div>
        </>
      )}
      <p className="mt-3 text-[12.5px] leading-[1.7] text-neutral-700">{message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {suggestSlots ? (
          <Link href="/settings/availability" className="rounded-full bg-neutral-900 px-4 py-2 text-[12.5px] font-bold text-white transition hover:bg-neutral-700">
            空き枠を追加する
          </Link>
        ) : (
          <Link href="/settings/services" className="rounded-full border border-border-strong bg-card px-4 py-2 text-[12.5px] font-bold transition hover:border-foreground">
            相談メニューを見直す
          </Link>
        )}
      </div>
    </div>
  );
}
