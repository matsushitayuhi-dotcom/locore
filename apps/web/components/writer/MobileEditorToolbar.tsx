'use client';

import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';

/**
 * Notion 風キーボード追従ツールバー (2026-05 改修)
 *
 * スマホで本文エディタが focus されたとき、ソフトウェアキーボードの直上に
 * 浮く形でクイックアクションバーを出す。
 *
 * 実装ポイント:
 * - `window.visualViewport` API でキーボード高さを検出 (iOS Safari 15+ / Android Chrome)
 *   - `visualViewport.height` の変化を監視し、`bottom` 位置を動的調整
 *   - キーボードが predictive text 等で動的にサイズ変化しても追従する
 * - editor の `focus` / `blur` を購読し、focus 中だけ表示
 * - PC では非表示 (`md:hidden`)
 * - 各ボタンは `onMouseDown` を preventDefault してフォーカスを失わせない
 *
 * Slot:
 *   - スラッシュメニュー (/) は親 RichTextEditor が既に持っているので、
 *     ここでは「行頭に `/` を挿入してフォーカスを戻すだけ」のショートカットに留める。
 */

type Props = {
  editor: Editor | null;
  /** 画像ファイル選択ダイアログを開く（RichTextEditor が提供） */
  onPickImage: () => void;
};

export function MobileEditorToolbar({ editor, onPickImage }: Props) {
  const [isFocused, setIsFocused] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  // editor の focus / blur を購読
  useEffect(() => {
    if (!editor) return;
    const onFocus = () => setIsFocused(true);
    // blur は遅延 — ツールバーボタン押下時に一瞬 blur しても消えないように
    const onBlur = () => {
      setTimeout(() => {
        if (!editor.isFocused) setIsFocused(false);
      }, 150);
    };
    editor.on('focus', onFocus);
    editor.on('blur', onBlur);
    return () => {
      editor.off('focus', onFocus);
      editor.off('blur', onBlur);
    };
  }, [editor]);

  // visualViewport でキーボード高さを追跡
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) {
      setKeyboardOffset(0);
      return;
    }
    const handleResize = () => {
      // window.innerHeight - vv.height - vv.offsetTop
      //   キーボードが出ていない時: innerHeight === vv.height で 0
      //   出ている時: innerHeight > vv.height となり、その差分 ≒ キーボード高さ
      const offset = Math.max(
        0,
        window.innerHeight - vv.height - vv.offsetTop,
      );
      setKeyboardOffset(offset);
    };
    handleResize();
    vv.addEventListener('resize', handleResize);
    vv.addEventListener('scroll', handleResize);
    return () => {
      vv.removeEventListener('resize', handleResize);
      vv.removeEventListener('scroll', handleResize);
    };
  }, []);

  if (!editor || !isFocused) return null;

  /**
   * editor のフォーカスを保ったまま action を実行する共通ハンドラ。
   * `onMouseDown` / `onTouchStart` で preventDefault する。
   */
  const action = (fn: () => void) => (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  // スラッシュメニュー呼び出し: 現在のカーソル位置に `/` を挿入するだけ。
  // 親 RichTextEditor の SlashMenu が文字列 `/` を検出して自動的に開く。
  const triggerSlash = () => {
    editor.chain().focus().insertContent('/').run();
  };

  return (
    <div
      // PC は非表示 (md 未満で表示)
      className="locore-mobile-toolbar fixed left-0 right-0 z-40 flex items-center gap-1 overflow-x-auto border-t border-border bg-card px-2 py-1.5 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.12)] md:hidden"
      style={{ bottom: keyboardOffset }}
      role="toolbar"
      aria-label="本文クイックツールバー"
      // タップで editor の blur を起こさない
      onMouseDown={(e) => e.preventDefault()}
      onTouchStart={(e) => {
        // ボタン自体は onTouchStart で個別に preventDefault するため、ここでは
        // バー内の空白部分のみを抑止したい。target が DIV のときだけ抑止。
        if ((e.target as HTMLElement).tagName === 'DIV') e.preventDefault();
      }}
    >
      <ToolbarBtn
        label="太字"
        active={editor.isActive('bold')}
        onAction={action(() => editor.chain().focus().toggleBold().run())}
      >
        <b>B</b>
      </ToolbarBtn>
      <ToolbarBtn
        label="斜体"
        active={editor.isActive('italic')}
        onAction={action(() => editor.chain().focus().toggleItalic().run())}
      >
        <i>I</i>
      </ToolbarBtn>
      <ToolbarBtn
        label="見出し H2"
        active={editor.isActive('heading', { level: 2 })}
        onAction={action(() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run(),
        )}
      >
        <span className="text-[13px] font-bold">H2</span>
      </ToolbarBtn>
      <ToolbarBtn
        label="箇条書きリスト"
        active={editor.isActive('bulletList')}
        onAction={action(() => editor.chain().focus().toggleBulletList().run())}
      >
        <span aria-hidden="true">•</span>
      </ToolbarBtn>
      <ToolbarBtn
        label="チェックリスト"
        active={editor.isActive('taskList')}
        onAction={action(() => editor.chain().focus().toggleTaskList().run())}
      >
        <span aria-hidden="true">☑</span>
      </ToolbarBtn>
      <ToolbarBtn label="画像を挿入" onAction={action(onPickImage)}>
        <span aria-hidden="true">📷</span>
      </ToolbarBtn>
      <ToolbarBtn label="ブロック挿入メニュー" onAction={action(triggerSlash)}>
        <span aria-hidden="true">/</span>
      </ToolbarBtn>
    </div>
  );
}

function ToolbarBtn({
  children,
  label,
  active,
  onAction,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  onAction: (e: React.MouseEvent | React.TouchEvent) => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      // mouse / touch どちらでも editor の focus を保つ
      onMouseDown={onAction}
      onTouchStart={onAction}
      className={
        'inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-md px-3 text-[15px] transition ' +
        (active
          ? 'bg-primary-500/15 text-primary-700'
          : 'text-foreground/85 hover:bg-muted active:bg-muted')
      }
    >
      {children}
    </button>
  );
}
