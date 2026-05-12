'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createBoardPost } from '@/lib/board/actions';

/**
 * 編集チームが掲示板に投稿するフォーム（manual ソース）。
 *
 * 必須: title / body
 * 任意: 開催日 / 場所
 *
 * 参照元 URL は今は省略（後で UI 追加。Supabase Studio で直接編集可）。
 */
export function BoardPostForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    const b = body.trim();
    if (t.length < 2) {
      toast.error('タイトルは 2 文字以上にしてください');
      return;
    }
    if (b.length < 1) {
      toast.error('本文を入力してください');
      return;
    }
    startTransition(async () => {
      const res = await createBoardPost({
        title: t,
        body: b,
        eventDate: eventDate || null,
        eventLocation: eventLocation.trim() || null,
      });
      if (res.ok && res.data) {
        toast.success('投稿を公開しました');
        setTitle('');
        setBody('');
        setEventDate('');
        setEventLocation('');
        router.refresh();
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label
          htmlFor="bp-title"
          className="mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/55"
        >
          タイトル
          <span className="ml-1 text-danger-500">*</span>
        </label>
        <input
          id="bp-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={140}
          placeholder="例: 今週末、République 広場でクリエイターズマルシェ"
          className="h-10 w-full rounded-md border border-border bg-card px-3 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="bp-body"
          className="mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/55"
        >
          本文（Markdown 可）
          <span className="ml-1 text-danger-500">*</span>
        </label>
        <textarea
          id="bp-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={8000}
          rows={8}
          placeholder={
            'マルシェの概要、目玉、行き方など。\n\n## 見どころ\n- フランス各地の作家 30 組\n- ローカル DJ\n\n## アクセス\nMetro 3/5/8/9/11 line、République 駅すぐ。'
          }
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-[13px] leading-relaxed focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="bp-date"
            className="mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/55"
          >
            開催日（任意）
          </label>
          <input
            id="bp-date"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="bp-loc"
            className="mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/55"
          >
            場所（任意）
          </label>
          <input
            id="bp-loc"
            type="text"
            value={eventLocation}
            onChange={(e) => setEventLocation(e.target.value)}
            maxLength={140}
            placeholder="例: Place de la République"
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary-500 px-4 py-2 text-[13px] font-bold text-neutral-950 transition hover:bg-primary-300 disabled:opacity-50"
        >
          {isPending ? '投稿中…' : '公開する'}
        </button>
      </div>
    </form>
  );
}
