'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@locore/ui';
import type { NotificationPreferences } from '@locore/db';
import {
  updateNotificationPreferences,
  registerPushSubscriptionMock,
} from '@/app/settings/notifications/actions';

type Channel = 'web_push' | 'email';
type Topic = 'article_published' | 'trip_reminder' | 'crisis_alert' | 'purchase_completed';

const TOPICS: { key: Topic; label: string; description: string }[] = [
  {
    key: 'article_published',
    label: '記事の新着',
    description: 'フォロー中の駐在員や注目都市の新しい記事',
  },
  {
    key: 'trip_reminder',
    label: '旅程リマインダー',
    description: '出発前日 / 当日 / 帰国前のリマインド',
  },
  {
    key: 'crisis_alert',
    label: 'クライシス情報',
    description: '訪問中・予定の街でのストや事件・気象警報',
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
  const [prefs, setPrefs] = useState<NotificationPreferences>(initial);
  const [isPending, startTransition] = useTransition();

  const toggle = (channel: Channel, topic: Topic) => {
    setPrefs((prev) => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [topic]: !prev[channel][topic],
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

  const onEnablePush = () => {
    startTransition(async () => {
      // TODO: 実 ServiceWorker / VAPID 連携
      const res = await registerPushSubscriptionMock();
      if (res.ok) {
        toast.success('（モック）Push 購読を登録しました');
      }
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-md border border-border bg-card p-5 sm:p-6"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wider text-foreground/50">
              <th className="py-2 pr-4 font-medium">通知タイプ</th>
              <th className="px-2 py-2 text-center font-medium">Web Push</th>
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
                <td className="px-2 py-3 text-center">
                  <Toggle
                    checked={prefs.web_push[t.key]}
                    onChange={() => toggle('web_push', t.key)}
                    label={`${t.label} の Web Push`}
                  />
                </td>
                <td className="pl-2 py-3 text-center">
                  <Toggle
                    checked={prefs.email[t.key]}
                    onChange={() => toggle('email', t.key)}
                    label={`${t.label} の Email`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[12px] text-foreground/60">
          ブラウザ通知を初めて使う場合は、ブラウザに購読登録してください。
          <br />
          <span className="text-foreground/45">
            ※ VAPID 連携は今後実装予定（現在はモック）。
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onEnablePush}
            disabled={isPending}
          >
            ブラウザ通知を有効化
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? '保存中…' : '保存する'}
          </Button>
        </div>
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
