'use client';

import { useState } from 'react';
import { Star } from '@locore/ui/icons';
import { ReviewForm } from '../ReviewForm';

/**
 * 「レビューを書く」ボタンを表示し、押下で {@link ReviewForm} を inline で展開する
 * Client Component。記事詳細ページのノイズを減らすために導入。
 *
 * - 未投稿の場合: 折り畳まれた状態で表示し、押すまでフォームを描画しない。
 * - 投稿済みの場合 (initial が渡されている): 編集ボタンを表示し、押下で編集 UI を開く。
 *
 * ArticleRenderer 自体は Server Component のままにしておきたいので、
 * useState を使う展開ロジックだけここに切り出す。
 */
type Props = {
  articleId: string;
  initial?: React.ComponentProps<typeof ReviewForm>['initial'];
};

export function ReviewFormToggle({ articleId, initial }: Props) {
  const isEditing = !!initial;
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <div className="space-y-2">
        <ReviewForm articleId={articleId} initial={initial} />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[12px] text-foreground/55 underline-offset-4 hover:text-foreground hover:underline"
          >
            閉じる
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="group flex w-full items-center justify-between rounded-md border border-primary-300 bg-card px-4 py-3 text-left transition hover:bg-primary-500/10"
    >
      <span className="flex items-center gap-2">
        <Star
          className="h-4 w-4 text-primary-300 group-hover:text-primary-500"
          fill="currentColor"
        />
        <span className="text-[14px] font-semibold text-primary-300">
          {isEditing ? '自分のレビューを編集' : 'レビューを書く'}
        </span>
      </span>
      <span className="text-[11px] text-foreground/55">
        {isEditing ? 'タップで開く' : 'タップで開く ・ 1 分で完了'}
      </span>
    </button>
  );
}
