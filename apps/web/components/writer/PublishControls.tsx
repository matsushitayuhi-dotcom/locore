'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Button } from '@locore/ui';
import {
  publishArticle,
  unpublishArticle,
} from '@/app/writer/articles/[id]/edit/actions';

type Props = {
  articleId: string;
  status: 'draft' | 'published' | 'archived' | 'pending_review';
  bodyLength: number;
};

export function PublishControls({ articleId, status, bodyLength }: Props) {
  const [isPending, startTransition] = useTransition();

  const onPublish = () => {
    if (bodyLength < 100) {
      toast.error('公開申請には本文 100 文字以上が必要です');
      return;
    }
    if (
      !window.confirm('公開申請を行います。AI モデレーション後に公開／編集者ホールドのいずれかになります。')
    ) {
      return;
    }
    startTransition(async () => {
      const res = await publishArticle(articleId);
      if (res.ok) {
        const a = res.data!;
        if (a.action === 'pass') {
          toast.success(`公開しました（最終スコア ${a.finalScore}）`);
        } else if (a.action === 'warned') {
          toast.warning(`警告付きで公開しました（スコア ${a.finalScore}）`);
        } else {
          toast.warning(`編集者の確認待ちです（スコア ${a.finalScore}）`);
        }
      } else {
        toast.error(res.error);
      }
    });
  };

  const onUnpublish = () => {
    if (!window.confirm('この記事を非公開（アーカイブ）にします。よろしいですか？')) return;
    startTransition(async () => {
      const res = await unpublishArticle(articleId);
      if (res.ok) {
        toast.success('アーカイブしました');
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={`/writer/articles/${articleId}/preview`}>プレビュー</Link>
      </Button>
      {status === 'draft' || status === 'archived' ? (
        <Button type="button" variant="primary" size="sm" onClick={onPublish} disabled={isPending}>
          {isPending ? '処理中…' : '公開申請'}
        </Button>
      ) : null}
      {status === 'published' || status === 'pending_review' ? (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onUnpublish}
          disabled={isPending}
        >
          非公開にする
        </Button>
      ) : null}
    </div>
  );
}
