'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button, Input } from '@locore/ui';
import { Trash2, RefreshCw, ImageOff, Pencil, Check } from 'lucide-react';
import {
  addSnsLink,
  deleteSnsLink,
  refreshSnsPreview,
  updateSnsLink,
  type SnsLinkRow,
} from '@/app/settings/profile/actions';
import {
  DISPLAY_LABEL,
  KIND_LABEL,
  LINK_DISPLAYS,
  PLATFORM_LABEL,
  resolveDisplay,
  type LinkDisplay,
  type LinkKind,
} from '@/lib/media/display';

/**
 * SNS・発信リンクの編集（0088）。
 *
 * - 追加時にサーバーがプレビュー（タイトル・画像）を 1 回取得し、行にサムネと種類を出す
 * - 行ごとに「表示形式」を選べる（自動 / アイコンのみ / ボタン / カード / 大きく / 埋め込み）。
 *   自動のときは platform と種類から決まる（YouTube 動画 → 大きく、note・ブログ記事 → カード…）
 * - タイトルは本人が上書き可。プレビューは再取得ボタンで更新
 * - アイコン列（ヒーロー）は platform ごとに 1 件。セクションは全リンクを表示
 */

type Platform =
  | 'tiktok'
  | 'instagram'
  | 'youtube'
  | 'x'
  | 'threads'
  | 'linkedin'
  | 'blog'
  | 'note'
  | 'website';

const PLATFORMS: { value: Platform; label: string; hint: string }[] = [
  { value: 'youtube', label: 'YouTube', hint: '動画 URL ならサムネ付きで大きく表示' },
  { value: 'note', label: 'note', hint: '記事 URL ならカード表示' },
  { value: 'blog', label: 'Blog', hint: '記事 URL ならカード表示' },
  { value: 'website', label: 'Website', hint: '' },
  { value: 'instagram', label: 'Instagram', hint: 'ボタン表示（自動サムネなし）' },
  { value: 'x', label: 'X', hint: '投稿 URL なら本文をタイトルに' },
  { value: 'threads', label: 'Threads', hint: '' },
  { value: 'tiktok', label: 'TikTok', hint: '動画 URL ならサムネ付き' },
  { value: 'linkedin', label: 'LinkedIn', hint: 'プロフィール URL はボタン表示。投稿 URL ならカード' },
];

const RESOLVED_LABEL: Record<string, string> = {
  icon: 'アイコンのみ',
  button: 'ボタン',
  card: 'カード',
  featured: '大きく',
  embed: '埋め込み',
};

export function SnsLinksEditor({ initial }: { initial: SnsLinkRow[] }) {
  const [rows, setRows] = useState<SnsLinkRow[]>(initial);
  const [draftPlatform, setDraftPlatform] = useState<Platform>('youtube');
  const [draftUrl, setDraftUrl] = useState('');
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState('');

  const onAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftUrl.trim()) {
      toast.error('URL を入力してください');
      return;
    }
    startTransition(async () => {
      const res = await addSnsLink({ platform: draftPlatform, url: draftUrl.trim() });
      if (res.ok && res.data) {
        const d = res.data;
        toast.success(
          d.previewStatus === 'ok' ? 'リンクを追加しました' : 'リンクを追加しました（プレビューは取得できませんでした）',
        );
        setRows((prev) => [...prev, d]);
        setDraftUrl('');
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  };

  const onDelete = (id: string) => {
    if (!confirm('このリンクを削除しますか？')) return;
    setBusyId(id);
    startTransition(async () => {
      const res = await deleteSnsLink({ id });
      if (res.ok) {
        toast.success('削除しました');
        setRows((prev) => prev.filter((r) => r.id !== id));
      } else toast.error(res.error);
      setBusyId(null);
    });
  };

  const onDisplay = (id: string, display: LinkDisplay) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, display } : r)));
    startTransition(async () => {
      const res = await updateSnsLink({ id, display });
      if (!res.ok) toast.error(res.error);
    });
  };

  const onRefresh = (id: string) => {
    setBusyId(id);
    startTransition(async () => {
      const res = await refreshSnsPreview({ id });
      if (res.ok && res.data) {
        const d = res.data;
        setRows((prev) => prev.map((r) => (r.id === id ? d : r)));
        toast.success('プレビューを更新しました');
      } else if (!res.ok) toast.error(res.error);
      setBusyId(null);
    });
  };

  const startEdit = (r: SnsLinkRow) => {
    setEditingId(r.id);
    setTitleDraft(r.title ?? '');
  };
  const commitEdit = (id: string) => {
    const title = titleDraft.trim();
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, title: title || null } : r)));
    setEditingId(null);
    startTransition(async () => {
      const res = await updateSnsLink({ id, title: title || null });
      if (!res.ok) toast.error(res.error);
    });
  };

  return (
    <section className="space-y-4 rounded-md bg-card p-5 ring-1 ring-border sm:p-6">
      <header>
        <h3 className="text-[16px] font-semibold tracking-tight">SNS・発信リンク</h3>
        <p className="mt-1 text-[12px] text-foreground/60">
          公開プロフィール上部のアイコン列と、下部の「発信・メディア」に表示されます。動画や記事の URL
          を入れるとサムネ付きで見せられます。表示の仕方はリンクごとに選べます。
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="text-[12px] text-foreground/50">まだ登録されていません。</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const resolved = resolveDisplay(r);
            const busy = busyId === r.id;
            return (
              <li key={r.id} className="grid gap-3 rounded-md bg-background p-3 ring-1 ring-border sm:grid-cols-[72px_1fr]">
                <div className="h-[54px] w-[72px] overflow-hidden rounded-md bg-muted ring-1 ring-border">
                  {r.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.imageUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-foreground/35">
                      <ImageOff className="h-4 w-4" aria-hidden />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-foreground/55">
                    <span className="font-semibold text-foreground/80">{PLATFORM_LABEL[r.platform] ?? r.platform}</span>
                    <span>・{KIND_LABEL[(r.kind as LinkKind) ?? 'profile'] ?? r.kind}</span>
                    {r.siteName ? <span>・{r.siteName}</span> : null}
                    {r.previewStatus === 'failed' ? (
                      <span className="rounded-full bg-warning-500/15 px-2 py-px text-[10px] font-bold text-warning-700">
                        プレビュー未取得
                      </span>
                    ) : null}
                  </div>
                  {editingId === r.id ? (
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        placeholder="表示するタイトル"
                        maxLength={160}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            commitEdit(r.id);
                          }
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => commitEdit(r.id)}
                        className="rounded-sm p-1.5 text-primary-700 hover:bg-muted"
                        aria-label="タイトルを保存"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(r)}
                      className="group mt-0.5 flex max-w-full items-center gap-1.5 text-left"
                      title="タイトルを編集"
                    >
                      <span className={'truncate text-[13.5px] font-semibold ' + (r.title ? '' : 'text-foreground/45')}>
                        {r.title ?? 'タイトル未設定（クリックして入力）'}
                      </span>
                      <Pencil className="h-3 w-3 shrink-0 text-foreground/35 group-hover:text-foreground" aria-hidden />
                    </button>
                  )}
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-[11.5px] text-foreground/55 underline-offset-4 hover:underline"
                  >
                    {r.url}
                  </a>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 text-[11.5px] text-foreground/65">
                      表示
                      <select
                        value={r.display}
                        onChange={(e) => onDisplay(r.id, e.target.value as LinkDisplay)}
                        className="h-8 rounded-sm border border-border bg-card px-2 text-[12px] focus:border-primary-500 focus:outline-none"
                      >
                        {LINK_DISPLAYS.filter((d) => d !== 'embed' || r.platform === 'youtube').map((d) => (
                          <option key={d} value={d}>
                            {DISPLAY_LABEL[d]}
                          </option>
                        ))}
                      </select>
                    </label>
                    {r.display === 'auto' ? (
                      <span className="text-[11px] text-foreground/50">→ {RESOLVED_LABEL[resolved]}</span>
                    ) : (r.display === 'card' || r.display === 'featured') && !r.imageUrl ? (
                      <span className="text-[11px] text-warning-700">画像が無いのでボタンで表示されます</span>
                    ) : null}
                    <span className="ml-auto flex items-center gap-1">
                      {r.platform !== 'email' ? (
                        <button
                          type="button"
                          onClick={() => onRefresh(r.id)}
                          disabled={busy}
                          className="rounded-sm p-1.5 text-foreground/50 transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                          aria-label="プレビューを再取得"
                          title="プレビューを再取得"
                        >
                          <RefreshCw className={'h-4 w-4' + (busy ? ' animate-spin' : '')} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onDelete(r.id)}
                        disabled={busy}
                        className="rounded-sm p-1.5 text-foreground/50 transition hover:bg-muted hover:text-danger-500 disabled:opacity-50"
                        aria-label="削除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={onAdd} className="grid gap-3 sm:grid-cols-[150px_1fr_auto]">
        <select
          value={draftPlatform}
          onChange={(e) => setDraftPlatform(e.target.value as Platform)}
          className="h-11 rounded-sm border border-border bg-card px-3 text-body-md focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
        >
          {PLATFORMS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <Input
          type="url"
          value={draftUrl}
          onChange={(e) => setDraftUrl(e.target.value)}
          placeholder={
            draftPlatform === 'youtube'
              ? 'https://www.youtube.com/watch?v=…（動画）または チャンネル URL'
              : draftPlatform === 'linkedin'
                ? 'https://www.linkedin.com/in/…'
                : 'https://…'
          }
        />
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? '取得中…' : '追加'}
        </Button>
        {PLATFORMS.find((p) => p.value === draftPlatform)?.hint ? (
          <p className="text-[11px] text-foreground/50 sm:col-span-3">
            {PLATFORMS.find((p) => p.value === draftPlatform)!.hint}
          </p>
        ) : null}
      </form>
    </section>
  );
}
