'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button, PriceTag } from '@locore/ui';
import { Lock, Check } from '@locore/ui/icons';
import { Purchases } from '../lib/storage/local';
import type { Article, Spot } from '../lib/mock';
import { SpotsCardList } from './SpotsCardList';
import { purchaseArticleMock } from '../lib/purchases/actions';

interface PaywallProps {
  article: Article;
  bodyAfter: string;
  spots: Spot[];
  /** 親から SpotsCardList へ流すデータ */
  folders?: import('@/lib/spotFavorites/actions').FolderSummary[];
  bookmarkedSpotIds?: Set<string>;
  viewerLoggedIn?: boolean;
  /** サーバ側で確認済みの「DB に購入レコードあり」フラグ。あれば即解放 */
  alreadyPurchased?: boolean;
}

export function Paywall({
  article,
  bodyAfter,
  spots,
  folders = [],
  bookmarkedSpotIds,
  viewerLoggedIn = false,
  alreadyPurchased = false,
}: PaywallProps) {
  const router = useRouter();
  const [purchased, setPurchased] = useState(alreadyPurchased);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // サーバから渡された確定情報優先。それ以外は localStorage で判定
    setPurchased(alreadyPurchased || Purchases.has(article.id));
    setHydrated(true);
  }, [article.id, alreadyPurchased]);

  const onConfirm = () => {
    if (!viewerLoggedIn) {
      toast.error('購入にはログインが必要です');
      router.push(`/auth/login?redirect_to=/articles/${article.id}`);
      return;
    }
    startTransition(async () => {
      const res = await purchaseArticleMock({ articleId: article.id });
      if (res.ok) {
        Purchases.add(article.id);
        setPurchased(true);
        setOpen(false);
        toast.success(
          res.alreadyOwned
            ? 'すでに購入済みでした'
            : '購入完了：本文とスポットが解放されました',
          { description: 'プロト版のため決済は発生していません' },
        );
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  if (!hydrated) {
    return null;
  }

  if (purchased) {
    return (
      <div className="space-y-8">
        <div className="rounded-md bg-primary-50 px-4 py-3 text-[13px] text-primary-700 ring-1 ring-primary-100">
          <span className="font-bold">購入済み</span> — 全文とスポットが解放されています。
        </div>
        <article className="prose-locore">
          {bodyAfter.split(/\n\n+/).map((para, i) =>
            para.startsWith('## ') ? (
              <h2 key={i}>{para.replace(/^## /, '')}</h2>
            ) : (
              <p key={i} className="whitespace-pre-line">
                {para}
              </p>
            ),
          )}
        </article>

        <SpotsCardList
          spots={spots}
          folders={folders}
          bookmarkedSpotIds={bookmarkedSpotIds}
          viewerLoggedIn={viewerLoggedIn}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-md border border-border bg-card">
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-card via-card/95 to-transparent" />
        <div className="space-y-4 p-6 [filter:blur(2.5px)] [user-select:none] pointer-events-none">
          <p className="prose-locore">
            {bodyAfter.split(/\n\n+/)[0] ?? ''}
          </p>
          <p className="prose-locore">
            {bodyAfter.split(/\n\n+/)[1] ?? '...'}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-primary-100 bg-primary-50/40 p-6 text-center">
        <Lock className="mx-auto mb-3 h-5 w-5 text-primary-700" />
        <p
          className="text-[18px] font-semibold tracking-tight"
          style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
        >
          続きを読むには購入が必要です
        </p>
        <p className="mt-2 text-[13px] text-foreground/60">
          スポットの正式名・住所・営業時間まで、すべて解放されます。
        </p>
        <div className="mt-4 flex flex-col items-center gap-2">
          <PriceTag amount={article.priceJpy} size="lg" suffix=" / 1記事" />
          <Button
            variant="primary"
            size="lg"
            onClick={() => setOpen(true)}
            className="mt-2 min-w-[260px]"
          >
            ¥{article.priceJpy.toLocaleString('ja-JP')} で続きを読む
          </Button>
          <p className="mt-1 text-[11px] text-foreground/40">
            ※ プロト版のため決済は発生しません（localStorage 保存）
          </p>
        </div>
      </div>

      <SpotsCardList spots={spots} locked />

      {open ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-neutral-900/40 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-md"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/50">
              ご購入の確認
            </p>
            <h3
              className="mt-1 text-[20px] font-semibold leading-snug"
              style={{
                fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
              }}
            >
              {article.title}
            </h3>
            <dl className="mt-4 grid grid-cols-2 gap-3 rounded-md border border-border bg-muted px-4 py-3 text-[13px]">
              <dt className="text-foreground/60">価格</dt>
              <dd className="text-right tabular font-medium">
                ¥{article.priceJpy.toLocaleString('ja-JP')}
              </dd>
              <dt className="text-foreground/60">支払方法</dt>
              <dd className="text-right">プロト（モック）</dd>
            </dl>
            <p className="mt-4 text-[12px] leading-relaxed text-foreground/60">
              <Check className="mr-1 inline h-3 w-3 text-accent-500" />
              本文・スポット詳細・地図ピン情報がすべて解放されます。
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                キャンセル
              </Button>
              <Button
                variant="primary"
                onClick={onConfirm}
                disabled={isPending}
              >
                {isPending ? '処理中…' : '購入する'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function maskName(name: string) {
  if (name.length <= 4) return '◯◯◯◯';
  return name.slice(0, 2) + '◯◯◯◯◯';
}

function SpotList({
  spots,
  unlocked,
}: {
  spots: Spot[];
  unlocked?: boolean;
}) {
  return (
    <section>
      <h3
        className="mb-3 text-[16px] font-semibold tracking-tight"
        style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
      >
        この記事のスポット
      </h3>
      <ul className="divide-y divide-border rounded-md border border-border bg-card">
        {spots.map((s, i) => (
          <li key={s.id} className="px-4 py-3 text-[14px]">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-medium">
                <span className="mr-2 text-[11px] text-foreground/40 tabular">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {unlocked ? s.name : maskName(s.name)}
              </p>
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-foreground/60">
                {s.category}
              </span>
            </div>
            <p className="mt-1 text-[12px] text-foreground/60">
              {unlocked ? s.address : `${s.address.split(',')[1]?.trim() ?? 'パリ'}`}
            </p>
            {unlocked ? (
              <p className="mt-1 text-[12px] text-foreground/60">
                <span className="tabular">{s.openingHours}</span>
                <span className="mx-2 text-foreground/30">·</span>
                <span className="tabular">{s.priceEstimate}</span>
              </p>
            ) : (
              <p className="mt-1 text-[12px] italic text-foreground/40">
                ※ 詳細は購入後に公開されます
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
