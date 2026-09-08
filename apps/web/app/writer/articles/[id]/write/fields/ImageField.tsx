'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadImage } from '@/lib/storage/uploadImage';
import { SHORT_MAX, remove } from '../blockOps';
import { MAX_UPLOAD_BYTES, prepareImage } from './prepareImage';
import type { BlockOf, FieldProps } from './types';
import { BOXED_INPUT, HINT, OUTLINE_BUTTON } from './ui';

/**
 * 写真（0091 / エディタ作り直し）。
 *
 * 入れ方は 3 つとも受ける: 選ぶ（カメラロール）/ 貼り付け（⌘V）/ ドラッグ&ドロップ。
 * アップロード前に canvas で長辺 1600px・JPEG に変換する（prepareImage）。
 * iPhone の HEIC もここで JPEG になるので、Android や PC でも表示できる。
 *
 * キャプションに加えて **alt（写真の説明）も書ける**ようにした。
 * 保存形式にはずっとあったのに旧エディタが出していなかった欄で、
 * 読み上げソフトを使う人と、写真が出てこないときの読み手に効く。
 *
 * 文字を打てないブロックなので、区切り線と同じく **触られたことを親に伝える**
 * （onFocusField）。これが無いと書式バーの「↑ / ↓ / 複製 / 削除」がこのブロックを掴めない。
 */

/** サーバー（uploadImage）が受ける形式。ここに無いものは送っても弾かれるので、その前に伝える */
const SERVER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']);

export function ImageField({ block, blocks, apply, update, onFocusField }: FieldProps<BlockOf<'image'>>) {
  const input = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  // state は次の描画までしか効かない。同じ瞬間に 2 回落とされても 1 本に絞るための鍵
  const running = useRef(false);
  const [over, setOver] = useState(false);

  const select = () => onFocusField?.({ blockId: block.id });

  const setUrl = (url: string) =>
    update((bs) => bs.map((b) => (b.id === block.id && b.type === 'image' ? { ...b, url } : b)));

  const setCaption = (v: string) =>
    update((bs) =>
      bs.map((b) => {
        if (b.id !== block.id || b.type !== 'image') return b;
        const next = { ...b };
        if (v) next.caption = v.slice(0, SHORT_MAX);
        else delete next.caption; // 空文字を残さない（保存形式では任意の項目）
        return next;
      }),
    );

  const setAlt = (v: string) =>
    update((bs) =>
      bs.map((b) => {
        if (b.id !== block.id || b.type !== 'image') return b;
        const next = { ...b };
        if (v) next.alt = v.slice(0, SHORT_MAX);
        else delete next.alt;
        return next;
      }),
    );

  const takeFiles = async (files: FileList | null) => {
    // アップロードは常に 1 本だけ。2 枚目が走ると後着の結果で url が上書きされる
    if (running.current) return;
    const list = files ? Array.from(files) : [];
    // HEIC はブラウザによって type が空で来る。拡張子でも拾う
    const file = list.find((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
    if (!file) {
      toast.error('写真のファイルを選んでください');
      return;
    }
    running.current = true;
    setBusy(true);
    try {
      const prepared = await prepareImage(file);
      // 変換できなかった写真（HEIC がデコードできない・GIF）は元のまま送ることになる。
      // 送る前にここで止める。「もう一度お試しください」は何度やっても直らないので出さない
      if (!prepared.converted) {
        if (prepared.file.size > MAX_UPLOAD_BYTES) {
          toast.error('この写真は大きすぎます。別の写真か、写真アプリで小さくしたものを選んでください');
          return;
        }
        if (!SERVER_TYPES.has(prepared.file.type)) {
          toast.error('この形式の写真は使えません。写真アプリで JPEG に書き出したものを選んでください');
          return;
        }
      }
      const fd = new FormData();
      fd.set('file', prepared.file);
      const res = await uploadImage(fd);
      if (res.ok) setUrl(res.url);
      else toast.error(res.error);
    } catch {
      toast.error('写真を読み込めませんでした。もう一度お試しください');
    } finally {
      running.current = false;
      setBusy(false);
    }
  };

  /** 貼り付け（⌘V）。クリップボードにファイルがあるときだけ横取りする（説明文への文字の貼り付けは邪魔しない） */
  const onPaste = (e: React.ClipboardEvent) => {
    const files = e.clipboardData?.files;
    if (!files || files.length === 0) return;
    e.preventDefault();
    void takeFiles(files);
  };

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(false);
      void takeFiles(e.dataTransfer.files);
    },
  };

  return (
    // このブロックのどこを触っても「今ここが選ばれている」を親に伝える（書式バーの移動・削除のため）
    <div onPaste={onPaste} onPointerDown={select} onFocusCapture={select}>
      {block.url ? (
        <div {...dropHandlers}>
          {/* 記事ページ（Prose）と同じ 4:3 の切り抜き。書きながら読み手の見え方が分かるように */}
          <div className="overflow-hidden rounded-xl bg-neutral-100 aspect-[4/3]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={block.url} alt={block.alt ?? ''} className="h-full w-full object-cover" />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={busy}
              aria-busy={busy}
              className={OUTLINE_BUTTON + ' disabled:opacity-40'}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ImagePlus className="h-4 w-4" aria-hidden />}
              {busy ? '取り込み中' : '写真を変える'}
            </button>
            <button
              type="button"
              onClick={() => apply(remove(blocks, block.id))}
              className={OUTLINE_BUTTON + ' text-danger-500'}
            >
              <Trash2 className="h-4 w-4" aria-hidden /> 写真を消す
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          aria-busy={busy}
          {...dropHandlers}
          className={
            'flex min-h-[132px] w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition disabled:opacity-60 ' +
            (over ? 'border-primary-500 bg-primary-50' : 'border-border-strong bg-card')
          }
        >
          <span className="inline-flex items-center gap-2 text-[16px] font-bold text-foreground">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <ImagePlus className="h-5 w-5" aria-hidden />}
            {busy ? '取り込み中…' : '写真を選ぶ'}
          </span>
          <span className={HINT}>貼り付け（⌘V）やドラッグでも入ります</span>
        </button>
      )}

      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          void takeFiles(e.target.files);
          e.target.value = ''; // 同じ写真をもう一度選んでも onChange が起きるように
        }}
      />

      <div className="mt-2 space-y-2">
        <input
          value={block.caption ?? ''}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="写真の説明文（記事に出ます。無くてもよい）"
          aria-label="写真の説明文"
          className={BOXED_INPUT}
        />
        <input
          value={block.alt ?? ''}
          onChange={(e) => setAlt(e.target.value)}
          placeholder="どんな写真か（読み上げ用。記事には出ません）"
          aria-label="写真の内容の説明（読み上げ用）"
          className={BOXED_INPUT + ' text-neutral-500'}
        />
      </div>
    </div>
  );
}
