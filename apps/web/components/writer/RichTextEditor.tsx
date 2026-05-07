'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Youtube from '@tiptap/extension-youtube';
import { toast } from 'sonner';
import { uploadImage } from '@/lib/storage/uploadImage';

/**
 * クリップボード / ドロップから画像 File を取り出すユーティリティ。
 * 画像が含まれるなら File[] を返し、含まれないなら空配列を返す。
 */
function extractImageFiles(items: DataTransferItemList | null | undefined): File[] {
  if (!items) return [];
  const files: File[] = [];
  for (const item of Array.from(items)) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const f = item.getAsFile();
      if (f) files.push(f);
    }
  }
  return files;
}

/**
 * TipTap ベースの WYSIWYG エディタ。
 *
 * - 入力は HTML を保持（親で Markdown ⇄ HTML 変換）
 * - 画像挿入は Supabase Storage アップロード経由
 * - YouTube 埋め込み、リンク、文字色（プリセット 5 色）、見出し、リスト、引用、コードブロック対応
 * - Markdown ⇄ WYSIWYG の切替は親コンポーネントが担当
 */

type Props = {
  initialHtml: string;
  /** 編集中の HTML を親に通知（debounce は親側で処理） */
  onChange: (html: string) => void;
  placeholder?: string;
};

const COLOR_PRESETS = [
  { label: '黒', value: '#1a1a1a' },
  { label: '青', value: '#1d4ed8' },
  { label: '赤', value: '#b91c1c' },
  { label: '緑', value: '#15803d' },
  { label: '灰', value: '#737373' },
];

function ToolbarButton({
  onClick,
  active,
  ariaLabel,
  children,
  disabled,
}: {
  onClick: () => void;
  active?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={
        'inline-flex h-8 min-w-8 items-center justify-center rounded-sm px-2 text-[12px] transition ' +
        (active
          ? 'bg-primary-50 text-primary-700'
          : 'text-foreground/70 hover:bg-neutral-50 hover:text-foreground') +
        (disabled ? ' opacity-40 cursor-not-allowed' : '')
      }
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  if (!editor) return null;

  const onPickImage = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fd = new FormData();
    fd.append('file', files[0]!);
    startTransition(async () => {
      const res = await uploadImage(fd);
      if (res.ok) {
        editor.chain().focus().setImage({ src: res.url }).run();
        toast.success('画像を挿入しました');
      } else {
        toast.error(res.error);
      }
    });
  };

  const onLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('リンク URL', prev ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  const onYoutube = () => {
    const url = window.prompt('YouTube URL', 'https://www.youtube.com/watch?v=');
    if (!url) return;
    editor.commands.setYoutubeVideo({ src: url, width: 640, height: 360 });
  };

  return (
    <div
      role="toolbar"
      aria-label="本文ツールバー"
      className="flex flex-wrap items-center gap-1 rounded-sm border border-border bg-card p-2"
    >
      <ToolbarButton
        ariaLabel="見出し H1"
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="見出し H2"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="見出し H3"
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden />

      <ToolbarButton
        ariaLabel="太字"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <b>B</b>
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="斜体"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <i>I</i>
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="取消線"
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <s>S</s>
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden />

      <ToolbarButton
        ariaLabel="箇条書き"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        ・リスト
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="番号付きリスト"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1.リスト
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="引用"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        ❝引用
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="コードブロック"
        active={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        {'<>'}
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden />

      <ToolbarButton ariaLabel="リンクを追加" onClick={onLink}>
        🔗 リンク
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="画像を挿入"
        onClick={() => fileInputRef.current?.click()}
        disabled={isPending}
      >
        🖼 画像
      </ToolbarButton>
      <ToolbarButton ariaLabel="YouTube を埋め込み" onClick={onYoutube}>
        ▶ YouTube
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-border" aria-hidden />

      <span className="flex items-center gap-1 px-1 text-[11px] text-foreground/50">
        色:
        {COLOR_PRESETS.map((c) => (
          <button
            key={c.value}
            type="button"
            aria-label={`文字色 ${c.label}`}
            title={`文字色 ${c.label}`}
            onClick={() => editor.chain().focus().setColor(c.value).run()}
            className="h-5 w-5 rounded-full border border-border"
            style={{ backgroundColor: c.value }}
          />
        ))}
        <button
          type="button"
          aria-label="文字色をリセット"
          title="文字色をリセット"
          onClick={() => editor.chain().focus().unsetColor().run()}
          className="px-1 text-[10px] text-foreground/60 hover:text-foreground"
        >
          ✕
        </button>
      </span>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => onPickImage(e.target.files)}
      />
    </div>
  );
}

export function RichTextEditor({ initialHtml, onChange, placeholder }: Props) {
  const [mounted, setMounted] = useState(false);

  // SSR で TipTap を実行しない（hydration mismatch 回避）
  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * 画像 File を Supabase Storage にアップロードして TipTap に挿入する共通ヘルパ。
   * クリップボードペースト・ドラッグドロップ・ツールバーの 3 経路から呼ばれる。
   */
  const insertImagesFromFiles = useCallback(
    async (editor: Editor, files: File[]) => {
      if (files.length === 0) return;
      // 画像挿入中は連続トーストにしないためまとめて処理
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        // eslint-disable-next-line no-await-in-loop
        const res = await uploadImage(fd);
        if (res.ok) {
          editor.chain().focus().setImage({ src: res.url }).run();
        } else {
          toast.error(res.error);
        }
      }
      if (files.length > 0) {
        toast.success(`${files.length} 枚の画像を挿入しました`);
      }
    },
    [],
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      TextStyle,
      Color,
      Youtube.configure({ controls: true, nocookie: true }),
      Placeholder.configure({ placeholder: placeholder ?? '本文を書きましょう…' }),
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose-base max-w-none rounded-md border border-border bg-card px-4 py-3 min-h-[420px] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
      },
      // クリップボード画像ペースト：cmd/ctrl+V で貼り付けた image を Supabase に上げて挿入
      handlePaste(view, event) {
        const files = extractImageFiles(event.clipboardData?.items);
        if (files.length === 0) return false;
        event.preventDefault();
        // editor インスタンスはクロージャで取れないので view から再取得
        const ed = (view as unknown as { _tiptapEditor?: Editor })._tiptapEditor;
        if (ed) {
          void insertImagesFromFiles(ed, files);
        }
        return true;
      },
      // ドラッグドロップ：エディタ領域への画像ドロップを Supabase に上げて挿入
      handleDrop(view, event) {
        const dt = (event as DragEvent).dataTransfer;
        const files = extractImageFiles(dt?.items);
        if (files.length === 0) return false;
        event.preventDefault();
        const ed = (view as unknown as { _tiptapEditor?: Editor })._tiptapEditor;
        if (ed) {
          void insertImagesFromFiles(ed, files);
        }
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      // editor インスタンスを view 経由でも参照できるように
      // （上の handlePaste/handleDrop で使う）
      const view = editor.view as unknown as { _tiptapEditor?: Editor };
      view._tiptapEditor = editor;
    },
    onCreate: ({ editor }) => {
      const view = editor.view as unknown as { _tiptapEditor?: Editor };
      view._tiptapEditor = editor;
    },
    immediatelyRender: false,
  });

  // 親から initialHtml が変わった場合（モード切替時など）に内容を同期
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (initialHtml !== current) {
      editor.commands.setContent(initialHtml || '<p></p>', { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHtml]);

  if (!mounted) {
    return (
      <div className="rounded-sm border border-border bg-card px-4 py-3 text-[13px] text-foreground/40">
        エディタを読み込み中…
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      <p className="text-[11px] text-foreground/40">
        ヒント: 文章を選択してから書式を適用できます。画像はツールバーから挿入のほか、コピー → 貼り付け（⌘V / Ctrl+V）／ドラッグ&ドロップでも追加できます。
      </p>
    </div>
  );
}
