'use client';

/**
 * @deprecated 単画面リニューアル後は `app/writer/articles/[id]/edit/components/BodyEditorSection.tsx` を使用。
 * 旧 4 タブ UI 用の互換コンポーネント。新規実装からは参照しないこと。
 */

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@locore/ui';
import { updateArticle } from '@/app/writer/articles/[id]/edit/actions';

type Props = {
  articleId: string;
  initialBody: string;
  isPublished: boolean;
};

export function ArticleBodyEditor({ articleId, initialBody, isPublished }: Props) {
  const [body, setBody] = useState(initialBody);
  const [isPending, startTransition] = useTransition();

  const onSave = () => {
    if (isPublished) {
      const ok = window.confirm(
        '公開中の記事を編集すると変更が即時反映されます。続けますか？',
      );
      if (!ok) return;
    }
    startTransition(async () => {
      const res = await updateArticle({ id: articleId, body });
      if (res.ok) {
        toast.success('本文を保存しました');
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-3 rounded-md border border-border bg-card p-5 sm:p-6">
      <div>
        <label htmlFor="art-body" className="mb-1 block text-[12px] font-medium text-foreground/70">
          本文（Markdown 対応）
        </label>
        <textarea
          id="art-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={20000}
          rows={20}
          aria-describedby="art-body-help"
          className="flex w-full rounded-sm border border-neutral-200 bg-neutral-0 px-3 py-2 font-mono text-[13px] leading-relaxed text-neutral-900 placeholder:text-neutral-400 focus:border-2 focus:border-primary-700 focus:px-[11px] focus:py-[7px] focus:outline-none"
          placeholder={'# 見出し\n\n本文を書きましょう。\n\n## サブ見出し\n\n…'}
        />
        <p id="art-body-help" className="mt-1 text-[11px] text-foreground/50">
          {body.length.toLocaleString('ja-JP')} / 20,000 文字 ・
          公開申請には 100 文字以上が必要です
        </p>
      </div>
      <div className="flex justify-end">
        <Button type="button" variant="primary" disabled={isPending} onClick={onSave}>
          {isPending ? '保存中…' : '本文を保存'}
        </Button>
      </div>
    </div>
  );
}
