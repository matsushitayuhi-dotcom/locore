'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@locore/ui';
import type { NotificationPreferences } from '@locore/db';
import { updateNotificationPreferences } from '@/app/settings/notifications/actions';

type Topic = 'article_published' | 'purchase_completed';

// β版はメール通知のみ対応。旅程リマインダー / クライシス情報は今後提供予定のため非表示。
const TOPICS: { key: Topic; label: string; description: string }[] = [
  {
    key: 'article_published',
    label: '記事の新着',
    description: 'フォロー中の駐在員や注目都市の新しい記事',
  },
  {
    key: 'purchase_completed',
    label: '購入完了',
    description: '記事購入の確定・領収書の送付',
  },
];

type Props = {
  initial: NotificationPreferences;
};

export function NotificationPrefsForm({ initial }: Props) {
  // web_push など非表示のチャンネル/トピックも initial の値を保持したまま送信する
  // （actions 側の zod スキーマは全項目を要求するため）。
  const [prefs, setPrefs] = useState<NotificationPreferences>(initial);
  const [isPending, startTransition] = useTransition();

  const toggleEmail = (topic: Topic) => {
    setPrefs((prev) => ({
      ...prev,
      email: {
        ...prev.email,
        [topic]: !prev.email[topic],
      },
    }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateNotificationPreferences(prefs);
      if (res.ok) {
        toast.success('通知設定を保存しました');
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-md border border-border bg-card p-5 sm:p-6"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[360px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wider text-foreground/50">
              <th className="py-2 pr-4 font-medium">通知タイプ</th>
              <th className="pl-2 py-2 text-center font-medium">Email</th>
            </tr>
          </thead>
          <tbody>
            {TOPICS.map((t) => (
              <tr key={t.key} className="border-b border-border/60 last:border-0">
                <td className="py-3 pr-4 align-top">
                  <div className="font-medium text-foreground">{t.label}</div>
                  <div className="text-[11px] text-foreground/55">
                    {t.description}
                  </div>
                </td>
                <td className="pl-2 py-3 text-center">
                  <Toggle
                    checked={prefs.email[t.key]}
                    onChange={() => toggleEmail(t.key)}
                    label={`${t.label} のメール通知`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[12px] text-foreground/60">
          β版では通知はメールのみ対応しています。
        </div>
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? '保存中…' : '保存する'}
        </Button>
      </div>
    </form>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-150 ${
        checked ? 'bg-primary-700' : 'bg-neutral-200'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-card shadow-xs transition-transform duration-150 ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
