'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Info, Video } from 'lucide-react';
import { updateMeetingRoomUrl } from '@/lib/bookings/actions';

/**
 * 「相談の受け方」カード（notifications-slice モック 2/4）。
 * 固定の相談室 URL（users.meeting_room_url）を 1 回登録すれば、
 * 以後の承諾時に自動で相手へ共有される。
 */
export function MeetingRoomCard({ initialUrl }: { initialUrl: string | null }) {
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState(initialUrl ?? '');
  const [savedUrl, setSavedUrl] = useState(initialUrl ?? '');

  const save = () => {
    startTransition(async () => {
      const next = url.trim();
      const res = await updateMeetingRoomUrl({ url: next });
      if (!res.ok) {
        toast.error(res.error ?? '保存に失敗しました');
        return;
      }
      setSavedUrl(next);
      toast.success(
        next === '' ? '相談室のURLを削除しました' : '相談室のURLを保存しました',
      );
    });
  };

  return (
    <div className="mt-5 rounded-2xl border border-border bg-card px-[22px] py-5 shadow-xs">
      <div className="flex items-center gap-2 text-[13.5px] font-bold">
        <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-primary-700">
          Meeting
        </span>
        相談の受け方
      </div>
      <p className="mt-0.5 text-[11.5px] text-neutral-500">
        オンライン相談で使う会議室のリンクを登録しておけます。
      </p>
      <div className="mt-4 text-[12.5px] font-bold text-neutral-700">
        相談室のURL（Google Meet / Zoom など）
      </div>
      <div className="mt-1.5 flex max-w-[560px] gap-2.5">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://meet.google.com/..."
          aria-label="相談室のURL"
          className="min-w-0 flex-1 rounded-[10px] border border-border-strong bg-card px-3.5 py-2.5 font-mono text-[12.5px] text-foreground outline-none placeholder:text-neutral-400 focus:border-primary-500"
        />
        <button
          type="button"
          disabled={pending || url.trim() === savedUrl}
          onClick={save}
          className="shrink-0 rounded-full bg-primary-500 px-[26px] py-2.5 text-[13.5px] font-bold text-neutral-950 shadow-sm transition hover:bg-primary-300 disabled:opacity-50"
        >
          保存
        </button>
      </div>
      <div className="mt-3 flex max-w-[560px] items-start gap-2.5 rounded-xl border border-primary-100 bg-primary-50 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-neutral-700">
        <Info
          className="mt-0.5 h-[14px] w-[14px] shrink-0 text-primary-700"
          aria-hidden
        />
        <span>
          Google Meet で
          <b className="text-primary-900">「後で使う会議を作成」</b>
          すると、何度でも使える固定リンクが作れます。登録しておくと、リクエスト承諾時に自動で相手へ共有されます。
        </span>
      </div>
      {savedUrl ? (
        <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-neutral-500">
          <Video className="h-3.5 w-3.5 text-primary-700" aria-hidden />
          登録済み: {savedUrl.replace(/^https:\/\//, '')}
        </p>
      ) : null}
    </div>
  );
}
