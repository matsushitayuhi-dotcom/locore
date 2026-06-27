'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@locore/ui';
import { startDirectThread } from '@/lib/chat/actions';

const CATEGORY_LABEL: Record<string, string> = {
  tourism: '観光・現地アテンド',
  consulting: 'コンサル・相談',
  study_abroad: '留学サポート',
  translation: '翻訳・通訳',
  attend: '同行・代行',
  other: 'その他',
};

export type PublicService = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priceJpy: number | null;
  priceUnit: string | null;
  contactMethod: 'chat' | 'external_url';
  externalUrl: string | null;
  /** 提供エリア名（cities.name_ja）。未設定なら null */
  cityNameJa?: string | null;
  /** 'traveler' | 'resident' | 'both' | null */
  audience?: 'traveler' | 'resident' | 'both' | null;
};

const AUDIENCE_LABEL: Record<'traveler' | 'resident' | 'both', string> = {
  traveler: '旅行者向け',
  resident: '駐在員向け',
  both: '旅行者・駐在員',
};

type Props = {
  /** プロフィール対象ユーザー（=サービス出品者） */
  ownerUserId: string;
  ownerName: string;
  services: PublicService[];
  /** ログイン中ユーザー。null = 未ログイン */
  viewerUserId: string | null;
};

export function UserServicesList({
  ownerUserId,
  ownerName,
  services,
  viewerUserId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onContact = (service: PublicService) => {
    if (service.contactMethod === 'external_url' && service.externalUrl) {
      window.open(service.externalUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!viewerUserId) {
      router.push(
        `/auth/login?redirectTo=${encodeURIComponent(`/users/${ownerUserId}`)}`,
      );
      return;
    }
    if (viewerUserId === ownerUserId) {
      toast.info('これは自分のサービスです');
      return;
    }
    startTransition(async () => {
      const res = await startDirectThread({
        withUserId: ownerUserId,
        relatedServiceId: service.id,
        initialMessage: `「${service.title}」について問い合わせさせてください。`,
      });
      if (res.ok && res.data) {
        router.push(`/chat/${res.data.threadId}`);
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  };

  if (services.length === 0) return null;

  return (
    <section className="space-y-4">
      <div>
        <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-500" />
          {ownerName} のサービス
        </p>
        <h3 className="mt-2 text-[18px] font-bold tracking-tight">
          現地ならではの強みを依頼する
        </h3>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {services.map((s) => (
          <li
            key={s.id}
            className="flex flex-col rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border transition hover:shadow-md hover:ring-primary-300"
          >
            <div className="flex flex-wrap items-start gap-2">
              {s.category ? (
                <span className="rounded-full bg-primary-500/10 px-2 py-0.5 text-[10px] font-semibold text-primary-300">
                  {CATEGORY_LABEL[s.category] ?? s.category}
                </span>
              ) : null}
              {s.priceJpy != null ? (
                <span className="ml-auto text-[14px] font-bold tabular text-primary-300">
                  ¥{s.priceJpy.toLocaleString('ja-JP')}
                  {s.priceUnit ? (
                    <span className="ml-0.5 text-[10px] font-medium text-foreground/60">
                      / {s.priceUnit}
                    </span>
                  ) : null}
                </span>
              ) : (
                <span className="ml-auto text-[12px] font-medium text-foreground/50">
                  応相談
                </span>
              )}
            </div>
            <h4 className="mt-2 text-[15px] font-semibold leading-snug">
              {s.title}
            </h4>
            {s.description ? (
              <p className="mt-2 line-clamp-3 whitespace-pre-line text-[12px] leading-relaxed text-foreground/70">
                {s.description}
              </p>
            ) : null}
            {s.cityNameJa || s.audience ? (
              <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-foreground/55">
                {s.cityNameJa ? (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5">
                    📍 {s.cityNameJa}
                  </span>
                ) : null}
                {s.audience ? (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5">
                    {AUDIENCE_LABEL[s.audience]}
                  </span>
                ) : null}
              </div>
            ) : null}
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => onContact(s)}
                disabled={isPending}
              >
                {s.contactMethod === 'external_url'
                  ? '詳細を見る →'
                  : '問い合わせる'}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
