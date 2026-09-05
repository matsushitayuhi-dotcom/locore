'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowRight,
  Check,
  Circle,
  ExternalLink,
  Eye,
  Globe,
} from 'lucide-react';
import type { ProfileCompleteness } from '@/lib/experts/completeness';
import {
  publishProfile,
  unpublishProfile,
} from '@/lib/experts/publish-actions';

/**
 * /settings ハブの完成度メーター＋チェックリスト＋公開カード（公開関門・0084）。
 * 既存 settings のデザイン言語（白基調カード + ライム）に合わせる。
 */

type ChecklistRow = {
  done: boolean;
  label: string;
  href: string;
  hrefLabel: string;
  recommended?: boolean;
};

export function CompletenessChecklist({
  userId,
  completeness: c,
}: {
  userId: string;
  completeness: ProfileCompleteness;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const rows: ChecklistRow[] = [
    {
      done: c.required.education,
      label: '学校・学歴を登録',
      href: '/settings/profile',
      hrefLabel: 'プロフィール編集',
    },
    {
      done: c.required.specialties,
      label: '得意分野を選択',
      href: '/settings/profile',
      hrefLabel: 'プロフィール編集',
    },
    {
      done: c.required.bio,
      label: '自己紹介を書く',
      href: '/settings/profile',
      hrefLabel: 'プロフィール編集',
    },
    {
      done: c.required.menu,
      label: '相談メニューを作成',
      href: '/settings/services',
      hrefLabel: '提供サービス',
    },
    {
      done: c.recommended.availability,
      label: '空き時間を登録',
      href: '/settings/availability',
      hrefLabel: '空き時間',
      recommended: true,
    },
    {
      done: c.recommended.photo,
      label: '顔写真を設定',
      href: '/settings/profile',
      hrefLabel: 'プロフィール編集',
      recommended: true,
    },
    {
      done: c.recommended.verification,
      label: '本人確認を申請',
      href: '/settings/verification',
      hrefLabel: '本人確認',
      recommended: true,
    },
  ];
  const remaining = rows.filter((r) => !r.done && !r.recommended).length;

  const run = (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okMsg: string,
  ) => {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error ?? '操作に失敗しました');
        router.refresh();
        return;
      }
      toast.success(okMsg);
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      {/* 完成度メーター */}
      <section className="rounded-md bg-card p-5 ring-1 ring-border sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[16px] font-semibold tracking-tight">
            プロフィールの完成度
          </h3>
          <span className="text-[22px] font-bold tabular-nums text-primary-700">
            {c.percent}
            <small className="ml-0.5 text-[12px] font-medium text-foreground/50">
              %
            </small>
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={c.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary-500 transition-all"
            style={{ width: `${c.percent}%` }}
          />
        </div>
        <p className="mt-2 text-[12px] text-foreground/60">
          {c.canPublish
            ? '公開に必要な項目はすべて揃っています。'
            : `公開まであと ${remaining} 項目。埋めるほど相談リクエストが届きやすくなります。`}
        </p>

        {/* チェックリスト */}
        <ul className="mt-4 divide-y divide-border">
          {rows.map((r) => (
            <li
              key={r.label}
              className="flex items-center gap-3 py-2.5 text-[13px]"
            >
              {r.done ? (
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-500 text-neutral-950">
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                </span>
              ) : (
                <Circle
                  className="h-5 w-5 shrink-0 text-border-strong"
                  aria-hidden
                />
              )}
              <span
                className={
                  r.done ? 'text-foreground/50 line-through' : 'font-medium'
                }
              >
                {r.label}
              </span>
              {r.recommended ? (
                <span className="rounded-full bg-muted px-2 py-px text-[10px] font-semibold text-foreground/55">
                  推奨
                </span>
              ) : null}
              <Link
                href={r.href}
                className="ml-auto inline-flex items-center gap-1 text-[12px] font-bold text-primary-700 hover:underline hover:underline-offset-4"
              >
                {r.hrefLabel}
                <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 公開カード */}
      <section className="rounded-md bg-card p-5 ring-1 ring-border sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[16px] font-semibold tracking-tight">
            公開ステータス
          </h3>
          {c.published ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-300 bg-primary-100 px-3 py-1 text-[11.5px] font-bold text-primary-900">
              <Globe className="h-3 w-3" aria-hidden />
              公開中
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-[11.5px] font-bold text-neutral-500">
              下書き（非公開）
            </span>
          )}
        </div>

        {c.published ? (
          <>
            <p className="mt-2 text-[12.5px] leading-relaxed text-foreground/60">
              あなたのプロフィールはエキスパート一覧（/experts）に掲載されています。
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <Link
                href={`/experts/${userId}`}
                className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-card px-5 py-2 text-[13px] font-bold text-neutral-700 transition hover:border-foreground hover:text-foreground"
              >
                <Eye className="h-4 w-4" aria-hidden />
                相談者にはこう見えます
              </Link>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (
                    !confirm(
                      '公開を停止しますか？ 一覧から非表示になり、新しい相談リクエストが届かなくなります。',
                    )
                  ) {
                    return;
                  }
                  run(() => unpublishProfile(), '公開を停止しました');
                }}
                className="rounded-full px-3.5 py-2 text-[12.5px] font-medium text-neutral-500 transition hover:text-foreground disabled:opacity-50"
              >
                公開を停止
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-[12.5px] leading-relaxed text-foreground/60">
              {c.canPublish
                ? '公開すると、エキスパート一覧（/experts）に掲載され、相談リクエストを受け取れるようになります。'
                : `公開には次の項目が必要です: ${c.missingLabels.join('・')}`}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={pending || !c.canPublish}
                onClick={() =>
                  run(() => publishProfile(), 'プロフィールを公開しました')
                }
                className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-[26px] py-2.5 text-[13.5px] font-bold text-neutral-950 shadow-sm transition hover:bg-primary-300 disabled:opacity-50"
              >
                <Globe className="h-4 w-4" aria-hidden />
                プロフィールを公開する
              </button>
              <Link
                href={`/experts/${userId}`}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 underline-offset-4 hover:text-foreground hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                相談者にはこう見えます（非公開プレビュー）
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
