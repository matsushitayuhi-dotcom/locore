'use client';

import Link from 'next/link';
import { Badge, Button } from '@locore/ui';
import { Save } from '@locore/ui/icons';
import { PublishControls } from '@/components/writer/PublishControls';

type Props = {
  articleId: string;
  title: string;
  status: 'draft' | 'published' | 'archived' | 'pending_review';
  bodyLength: number;
  updatedAt: Date;
  /** 自動保存の状態表示 */
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt: Date | null;
  /** 公開申請の前提条件（足りないものリスト） */
  missing: string[];
  /** 「下書きを保存」ボタンが押されたときに即時保存を走らせる */
  onSaveDraft: () => void;
  /** 即時保存中フラグ */
  isSavingDraft?: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  draft: '下書き',
  pending_review: '審査中',
  published: '公開中',
  archived: 'アーカイブ',
};

function formatRelative(date: Date): string {
  const sec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (sec < 5) return 'たった今';
  if (sec < 60) return `${sec} 秒前`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 時間前`;
  return date.toLocaleString('ja-JP');
}

export function EditorHeader({
  articleId,
  title,
  status,
  bodyLength,
  updatedAt,
  saveState,
  lastSavedAt,
  missing,
  onSaveDraft,
  isSavingDraft,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-foreground/50">
            <Link href="/writer/articles" className="hover:underline">
              ← 一覧に戻る
            </Link>
          </p>
          <h2
            className="mt-2 truncate text-[20px] font-semibold tracking-tight"
            style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
          >
            {title || '（無題）'}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant={status === 'published' ? 'secondary' : 'outline'}>
              {STATUS_LABEL[status]}
            </Badge>
            <span className="text-[11px] text-foreground/50">
              更新 {updatedAt.toLocaleString('ja-JP')}
            </span>
            <SaveBadge state={saveState} lastSavedAt={lastSavedAt} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSaveDraft}
            disabled={isSavingDraft}
            className="pop-on-hover"
          >
            <Save className="mr-1 h-4 w-4" />
            {isSavingDraft ? '保存中…' : '下書きを保存'}
          </Button>
          <PublishControls articleId={articleId} status={status} bodyLength={bodyLength} />
        </div>
      </div>

      {missing.length > 0 ? (
        <div className="rounded-md border border-warning-500 bg-warning-50 px-4 py-3 text-warning-700">
          <p className="text-[12px] font-medium">公開申請にはあと{missing.length}項目必要です</p>
          <ul className="mt-1 flex flex-wrap gap-1">
            {missing.map((m) => (
              <li
                key={m}
                className="rounded-full border border-warning-500 bg-card px-2 py-0.5 text-[11px] text-warning-700"
              >
                {m}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function SaveBadge({
  state,
  lastSavedAt,
}: {
  state: Props['saveState'];
  lastSavedAt: Date | null;
}) {
  let label = '';
  let cls = 'text-foreground/50';
  if (state === 'saving') {
    label = '保存中…';
    cls = 'text-primary-300';
  } else if (state === 'saved') {
    label = lastSavedAt
      ? `保存済み（${formatRelative(lastSavedAt)}）`
      : '保存済み';
    cls = 'text-foreground/50';
  } else if (state === 'error') {
    label = '保存に失敗しました';
    cls = 'text-danger-500';
  }
  if (!label) return null;
  return <span className={`text-[11px] ${cls}`}>{label}</span>;
}
