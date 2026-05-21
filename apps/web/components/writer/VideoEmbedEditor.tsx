'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button, Input } from '@locore/ui';
import { Plus, X } from '@locore/ui/icons';
import { addVideo, removeVideo } from '@/app/writer/articles/[id]/edit/actions';

export type VideoRow = {
  id: string;
  platform: 'tiktok' | 'instagram' | 'youtube' | 'x' | 'other';
  embedUrl: string;
  position: number;
};

const PLATFORM_LABEL: Record<VideoRow['platform'], string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  x: 'X (旧 Twitter)',
  other: 'その他',
};

type Props = {
  articleId: string;
  initial: VideoRow[];
};

// =============================================================================
// プレビュー解決ロジック
// =============================================================================

type PreviewState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ready'; thumbnail: string; title: string; provider: string };

/** YouTube URL から動画 ID を抽出。失敗時 null。 */
function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    // https://www.youtube.com/watch?v=XXXX
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return v;
      // /shorts/XXXX, /embed/XXXX
      const m = u.pathname.match(/\/(?:shorts|embed)\/([A-Za-z0-9_-]{6,})/);
      if (m) return m[1] ?? null;
    }
    // https://youtu.be/XXXX
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0];
      return id || null;
    }
  } catch {
    return null;
  }
  return null;
}

/** Vimeo URL かどうか */
function isVimeoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.endsWith('vimeo.com');
  } catch {
    return false;
  }
}

/**
 * プレビュー取得 hook。URL が変わる度に YouTube ならローカル抽出、
 * Vimeo なら oEmbed API を fetch。それ以外は idle。
 */
function useVideoPreview(url: string, platform: VideoRow['platform']): PreviewState {
  const [state, setState] = useState<PreviewState>({ kind: 'idle' });

  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed) {
      setState({ kind: 'idle' });
      return;
    }

    let cancelled = false;

    // --- YouTube ---
    if (platform === 'youtube' || extractYouTubeId(trimmed)) {
      const id = extractYouTubeId(trimmed);
      if (!id) {
        setState({ kind: 'error' });
        return;
      }
      setState({ kind: 'loading' });
      // タイトル取得は YouTube oEmbed（CORS 許可）
      // サムネは固定 URL なのでフォールバックで先にセット
      const thumb = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
      fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(
          `https://www.youtube.com/watch?v=${id}`,
        )}&format=json`,
      )
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('oembed failed'))))
        .then((data: { title?: string; provider_name?: string }) => {
          if (cancelled) return;
          setState({
            kind: 'ready',
            thumbnail: thumb,
            title: data.title ?? 'YouTube 動画',
            provider: data.provider_name ?? 'YouTube',
          });
        })
        .catch(() => {
          if (cancelled) return;
          // タイトル取得失敗してもサムネは見せる
          setState({
            kind: 'ready',
            thumbnail: thumb,
            title: 'YouTube 動画',
            provider: 'YouTube',
          });
        });
      return () => {
        cancelled = true;
      };
    }

    // --- Vimeo ---
    if (isVimeoUrl(trimmed)) {
      setState({ kind: 'loading' });
      fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(trimmed)}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('vimeo failed'))))
        .then(
          (data: {
            thumbnail_url?: string;
            title?: string;
            provider_name?: string;
          }) => {
            if (cancelled) return;
            if (!data.thumbnail_url) {
              setState({ kind: 'error' });
              return;
            }
            setState({
              kind: 'ready',
              thumbnail: data.thumbnail_url,
              title: data.title ?? 'Vimeo 動画',
              provider: data.provider_name ?? 'Vimeo',
            });
          },
        )
        .catch(() => {
          if (cancelled) return;
          setState({ kind: 'error' });
        });
      return () => {
        cancelled = true;
      };
    }

    // それ以外のプラットフォームはプレビュー非対応 → idle のまま
    setState({ kind: 'idle' });
    return undefined;
  }, [url, platform]);

  return state;
}

// =============================================================================
// プレビューカード UI
// =============================================================================

function PreviewCard({ state }: { state: PreviewState }) {
  if (state.kind === 'idle') return null;

  if (state.kind === 'loading') {
    return (
      <div className="mt-3 flex items-center gap-3 rounded-md border border-border bg-background p-3 text-[12px] text-foreground/55">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-foreground/30 border-t-primary-500" />
        プレビューを取得中…
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="mt-3 rounded-md border border-warning-500/40 bg-warning-50 p-3 text-[12px] text-warning-700">
        プレビューを取得できません。URL は記事に保存できますが、サムネイル表示はされません。
      </div>
    );
  }

  return (
    <div className="mt-3 flex items-center gap-3 rounded-md border border-border bg-background p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={state.thumbnail}
        alt=""
        className="h-16 w-28 shrink-0 rounded-sm border border-border bg-muted object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[13px] font-medium text-foreground/90">
          {state.title}
        </p>
        <p className="mt-0.5 text-[11px] text-foreground/55">{state.provider}</p>
      </div>
    </div>
  );
}

// =============================================================================
// メイン
// =============================================================================

export function VideoEmbedEditor({ articleId, initial }: Props) {
  const [rows, setRows] = useState<VideoRow[]>(
    [...initial].sort((a, b) => a.position - b.position),
  );
  const [platform, setPlatform] = useState<VideoRow['platform']>('youtube');
  const [embedUrl, setEmbedUrl] = useState('');
  const [isPending, startTransition] = useTransition();

  const preview = useVideoPreview(embedUrl, platform);

  const onAdd = () => {
    if (!embedUrl.trim()) {
      toast.error('動画 URL を入力してください');
      return;
    }
    startTransition(async () => {
      const res = await addVideo({ articleId, platform, embedUrl: embedUrl.trim() });
      if (res.ok) {
        toast.success('動画を追加しました');
        setRows((prev) => [
          ...prev,
          {
            id: res.data!.id,
            platform,
            embedUrl: embedUrl.trim(),
            position: prev.length,
          },
        ]);
        setEmbedUrl('');
      } else {
        toast.error(res.error);
      }
    });
  };

  const onRemove = (videoId: string) => {
    if (!window.confirm('この動画埋め込みを削除します。よろしいですか？')) return;
    startTransition(async () => {
      const res = await removeVideo({ articleId, videoId });
      if (res.ok) {
        toast.success('削除しました');
        setRows((prev) => prev.filter((r) => r.id !== videoId));
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {rows.length === 0 ? (
          <li className="rounded-md border border-dashed border-border bg-card p-4 text-[12px] text-foreground/50">
            まだ動画は追加されていません。
          </li>
        ) : (
          rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 rounded-md border border-border bg-card p-3"
            >
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-foreground/80">
                {PLATFORM_LABEL[r.platform]}
              </span>
              <a
                href={r.embedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate text-[12px] text-primary-300 underline-offset-4 hover:underline"
              >
                {r.embedUrl}
              </a>
              <button
                type="button"
                aria-label="動画を削除"
                onClick={() => onRemove(r.id)}
                className="rounded-sm p-1 text-foreground/50 hover:bg-muted hover:text-danger-500"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))
        )}
      </ul>

      <div className="rounded-md border border-border bg-card p-4">
        <p className="mb-3 text-[12px] font-medium text-foreground/70">動画を追加</p>
        <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto]">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as VideoRow['platform'])}
            className="flex h-10 w-full rounded-sm border border-border bg-card px-3 text-body-md text-foreground focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
          >
            {Object.entries(PLATFORM_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <Input
            type="url"
            value={embedUrl}
            onChange={(e) => setEmbedUrl(e.target.value)}
            placeholder="https://www.tiktok.com/@user/video/123… など"
          />
          <Button type="button" variant="primary" onClick={onAdd} disabled={isPending}>
            <Plus className="h-4 w-4" />
            追加
          </Button>
        </div>
        {/* URL ペースト直後のプレビュー (YouTube / Vimeo) */}
        <PreviewCard state={preview} />
      </div>
    </div>
  );
}
