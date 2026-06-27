'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { useEditor, EditorContent, Extension, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Youtube from '@tiptap/extension-youtube';
// #3: スラッシュメニュー大幅拡張 (2026-05 改修)
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Highlight } from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { toast } from 'sonner';
import { uploadImage } from '@/lib/storage/uploadImage';
import { MobileEditorToolbar } from './MobileEditorToolbar';

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
 * TipTap ベースの WYSIWYG エディタ（2026-05 改修版）。
 *
 * - 常時ツールバーは撤去。代わりに以下 2 つの「現れる UI」に集約:
 *   - スラッシュメニュー: 本文中で `/` を打つとブロック挿入候補が浮上
 *     (見出し / リスト / 引用 / 画像 / リンク / 動画 / 区切り線)
 *     キーワードで日本語/英語フィルタ可能、↑↓Enter Esc で操作
 *   - バブルメニュー: 文字列を選択中だけ Bold / Italic / Link が浮上
 * - 入力は HTML を保持（親で Markdown ⇄ HTML 変換）
 * - 画像挿入は Supabase Storage アップロード経由
 * - YouTube 埋め込みは旧実装のまま動作
 */

type Props = {
  initialHtml: string;
  /** 編集中の HTML を親に通知（debounce は親側で処理） */
  onChange: (html: string) => void;
  placeholder?: string;
  /**
   * Phase C: 本文上部に「ここから下を有料に」ボタン（ペイウォール境界の挿入/解除）を
   * 表示する。記事本文エディタでのみ true を渡す。
   */
  showPaywallControl?: boolean;
};

// =============================================================================
// スラッシュコマンド定義
// =============================================================================

/**
 * #3: Notion / Substack 風の拡張版スラッシュコマンド (2026-05)
 *
 * - category でグループ化 ( 基本 / メディア / ブロック )
 * - shortcut にショートカット例（`/h1` のような表記）を表示
 */
type SlashCategory = '基本' | 'メディア' | 'ブロック';

type SlashCommand = {
  /** 実装上のキー */
  id: string;
  /** 表示ラベル（日本語） */
  label: string;
  /** 補足説明 */
  hint: string;
  /** 絞り込み対象のキーワード（日本語/英語両対応） */
  keywords: string[];
  /** 実行アイコン文字 */
  icon: string;
  /** カテゴリ */
  category: SlashCategory;
  /** スラッシュメニューに表示するショートカット例 (`/h1` 等) */
  shortcut?: string;
  /** 実行アクション */
  run: (ctx: SlashCommandCtx) => void;
};

type SlashCommandCtx = {
  editor: Editor;
  /** スラッシュメニューを呼び出した際の `/` 開始位置（絞り込み文字列含まず） */
  range: { from: number; to: number };
  /** ファイル選択トリガ */
  pickImage: () => void;
};

function buildCommands(): SlashCommand[] {
  return [
    // ----- 基本（見出し / 段落系） -----
    {
      id: 'h1',
      label: '見出し H1',
      hint: '一番大きい見出し',
      shortcut: '/h1',
      category: '基本',
      keywords: ['heading', 'h1', '見出し', 'おおきい', 'みだし'],
      icon: 'H1',
      run: ({ editor, range }) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode('heading', { level: 1 })
          .run(),
    },
    {
      id: 'h2',
      label: '見出し H2',
      hint: 'セクション見出し',
      shortcut: '/h2',
      category: '基本',
      keywords: ['heading', 'h2', '見出し', 'みだし'],
      icon: 'H2',
      run: ({ editor, range }) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode('heading', { level: 2 })
          .run(),
    },
    {
      id: 'h3',
      label: '見出し H3',
      hint: 'サブ見出し',
      shortcut: '/h3',
      category: '基本',
      keywords: ['heading', 'h3', '見出し', 'サブ', 'みだし'],
      icon: 'H3',
      run: ({ editor, range }) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode('heading', { level: 3 })
          .run(),
    },
    {
      id: 'bold',
      label: '太字',
      hint: '選択中の文字を太字に',
      shortcut: '⌘B',
      category: '基本',
      keywords: ['bold', '太字', 'ふとじ', 'b'],
      icon: 'B',
      run: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleBold().run(),
    },
    {
      id: 'highlight',
      label: 'ハイライト',
      hint: '蛍光ペンの装飾',
      shortcut: '/mark',
      category: '基本',
      keywords: ['highlight', 'mark', 'ハイライト', '蛍光', '装飾'],
      icon: '🖍',
      run: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleHighlight().run(),
    },
    {
      id: 'inline-code',
      label: 'インラインコード',
      hint: '`code` のような等幅装飾',
      shortcut: '/code',
      category: '基本',
      keywords: ['code', 'inline', 'インライン', 'コード', '等幅'],
      icon: '<>',
      run: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleCode().run(),
    },

    // ----- ブロック（リスト / 引用 / コードブロック / テーブル / コールアウト） -----
    {
      id: 'bullet',
      label: '箇条書きリスト',
      hint: '・点リスト',
      shortcut: '/ul',
      category: 'ブロック',
      keywords: ['bullet', 'list', 'ul', '箇条書き', 'リスト'],
      icon: '•',
      run: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      id: 'ordered',
      label: '番号付きリスト',
      hint: '1. 2. 3. のリスト',
      shortcut: '/ol',
      category: 'ブロック',
      keywords: ['number', 'ordered', 'ol', '番号', 'リスト'],
      icon: '1.',
      run: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
      id: 'task-list',
      label: 'チェックリスト',
      hint: '□ チェック付きのリスト',
      shortcut: '/todo',
      category: 'ブロック',
      keywords: ['task', 'todo', 'check', 'checklist', 'チェック', 'タスク'],
      icon: '☑',
      run: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleTaskList().run(),
    },
    {
      id: 'blockquote',
      label: '引用',
      hint: '引用ブロック',
      shortcut: '/quote',
      category: 'ブロック',
      keywords: ['quote', 'blockquote', '引用', 'いんよう'],
      icon: '“',
      run: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
    },
    {
      id: 'code-block',
      label: 'コードブロック',
      hint: '複数行の等幅コード',
      shortcut: '/```',
      category: 'ブロック',
      keywords: ['code', 'block', 'codeblock', 'コードブロック', 'コード'],
      icon: '{ }',
      run: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
    },
    {
      id: 'callout-note',
      label: 'コールアウト (note)',
      hint: '💡 補足ブロック',
      shortcut: '/note',
      category: 'ブロック',
      keywords: ['callout', 'note', 'info', '補足', 'コールアウト'],
      icon: '💡',
      run: ({ editor, range }) =>
        insertCallout(editor, range, 'note'),
    },
    {
      id: 'callout-warning',
      label: 'コールアウト (warning)',
      hint: '⚠ 注意ブロック',
      shortcut: '/warning',
      category: 'ブロック',
      keywords: ['callout', 'warning', 'warn', '注意', '警告'],
      icon: '⚠',
      run: ({ editor, range }) =>
        insertCallout(editor, range, 'warning'),
    },
    {
      id: 'callout-tip',
      label: 'コールアウト (tip)',
      hint: '✨ ヒントブロック',
      shortcut: '/tip',
      category: 'ブロック',
      keywords: ['callout', 'tip', 'hint', 'ヒント', '小ネタ'],
      icon: '✨',
      run: ({ editor, range }) =>
        insertCallout(editor, range, 'tip'),
    },
    {
      id: 'table',
      label: 'テーブル',
      hint: '2 列 × 3 行の基本表',
      shortcut: '/table',
      category: 'ブロック',
      keywords: ['table', 'grid', 'テーブル', '表', 'ひょう'],
      icon: '⊞',
      run: ({ editor, range }) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertTable({ rows: 3, cols: 2, withHeaderRow: true })
          .run(),
    },
    {
      id: 'hr',
      label: '区切り線',
      hint: '水平線で区切る',
      shortcut: '/hr',
      category: 'ブロック',
      keywords: ['hr', 'rule', 'divider', '区切り', '線'],
      icon: '—',
      run: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    },
    {
      id: 'paywall',
      label: 'ここから下を有料に',
      hint: '区切りより下を購入後だけ表示',
      shortcut: '/paid',
      category: 'ブロック',
      keywords: [
        'paywall',
        'paid',
        '有料',
        'ゆうりょう',
        '課金',
        '区切り',
        'ペイウォール',
      ],
      icon: '🔒',
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        insertPaywallDivider(editor);
      },
    },
    {
      id: 'hr-stars',
      label: '区切り (◆ 装飾)',
      hint: '別スタイルの区切り (◆ ◆ ◆)',
      shortcut: '/===',
      category: 'ブロック',
      keywords: ['divider', 'stars', '区切り', '装飾'],
      icon: '◆',
      run: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent(
            '<p style="text-align:center;letter-spacing:0.5em;color:#888;margin:1.5em 0">◆ ◆ ◆</p>',
          )
          .run();
      },
    },

    // ----- メディア -----
    {
      id: 'image',
      label: '画像',
      hint: 'アップロードして挿入',
      shortcut: '/image',
      category: 'メディア',
      keywords: ['image', 'photo', 'picture', '画像', 'がぞう', '写真'],
      icon: '🖼',
      run: ({ editor, range, pickImage }) => {
        editor.chain().focus().deleteRange(range).run();
        pickImage();
      },
    },
    {
      id: 'link',
      label: 'リンク',
      hint: 'URL を入力して挿入',
      shortcut: '/link',
      category: 'メディア',
      keywords: ['link', 'url', 'リンク', 'ﾘﾝｸ'],
      icon: '🔗',
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        const url = window.prompt('リンク URL', 'https://');
        if (!url) return;
        const text = window.prompt('リンクテキスト（空ならURLそのまま）', '') || url;
        editor
          .chain()
          .focus()
          .insertContent(`<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeText(text)}</a>`)
          .run();
      },
    },
    {
      id: 'video',
      label: '動画 (YouTube)',
      hint: 'YouTube URL を埋め込み',
      shortcut: '/video',
      category: 'メディア',
      keywords: ['video', 'youtube', '動画', 'どうが', 'ようつべ'],
      icon: '▶',
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        const url = window.prompt('YouTube URL', 'https://www.youtube.com/watch?v=');
        if (!url) return;
        editor.commands.setYoutubeVideo({ src: url, width: 640, height: 360 });
      },
    },
    {
      id: 'emoji',
      label: '絵文字',
      hint: '`:smile:` 形式 / 直接貼り付け',
      shortcut: '/emoji',
      category: 'メディア',
      keywords: ['emoji', '絵文字', 'えもじ', ':)', 'smile'],
      icon: '😀',
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        const input = window.prompt(
          '挿入する絵文字を入力（直接貼り付けるか `:smile:` 形式）',
          '😀',
        );
        if (!input) return;
        const emoji = resolveEmojiShortcode(input);
        editor.chain().focus().insertContent(emoji).run();
      },
    },
  ];
}

/**
 * 簡易な絵文字ショートコード変換。
 * `:smile:` → `😀` のような変換をサポート。未知のショートコードはそのまま返す。
 */
const EMOJI_SHORTCODES: Record<string, string> = {
  smile: '😀',
  joy: '😂',
  heart: '❤️',
  fire: '🔥',
  star: '⭐',
  check: '✅',
  warning: '⚠️',
  bulb: '💡',
  sparkles: '✨',
  rocket: '🚀',
  '+1': '👍',
  thumbsup: '👍',
  '-1': '👎',
  coffee: '☕',
  tada: '🎉',
  point_right: '👉',
  pin: '📍',
};
function resolveEmojiShortcode(input: string): string {
  const m = input.trim().match(/^:([a-z0-9_+-]+):$/i);
  if (!m) return input;
  const key = m[1]!.toLowerCase();
  return EMOJI_SHORTCODES[key] ?? input;
}

/**
 * コールアウト挿入。TipTap の標準 node には無いので、装飾済みの
 * blockquote を HTML として直接挿入する。種類で絵文字 + 色を変える。
 */
function insertCallout(
  editor: Editor,
  range: { from: number; to: number },
  type: 'note' | 'warning' | 'tip',
) {
  const config: Record<typeof type, { emoji: string; bg: string; border: string }> = {
    note: { emoji: '💡', bg: '#eff6ff', border: '#3b82f6' },
    warning: { emoji: '⚠️', bg: '#fefce8', border: '#eab308' },
    tip: { emoji: '✨', bg: '#ecfdf5', border: '#10b981' },
  };
  const c = config[type];
  // blockquote 要素として挿入することで、改行/編集が自然にできる。
  const html =
    `<blockquote data-callout="${type}" style="border-left:4px solid ${c.border};background:${c.bg};padding:0.75em 1em;border-radius:6px;margin:1em 0;">` +
    `<p><span aria-hidden="true" style="margin-right:0.5em">${c.emoji}</span>${type === 'note' ? '補足' : type === 'warning' ? '注意' : 'ヒント'}: ここに本文を書く</p>` +
    `</blockquote><p></p>`;
  editor.chain().focus().deleteRange(range).insertContent(html).run();
}

/**
 * Phase C: 本文中に「ここから下を有料」区切り（ペイウォール境界）を 1 箇所だけ挿入する。
 *
 * - 既に境界が存在する場合は新規挿入せず toast で案内する（境界は常に 1 本）。
 * - 区切りは `<hr data-paywall="true">` として挿入し、保存時に
 *   lib/editor/paywallMarker.ts の splitBodyByPaywall がこれを境界に body/body_paid を分割する。
 */
function insertPaywallDivider(editor: Editor) {
  const html = editor.getHTML();
  if (/data-paywall/i.test(html)) {
    toast.info('有料の区切りは 1 記事に 1 つだけです');
    return;
  }
  editor
    .chain()
    .focus()
    .insertContent(
      '<hr data-paywall="true"><p></p>',
    )
    .run();
}

function escapeAttr(s: string) {
  return s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeText(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * カーソル直前の `/<query>` を抽出する。
 * - `/` が見つからないか、空白を挟んでいる場合は null。
 * - `/見出し` のように query 部分のみを返す（先頭 `/` は含めない）。
 */
function readSlashQuery(editor: Editor): { from: number; to: number; query: string } | null {
  const { from, $from } = editor.state.selection;
  // 同一テキストノード内のみ走査。ブロック頭からカーソルまでの文字を取得
  const start = $from.start();
  const textBefore = editor.state.doc.textBetween(start, from, '\n', '\n');
  // 末尾の `/<word>` を正規表現で取り出す。空白で区切られていないこと
  const match = textBefore.match(/(?:^|[\s])(\/[^\s/]*)$/) || textBefore.match(/^(\/[^\s/]*)$/);
  if (!match) return null;
  const slashLiteral = match[1]!;
  const slashStart = from - slashLiteral.length;
  return { from: slashStart, to: from, query: slashLiteral.slice(1) };
}

// =============================================================================
// スラッシュメニューの浮上 UI
// =============================================================================

function SlashMenu({
  editor,
  pickImage,
  containerRef,
}: {
  editor: Editor | null;
  pickImage: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
}) {
  const all = useMemo(buildCommands, []);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [range, setRange] = useState<{ from: number; to: number } | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [active, setActive] = useState(0);

  // 候補リスト（query で絞り込み）
  const items = useMemo(() => {
    if (!query) return all;
    const q = query.toLowerCase();
    return all.filter((c) =>
      [c.label, c.id, ...c.keywords].some((k) => k.toLowerCase().includes(q)),
    );
  }, [all, query]);

  // editor の transaction を購読し、スラッシュ状態を更新
  useEffect(() => {
    if (!editor) return;
    const update = () => {
      if (!editor.isFocused) {
        setOpen(false);
        return;
      }
      const q = readSlashQuery(editor);
      if (!q) {
        setOpen(false);
        return;
      }
      setRange({ from: q.from, to: q.to });
      setQuery(q.query);
      setActive(0);
      // カーソル座標を取得して浮上位置を決定
      try {
        const coords = editor.view.coordsAtPos(q.from);
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
          setPos({
            top: coords.bottom - containerRect.top + 4,
            left: coords.left - containerRect.left,
          });
        }
      } catch {
        // coordsAtPos が失敗するケース（DOM 未マウント）は無視
      }
      setOpen(true);
    };
    editor.on('selectionUpdate', update);
    editor.on('update', update);
    editor.on('blur', () => {
      // blur 時はメニューを閉じる。ただし押下を許すため遅延
      setTimeout(() => setOpen(false), 150);
    });
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('update', update);
    };
  }, [editor, containerRef]);

  // active が items 範囲を超えたら 0 にリセット
  useEffect(() => {
    if (active >= items.length) setActive(0);
  }, [items.length, active]);

  // キーボード操作（↑↓ Enter Esc）
  useEffect(() => {
    if (!editor || !open) return;
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((i) => (items.length === 0 ? 0 : (i + 1) % items.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((i) =>
          items.length === 0 ? 0 : (i - 1 + items.length) % items.length,
        );
      } else if (e.key === 'Enter') {
        if (items.length === 0) return;
        e.preventDefault();
        const cmd = items[active];
        if (cmd && range) {
          cmd.run({ editor, range, pickImage });
          setOpen(false);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    // capture 段階で拾うことで TipTap の keydown より先に処理
    window.addEventListener('keydown', handler, { capture: true });
    return () =>
      window.removeEventListener('keydown', handler, { capture: true });
  }, [editor, open, items, active, range, pickImage]);

  if (!open || !editor) return null;

  // #3: カテゴリでグループ化
  const grouped: Array<{ category: SlashCategory; items: SlashCommand[] }> = [];
  for (const cmd of items) {
    let group = grouped.find((g) => g.category === cmd.category);
    if (!group) {
      group = { category: cmd.category, items: [] };
      grouped.push(group);
    }
    group.items.push(cmd);
  }
  // フラットなインデックス → cmd 写像（active 移動と一致させる）
  const flatItems = grouped.flatMap((g) => g.items);

  return (
    <div
      role="listbox"
      aria-label="ブロック挿入メニュー"
      className="absolute z-30 max-h-80 w-72 overflow-y-auto rounded-md border border-border bg-card p-1 shadow-xl"
      style={{ top: pos.top, left: pos.left }}
      // クリックでフォーカスが外れないように
      onMouseDown={(e) => e.preventDefault()}
    >
      {flatItems.length === 0 ? (
        <p className="px-3 py-2 text-[12px] text-foreground/55">
          一致するブロックがありません
        </p>
      ) : (
        grouped.map((group) => (
          <div key={group.category} className="mb-1 last:mb-0">
            <p className="px-2 pb-0.5 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/40">
              {group.category}
            </p>
            {group.items.map((cmd) => {
              const flatIdx = flatItems.indexOf(cmd);
              const isActive = flatIdx === active;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => setActive(flatIdx)}
                  onClick={() => {
                    if (range) {
                      cmd.run({ editor, range, pickImage });
                      setOpen(false);
                    }
                  }}
                  className={
                    'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12px] transition ' +
                    (isActive
                      ? 'bg-primary-500/15 text-primary-300'
                      : 'text-foreground/80 hover:bg-muted')
                  }
                >
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-muted text-[12px] font-bold text-foreground/70">
                    {cmd.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{cmd.label}</span>
                    <span className="block truncate text-[10px] text-foreground/55">
                      {cmd.hint}
                    </span>
                  </span>
                  {cmd.shortcut ? (
                    <kbd className="ml-1 rounded-sm border border-border bg-background px-1 text-[9px] font-bold text-foreground/55">
                      {cmd.shortcut}
                    </kbd>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}

// =============================================================================
// バブルメニュー（選択時のインラインツールバー）
// =============================================================================

function InlineBubbleMenu({
  editor,
  containerRef,
}: {
  editor: Editor | null;
  containerRef: React.RefObject<HTMLDivElement>;
}) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const { from, to, empty } = editor.state.selection;
      if (empty || !editor.isFocused) {
        setVisible(false);
        return;
      }
      try {
        const start = editor.view.coordsAtPos(from);
        const end = editor.view.coordsAtPos(to);
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return;
        const left = (start.left + end.left) / 2 - containerRect.left - 80;
        const top = start.top - containerRect.top - 40;
        setPos({ top, left: Math.max(0, left) });
        setVisible(true);
      } catch {
        setVisible(false);
      }
    };
    editor.on('selectionUpdate', update);
    editor.on('blur', () => setTimeout(() => setVisible(false), 100));
    editor.on('focus', update);
    return () => {
      editor.off('selectionUpdate', update);
    };
  }, [editor, containerRef]);

  if (!visible || !editor) return null;

  const onLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('リンク URL', prev ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url })
        .run();
    }
  };

  return (
    <div
      role="toolbar"
      aria-label="選択範囲ツールバー"
      className="absolute z-30 flex items-center gap-1 rounded-md border border-border bg-card px-1 py-1 shadow-lg"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <BubbleBtn
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        ariaLabel="太字"
      >
        <b>B</b>
      </BubbleBtn>
      <BubbleBtn
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        ariaLabel="斜体"
      >
        <i>I</i>
      </BubbleBtn>
      <BubbleBtn
        active={editor.isActive('link')}
        onClick={onLink}
        ariaLabel="リンク"
      >
        🔗
      </BubbleBtn>
    </div>
  );
}

function BubbleBtn({
  onClick,
  active,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      title={ariaLabel}
      onClick={onClick}
      className={
        'inline-flex h-7 min-w-7 items-center justify-center rounded-sm px-2 text-[12px] transition ' +
        (active
          ? 'bg-primary-500/15 text-primary-300'
          : 'text-foreground/80 hover:bg-muted')
      }
    >
      {children}
    </button>
  );
}

// =============================================================================
// 本体
// =============================================================================

/**
 * Phase C: `horizontalRule` ノードに `data-paywall` 属性を追加するグローバル拡張。
 *
 * StarterKit 標準の HorizontalRule は未知の属性を parse 時に捨ててしまうため、
 * `<hr data-paywall="true">`（ペイウォール境界）を round-trip させるには、
 * 属性を明示的に許可する必要がある。属性付きの hr は CSS（globals.css の
 * `hr[data-paywall]`）で「ここから下が有料」ラインとして視覚化する。
 */
const PaywallHorizontalRule = Extension.create({
  name: 'paywallHorizontalRuleAttr',
  addGlobalAttributes() {
    return [
      {
        types: ['horizontalRule'],
        attributes: {
          'data-paywall': {
            default: null,
            parseHTML: (element: HTMLElement) =>
              element.getAttribute('data-paywall') === 'true' ? 'true' : null,
            renderHTML: (attributes: Record<string, unknown>) => {
              if (!attributes['data-paywall']) return {};
              return { 'data-paywall': 'true' };
            },
          },
        },
      },
    ];
  },
});

export function RichTextEditor({
  initialHtml,
  onChange,
  placeholder,
  showPaywallControl = false,
}: Props) {
  const [mounted, setMounted] = useState(false);
  // 本文中にペイウォール境界が存在するか（ボタンのラベル/状態を切り替える）
  const [hasPaywall, setHasPaywall] = useState<boolean>(() =>
    /data-paywall/i.test(initialHtml ?? ''),
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const editorRef = useRef<Editor | null>(null);

  // SSR で TipTap を実行しない（hydration mismatch 回避）
  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * 画像 File を Supabase Storage にアップロードして TipTap に挿入する共通ヘルパ。
   * クリップボードペースト・ドラッグドロップ・スラッシュメニューの 3 経路から呼ばれる。
   */
  const insertImagesFromFiles = useCallback(
    async (editor: Editor, files: File[]) => {
      if (files.length === 0) return;
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

  const pickImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onPickFile = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fd = new FormData();
    fd.append('file', files[0]!);
    startTransition(async () => {
      const res = await uploadImage(fd);
      if (res.ok) {
        editorRef.current?.chain().focus().setImage({ src: res.url }).run();
        toast.success('画像を挿入しました');
      } else {
        toast.error(res.error);
      }
    });
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      PaywallHorizontalRule,
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
      // #3: スラッシュメニュー拡張で必要になった TipTap 拡張群
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: false }),
      Table.configure({ resizable: false, HTMLAttributes: { class: 'rte-table' } }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: placeholder ?? '本文を書きましょう…  /  でメニュー',
      }),
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        // 2026-05 Notion ライク改修:
        //  - prose の文字サイズは globals.css の `.locore-editor` で上書き (15px)
        //  - スマホは min-h を 60vh、PC 70vh に拡張して書くスペースを広く取る
        //  - キーボード追従ツールバー (h≈48px) と被らないように padding-bottom を厚めに
        //  - padding は px-3 py-2 で詰めて画面横幅を活かす
        class:
          'locore-editor prose max-w-none rounded-md border border-border bg-card px-3 py-2 pb-16 min-h-[60vh] sm:min-h-[70vh] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
      },
      // クリップボード画像ペースト：cmd/ctrl+V で貼り付けた image を Supabase に上げて挿入
      handlePaste(view, event) {
        const files = extractImageFiles(event.clipboardData?.items);
        if (files.length === 0) return false;
        event.preventDefault();
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
      const nextHtml = editor.getHTML();
      onChange(nextHtml);
      setHasPaywall(/data-paywall/i.test(nextHtml));
      const view = editor.view as unknown as { _tiptapEditor?: Editor };
      view._tiptapEditor = editor;
    },
    onCreate: ({ editor }) => {
      const view = editor.view as unknown as { _tiptapEditor?: Editor };
      view._tiptapEditor = editor;
      editorRef.current = editor;
    },
    immediatelyRender: false,
  });

  // editorRef を最新に保つ
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // 親から initialHtml が変わった場合（モード切替時など）に内容を同期
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (initialHtml !== current) {
      editor.commands.setContent(initialHtml || '<p></p>', { emitUpdate: false });
      setHasPaywall(/data-paywall/i.test(initialHtml ?? ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHtml]);

  /** 「ここから下を有料に」ボタン: 境界が無ければ挿入、あれば解除する。 */
  const togglePaywallDivider = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    if (/data-paywall/i.test(ed.getHTML())) {
      // 既存の境界を通常の区切り線に戻す（= 全文無料に戻す）
      ed.chain().focus().updateAttributes('horizontalRule', { 'data-paywall': null }).run();
    } else {
      insertPaywallDivider(ed);
    }
  }, []);

  if (!mounted) {
    return (
      <div className="rounded-sm border border-border bg-card px-4 py-3 text-[13px] text-foreground/40">
        エディタを読み込み中…
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showPaywallControl ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={togglePaywallDivider}
            aria-pressed={hasPaywall}
            className={
              'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] font-semibold transition ' +
              (hasPaywall
                ? 'border-secondary-700/40 bg-secondary-50 text-secondary-700 hover:bg-secondary-50/70'
                : 'border-border bg-card text-foreground/75 hover:border-primary-500 hover:text-primary-300')
            }
          >
            <span aria-hidden>🔒</span>
            {hasPaywall ? '有料の区切りを解除' : 'ここから下を有料に'}
          </button>
          <span className="text-[11px] text-foreground/55">
            {hasPaywall
              ? 'この区切りより下が、購入後だけ表示されます。'
              : 'カーソル位置に「ここから下を有料」の区切りを 1 つ挿入できます。'}
          </span>
        </div>
      ) : null}
      <div ref={containerRef} className="relative">
        <EditorContent editor={editor} />
        <SlashMenu
          editor={editor}
          pickImage={pickImage}
          containerRef={containerRef}
        />
        <InlineBubbleMenu editor={editor} containerRef={containerRef} />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => onPickFile(e.target.files)}
        />
      </div>
      {/* スマホ用キーボード追従ツールバー (PC では非表示) */}
      <MobileEditorToolbar editor={editor} onPickImage={pickImage} />
      <p className="text-[11px] text-foreground/40">
        ヒント: 行頭で <kbd className="rounded-sm border border-border bg-muted px-1 text-[10px]">/</kbd> を打つとブロック挿入メニュー。
        文章を選択すると Bold / Italic / Link が浮上します。
        画像はコピー → 貼り付け（⌘V / Ctrl+V）／ドラッグ&ドロップでも追加できます。
        {isPending ? ' （画像アップロード中…）' : ''}
      </p>
    </div>
  );
}
