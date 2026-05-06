'use client';

import Link from 'next/link';
import { Flag } from 'lucide-react';

type Props = {
  targetType: 'article' | 'user' | 'review' | 'light_diary';
  targetId: string;
  /** 'icon' = アイコン単体、'link' = テキストリンク。デフォルト 'link'。 */
  variant?: 'icon' | 'link';
  className?: string;
};

/**
 * 通報リンクボタン。クリックで `/report/<targetType>/<targetId>` に遷移する。
 * 既存の記事詳細・レビュー一覧・著者プロフィール・ライト旅行記カードへ
 * 後から差し込んで使う想定。
 */
export function ReportButton({
  targetType,
  targetId,
  variant = 'link',
  className = '',
}: Props) {
  const href = `/report/${targetType}/${targetId}`;

  if (variant === 'icon') {
    return (
      <Link
        href={href}
        aria-label="通報する"
        title="通報する"
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground/40 transition-colors hover:bg-neutral-100 hover:text-foreground/80 ${className}`}
        data-locore-component="ReportButton"
      >
        <Flag className="h-4 w-4" />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1 text-[12px] text-foreground/50 transition-colors hover:text-foreground/80 hover:underline ${className}`}
      data-locore-component="ReportButton"
    >
      <Flag className="h-3 w-3" />
      <span>通報する</span>
    </Link>
  );
}
