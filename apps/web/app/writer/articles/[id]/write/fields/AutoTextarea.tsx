'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import type { BlockKeymap, FieldPos } from '../useBlockKeymap';
import { useFieldRegister } from './fieldFocus';
import { BARE_INPUT, BOXED_INPUT } from './ui';

/**
 * 全部の文字入力の土台（0091 / エディタ作り直し）。
 *
 * ここが 1 つしかないことが大事:
 *   - キー処理は必ず useBlockKeymap を通す（＝ IME の分岐が 1 か所にしか無い）
 *   - fieldFocus に自分の場所を登録する（＝ 構造が変わってもキャレットを戻せる）
 *   - 高さは中身に合わせて伸ばす（スマホで縦スクロールが二重にならないように）
 *
 * font-size は呼び出し側の className で決めるが、**16px を下回るものは渡さないこと**。
 */

export type AutoTextareaProps = {
  /** この入力欄の場所。リストの項目・表のセルは row / col まで指定する */
  pos: FieldPos;
  value: string;
  onChange: (value: string) => void;
  keymap: BlockKeymap;
  placeholder?: string;
  /** 文字の大きさ・太さ。16px 以上にすること */
  className?: string;
  /** 見出し・リスト項目・表のセルなど 1 行しか許さない欄 */
  singleLine?: boolean;
  /** 読み上げ用の名前（見た目のラベルを置かない欄に付ける） */
  ariaLabel?: string;
  onFocusField?: (pos: FieldPos) => void;
  /** 写真の貼り付けなど、入力欄の上でのペーストを拾いたいとき */
  onPasteFiles?: (files: FileList) => void;
  /**
   * 文字の貼り付けを横取りしたいとき（true を返したら自分で処理した扱い）。
   * 1 行しか入らない欄（箇条書きの項目）に複数行を貼られたときに使う。
   */
  onPasteText?: (text: string, el: HTMLTextAreaElement) => boolean;
  /** 枠線のある入力欄にする（表のセルなど、どこが 1 つの欄か見えたほうがよいところ） */
  boxed?: boolean;
};

export function AutoTextarea({
  pos,
  value,
  onChange,
  keymap,
  placeholder,
  className = 'text-[17px] leading-[1.9]',
  singleLine = false,
  ariaLabel,
  onFocusField,
  onPasteFiles,
  onPasteText,
  boxed = false,
}: AutoTextareaProps) {
  const el = useRef<HTMLTextAreaElement | null>(null);
  const register = useFieldRegister(pos);
  const setRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      el.current = node;
      register(node);
    },
    [register],
  );

  useAutoHeight(el, value);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    // markdown ショートカット（"# " や "- "）で処理済みなら、自分では書き戻さない
    if (keymap.handleInput(e, pos)) return;
    const next = singleLine ? e.currentTarget.value.replace(/\n/g, ' ') : e.currentTarget.value;
    onChange(next);
  };

  return (
    <textarea
      ref={setRef}
      value={value}
      rows={1}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={handleChange}
      onKeyDown={(e) => keymap.onKeyDown(e, pos)}
      onFocus={() => onFocusField?.(pos)}
      onPaste={(e) => {
        const files = e.clipboardData?.files;
        if (onPasteFiles && files && files.length > 0) {
          e.preventDefault();
          onPasteFiles(files);
          return;
        }
        // 複数行の貼り付けを項目ごとに分けたいとき（箇条書き）。横取りしなければ素通し
        if (!onPasteText) return;
        const text = e.clipboardData?.getData('text/plain') ?? '';
        if (!text || !onPasteText(text, e.currentTarget)) return;
        e.preventDefault();
      }}
      className={(boxed ? BOXED_INPUT + ' resize-none overflow-hidden' : BARE_INPUT) + ' ' + className}
    />
  );
}

/**
 * 中身に合わせて高さを合わせる。
 * フォント読み込み後と幅の変化でも測り直す（初回だけ 1 行ぶん短くなるのを防ぐ）。
 */
function useAutoHeight(ref: { current: HTMLTextAreaElement | null }, value: string): void {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const fit = () => {
      node.style.height = '0px';
      // box-sizing: border-box なので、scrollHeight（＝内容＋padding）に枠線ぶんを足さないと
      // 最後の行が数 px 切れる。offsetHeight - clientHeight が上下の枠線
      const borders = node.offsetHeight - node.clientHeight;
      node.style.height = `${node.scrollHeight + borders}px`;
    };
    fit();
    const raf = requestAnimationFrame(fit);
    const onResize = () => fit();
    window.addEventListener('resize', onResize);
    let cancelled = false;
    if (typeof document !== 'undefined' && 'fonts' in document) {
      void (document as Document & { fonts: FontFaceSet }).fonts.ready.then(() => {
        if (!cancelled) fit();
      });
    }
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [ref, value]);
}
