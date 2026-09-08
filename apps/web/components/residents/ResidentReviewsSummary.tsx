import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@locore/ui';
import { Star } from 'lucide-react';
import type { ResidentReviewSummary } from '@/lib/residents/byId';

/**
 * 駐在員ハブ「レビュー」タブの集計表示。
 *
 * - 平均 ★ + 件数
 * - 直近 5 件の本文と評価 (記事タイトルへのリンク付き)
 *
 * Server Component: 親側で getResidentProfile() の reviewSummary を渡す。
 */

type Props = {
  summary: ResidentReviewSummary;
  /** 「まだありません」表示用のユーザー名 */
  displayName: string;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

export function ResidentReviewsSummary({ summary, displayName }: Props) {
  if (summary.count === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-[13px] text-foreground/55">
        {displayName} さんの記事へのレビューはまだありません。
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* サマリ。スマホ幅で見出しが 1 文字ずつ縦に潰れないよう各ブロックを shrink-0 + nowrap に */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-card p-5 ring-1 ring-border sm:p-6">
        <div className="shrink-0">
          <p className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/55">
            平均満足度
          </p>
          <p className="mt-1 flex items-baseline gap-1.5 whitespace-nowrap">
            <Star
              className="h-5 w-5 shrink-0 text-primary-500"
              fill="currentColor"
              strokeWidth={0}
            />
            <span className="text-[28px] font-bold tabular tracking-tight">
              {summary.avgStars != null ? summary.avgStars.toFixed(1) : '—'}
            </span>
            <span className="text-[12px] text-foreground/55">/ 5</span>
          </p>
        </div>
        <div className="h-10 w-px shrink-0 bg-border" />
        <div className="shrink-0">
          <p className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/55">
            レビュー件数
          </p>
          <p className="mt-1 text-[28px] font-bold tabular tracking-tight">
            {summary.count.toLocaleString('ja-JP')}
          </p>
        </div>
      </div>

      {/* 直近 5 件 */}
      <ul className="space-y-3">
        {summary.recent.map((r) => (
          <li
            key={r.id}
            className="rounded-2xl bg-card p-4 ring-1 ring-border sm:p-5"
          >
            <div className="flex items-start gap-3">
              <Avatar size="sm" className="h-9 w-9 shrink-0">
                {r.reviewerAvatarUrl ? (
                  <AvatarImage src={r.reviewerAvatarUrl} alt="" />
                ) : null}
                <AvatarFallback>
                  {r.reviewerName[0]?.toUpperCase() ?? '?'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                {/* 日付は縮まない側 (shrink-0 + nowrap)。名前が長いときは flex-wrap で次行へ */}
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[13px] font-semibold">{r.reviewerName}</p>
                  <p className="shrink-0 whitespace-nowrap text-[11px] tabular text-foreground/45">
                    {formatDate(r.createdAt)}
                  </p>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1 text-[12px] font-semibold tabular text-primary-300">
                  <Star
                    className="h-3.5 w-3.5 shrink-0"
                    fill="currentColor"
                    strokeWidth={0}
                  />
                  {r.satisfactionStars}.0
                  <span className="ml-2 whitespace-nowrap text-foreground/55">
                    ローカル {r.localScore}
                  </span>
                </div>
                {r.body ? (
                  <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-foreground/80">
                    {r.body}
                  </p>
                ) : null}
                <p className="mt-2 truncate text-[11px] text-foreground/55">
                  対象:{' '}
                  <Link
                    href={`/articles/${r.articleId}`}
                    className="text-primary-300 hover:underline"
                  >
                    {r.articleTitle}
                  </Link>
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
