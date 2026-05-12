'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Star } from '@locore/ui/icons';
import { submitReview } from '@/lib/reviews/actions';

/**
 * 購入済み記事の詳細ページに表示するレビュー記入フォーム。
 *
 * - 満足度 1-5 星 (必須)
 * - ローカル度スライダー 0-100 (必須)
 * - 本文 (任意、2000 字まで)
 * - タグ (3 つまで、カンマ区切り入力)
 * - 既に書いていれば編集モード（upsert）
 */

type Props = {
  articleId: string;
  initial?: {
    satisfactionStars: number;
    localScore: number;
    body: string | null;
    tags: string[];
  } | null;
};

const QUICK_TAGS = [
  'ローカル感あり',
  '観光客少なめ',
  '写真映え',
  '雨でも OK',
  '子連れ OK',
  'コスパ良し',
  '夜遅くまで',
  '英語通じる',
];

export function ReviewForm({ articleId, initial }: Props) {
  const router = useRouter();
  const [stars, setStars] = useState(initial?.satisfactionStars ?? 0);
  const [localScore, setLocalScore] = useState(initial?.localScore ?? 50);
  const [body, setBody] = useState(initial?.body ?? '');
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [isPending, startTransition] = useTransition();

  const isEditing = !!initial;

  const toggleTag = (tag: string) => {
    setTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= 3) {
        toast.error('タグは 3 つまでです');
        return prev;
      }
      return [...prev, tag];
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (stars < 1) {
      toast.error('満足度を選んでください');
      return;
    }
    startTransition(async () => {
      const res = await submitReview({
        articleId,
        satisfactionStars: stars,
        localScore,
        body: body.trim() || undefined,
        tags,
      });
      if (res.ok) {
        toast.success(isEditing ? 'レビューを更新しました' : 'レビューを投稿しました');
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl bg-card p-5 ring-1 ring-border sm:p-6"
    >
      <header className="mb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
          {isEditing ? 'レビューを編集' : 'レビューを書く'}
        </p>
        <h3
          className="mt-1 text-[18px] font-bold tracking-tight"
          style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
        >
          この記事はどうでしたか？
        </h3>
        <p className="mt-1 text-[12px] text-foreground/60">
          購入後の体験を後の旅行者にシェアしてください。
        </p>
      </header>

      {/* 満足度 */}
      <div className="mb-5">
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/60">
          満足度
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStars(n)}
              aria-label={`${n} 星`}
              className="rounded p-1 transition hover:scale-110"
            >
              <Star
                className={
                  'h-8 w-8 ' +
                  (n <= stars
                    ? 'fill-primary-500 text-primary-500'
                    : 'text-foreground/25')
                }
                fill={n <= stars ? 'currentColor' : 'none'}
              />
            </button>
          ))}
          <span className="ml-2 self-center text-[13px] font-semibold tabular text-foreground/70">
            {stars > 0 ? `${stars}.0` : '未選択'}
          </span>
        </div>
      </div>

      {/* ローカル度 */}
      <div className="mb-5">
        <label
          htmlFor="local-score"
          className="mb-2 flex items-baseline justify-between"
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/60">
            ローカル度
          </span>
          <span className="text-[12px] font-semibold tabular text-primary-300">
            {localScore}
          </span>
        </label>
        <input
          id="local-score"
          type="range"
          min={0}
          max={100}
          step={5}
          value={localScore}
          onChange={(e) => setLocalScore(Number(e.target.value))}
          className="w-full accent-primary-500"
        />
        <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-foreground/45">
          <span>定番寄り</span>
          <span>ローカル寄り</span>
        </div>
      </div>

      {/* タグ */}
      <div className="mb-5">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/60">
          タグ <span className="ml-1 text-[10px] font-normal">（3 個まで）</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_TAGS.map((t) => {
            const on = tags.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTag(t)}
                className={
                  'rounded-full px-2.5 py-1 text-[11px] font-medium transition ' +
                  (on
                    ? 'bg-primary-500 text-neutral-950'
                    : 'bg-primary-500/10 text-primary-300 hover:bg-primary-500/15')
                }
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* 本文 */}
      <div className="mb-5">
        <label
          htmlFor="review-body"
          className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/60"
        >
          コメント <span className="ml-1 text-[10px] font-normal">（任意、2000 字まで）</span>
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={5}
          placeholder="記事のとおりに辿ってみて、どうでしたか？"
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-[13px] leading-relaxed focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
        />
        <p className="mt-1 text-right text-[10px] text-foreground/45">
          {body.length} / 2000
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending || stars < 1}
          className="rounded-md bg-primary-500 px-5 py-2 text-[13px] font-bold text-neutral-950 transition hover:bg-primary-300 disabled:opacity-50"
        >
          {isPending ? '送信中…' : isEditing ? '更新する' : '投稿する'}
        </button>
      </div>
    </form>
  );
}
