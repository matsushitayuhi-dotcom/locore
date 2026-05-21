'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Sparkles, X } from 'lucide-react';
import { Button } from '@locore/ui';
import { toast } from 'sonner';
import { createArticleDraft } from '../actions';
import {
  duplicateArticle,
  type DuplicateCandidate,
} from './actions';

/**
 * #1: 新規記事エントリの UI。
 *
 *  - プライマリ「新規記事を書く」 → createArticleDraft Server Action
 *  - セカンダリ「過去の記事から複製」 → クリックで下にドロワー展開
 *  - 過去記事リストから 1 つ選ぶと duplicateArticle Server Action 実行 → /edit へ
 *
 * `?mode=duplicate` URL でアクセスされたときは初期状態でドロワーを開く。
 * 戻るで閉じる: ドロワーを閉じたときに pushState で URL を戻す。
 */
type Props = {
  candidates: DuplicateCandidate[];
  initialDuplicateOpen: boolean;
};

export function NewArticleEntry({ candidates, initialDuplicateOpen }: Props) {
  const [open, setOpen] = useState(initialDuplicateOpen);
  const [isCreating, startCreating] = useTransition();
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const router = useRouter();

  // URL ↔ ドロワー状態の同期
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (open) {
      if (url.searchParams.get('mode') !== 'duplicate') {
        url.searchParams.set('mode', 'duplicate');
        window.history.replaceState(null, '', url.toString());
      }
    } else {
      if (url.searchParams.get('mode') === 'duplicate') {
        url.searchParams.delete('mode');
        window.history.replaceState(null, '', url.toString());
      }
    }
  }, [open]);

  // ブラウザ「戻る」でドロワーを閉じる
  useEffect(() => {
    const onPop = () => {
      const url = new URL(window.location.href);
      setOpen(url.searchParams.get('mode') === 'duplicate');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const handleCreateBlank = () => {
    startCreating(async () => {
      try {
        // createArticleDraft は redirect で /edit へ飛ばすため戻り値は never
        await createArticleDraft({});
      } catch (e) {
        // redirect は Next.js が内部で throw する特殊な error。実害なし。
        // それ以外の例外のみ toast 表示
        if (e instanceof Error && !e.message.includes('NEXT_REDIRECT')) {
          toast.error(e.message);
        }
      }
    });
  };

  const handleDuplicate = (sourceId: string) => {
    setDuplicatingId(sourceId);
    startCreating(async () => {
      try {
        await duplicateArticle({ sourceId });
      } catch (e) {
        if (e instanceof Error && !e.message.includes('NEXT_REDIRECT')) {
          toast.error(e.message);
          setDuplicatingId(null);
        }
      }
    });
  };

  const noCandidates = candidates.length === 0;

  return (
    <div className="space-y-4">
      {/* ボタン群 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <Button
          type="button"
          variant="primary"
          onClick={handleCreateBlank}
          disabled={isCreating}
          className="h-14 flex-1 text-[15px] font-bold"
        >
          <Plus className="mr-1 h-5 w-5" />
          {isCreating && !duplicatingId ? '作成中…' : '新規記事を書く'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen((v) => !v)}
          disabled={isCreating || noCandidates}
          className="h-14 flex-1 text-[14px] font-semibold"
          title={
            noCandidates ? '複製できる過去の記事がまだありません' : undefined
          }
        >
          <Sparkles className="mr-1 h-4 w-4" />
          {open ? '複製を閉じる' : '過去の記事から複製'}
          {!noCandidates ? (
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-500/15 px-1.5 text-[11px] font-bold text-primary-300">
              {candidates.length}
            </span>
          ) : null}
        </Button>
      </div>

      {noCandidates ? (
        <p className="rounded-md bg-muted px-3 py-2 text-[11px] text-foreground/55">
          複製できる過去の記事がまだありません。「新規記事を書く」から始めましょう。
        </p>
      ) : null}

      {/* 複製ドロワー (アコーディオン展開) */}
      {open && !noCandidates ? (
        <section
          className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm"
          aria-label="複製元の記事を選ぶ"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[14px] font-semibold tracking-tight">
                複製元の記事を選ぶ
                <span className="ml-2 text-[11px] font-normal text-foreground/55">
                  ({candidates.length} 件)
                </span>
              </h2>
              <p className="text-[11px] text-foreground/55">
                本文・写真・タグ・価格・都市を引き継ぎます。タイトルとスポット (地図ピン) は引き継がれません。
              </p>
            </div>
            <button
              type="button"
              aria-label="複製パネルを閉じる"
              onClick={() => setOpen(false)}
              className="rounded-sm p-1 text-foreground/55 transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ul className="grid gap-2">
            {candidates.map((c) => {
              const isDuplicating = duplicatingId === c.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(c.id)}
                    disabled={isCreating}
                    className="group flex w-full items-center gap-3 rounded-md border border-border bg-background p-3 text-left transition hover:border-primary-500 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-wait disabled:opacity-60"
                  >
                    <div className="h-14 w-20 shrink-0 overflow-hidden rounded-sm bg-muted">
                      {c.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.coverImageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-foreground">
                        {c.title || '（無題）'}
                      </p>
                      <p className="mt-0.5 text-[11px] text-foreground/55">
                        {statusLabel(c.status)} ・ 更新{' '}
                        {c.updatedAt.toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <span className="text-[12px] font-semibold text-primary-300 group-hover:underline">
                      {isDuplicating ? '複製中…' : 'この記事を複製 →'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function statusLabel(s: string): string {
  switch (s) {
    case 'published':
      return '公開中';
    case 'draft':
      return '下書き';
    case 'archived':
      return 'アーカイブ';
    case 'pending_review':
      return '審査中';
    default:
      return s;
  }
}
