'use client';

import { useCallback, useEffect, useState } from 'react';
import { Link2, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ArticleBlock } from '@/lib/articles/blocks';
import { remove, replaceBlock } from '../blockOps';
import { resolveUrlBlock } from '../actions';
import type { BlockOf, FieldProps } from './types';
import { BOXED_INPUT, HINT, OUTLINE_BUTTON, SECTION_LABEL, SOLID_BUTTON } from './ui';

/**
 * リンク（0091 / エディタ作り直し）。**書き手が入れるのは URL 1 本だけ**。
 *
 * その URL がカードになるのか、地図や動画として埋まるのかは resolveUrlBlock がサーバーで判定する。
 * 旧エディタの「埋め込み 1 · リンク」「埋め込み 2 · SNS・地図」のような
 * 2 択を書き手に見せない。provider や kind といった実装用語も画面に出さない。
 *
 * 文字を打てないブロックなので、区切り線と同じく触られたことを親に伝える（onFocusField）。
 * これが無いと書式バーの「↑ / ↓ / 複製 / 削除」がこのブロックを掴めない。
 * 402px でも単体で消せるように「リンクを消す」もここに置く。
 */
export function LinkField({ block, blocks, apply, onFocusField }: FieldProps<BlockOf<'link_card'> | BlockOf<'embed'>>) {
  const [draft, setDraft] = useState(block.url);
  const [editing, setEditing] = useState(!block.url);
  const { resolving, resolve } = useLinkResolver();

  const select = () => onFocusField?.({ blockId: block.id });

  // ⌘Z / ↺ で URL の変更が取り消されたら、書きかけの draft は捨てる。
  // 持ち越すと「取り消したはずの URL」が入力欄に戻り、そのまま読み込むと取り消しが無効になる
  useEffect(() => {
    setDraft(block.url);
  }, [block.url]);

  const deleteButton = (
    <button
      type="button"
      onClick={() => apply(remove(blocks, block.id))}
      className={OUTLINE_BUTTON + ' text-danger-500'}
    >
      <Trash2 className="h-4 w-4" aria-hidden /> リンクを消す
    </button>
  );

  const commit = async () => {
    const next = await resolve(draft);
    if (!next) return;
    // id は今のブロックのものを使い回す（並び順とキャレットの居場所を変えない）
    apply(replaceBlock(blocks, block.id, { ...next, id: block.id }));
    setEditing(false);
  };

  const title = block.preview?.title ?? null;
  const image = block.preview?.imageUrl ?? null;

  if (editing) {
    return (
      <div className="rounded-xl border border-border bg-card p-3" onPointerDown={select} onFocusCapture={select}>
        <p className={SECTION_LABEL}>リンク</p>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // 変換中の Enter は確定。ここでは何もしない
            if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
            e.preventDefault();
            void commit();
          }}
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://…"
          aria-label="貼りたい URL"
          className={BOXED_INPUT + ' mt-1.5'}
        />
        <p className={HINT + ' mt-1.5'}>記事・お店の地図・動画・SNS の URL を貼ると、その形で表示されます</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => void commit()} disabled={resolving || !draft.trim()} className={SOLID_BUTTON}>
            {resolving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {resolving ? '読み込み中…' : '読み込む'}
          </button>
          {block.url ? (
            <button
              type="button"
              onClick={() => {
                setDraft(block.url);
                setEditing(false);
              }}
              className={OUTLINE_BUTTON}
            >
              やめる
            </button>
          ) : null}
          {deleteButton}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3" onPointerDown={select} onFocusCapture={select}>
      <div className="flex items-center gap-3">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" referrerPolicy="no-referrer" className="h-14 w-20 shrink-0 rounded-lg object-cover" />
        ) : (
          <span className="grid h-14 w-20 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-400">
            <Link2 className="h-5 w-5" aria-hidden />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-bold text-foreground">{title ?? hostOf(block.url)}</p>
          <p className="truncate text-[13px] text-neutral-500">{block.url}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setDraft(block.url); // 開くたびに今の URL から始める（前回の書きかけを持ち越さない）
            setEditing(true);
          }}
          className={OUTLINE_BUTTON}
        >
          リンクを変える
        </button>
        {deleteButton}
      </div>
    </div>
  );
}

/**
 * URL 1 本 → ブロック。＋ のボトムシートの「リンクを貼る」からも使う。
 * 種類の判定（カードか埋め込みか）はサーバーの resolveUrlBlock が持っている。
 */
export function useLinkResolver(): { resolving: boolean; resolve: (raw: string) => Promise<ArticleBlock | null> } {
  const [resolving, setResolving] = useState(false);
  const resolve = useCallback(async (raw: string): Promise<ArticleBlock | null> => {
    const url = normalizeUrl(raw);
    if (!url) {
      toast.error('URL を貼ってください');
      return null;
    }
    setResolving(true);
    try {
      const res = await resolveUrlBlock({ url });
      if (!res.ok) {
        toast.error(res.error);
        return null;
      }
      if (!res.data) {
        toast.error('このリンクは読み込めませんでした');
        return null;
      }
      return res.data;
    } catch {
      toast.error('リンクを読み込めませんでした。通信の状態を確かめてください');
      return null;
    } finally {
      setResolving(false);
    }
  }, []);
  return { resolving, resolve };
}

/** スマホでコピーすると scheme が落ちていることがあるので https:// を補う */
function normalizeUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(t)) return `https://${t}`;
  return null;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
