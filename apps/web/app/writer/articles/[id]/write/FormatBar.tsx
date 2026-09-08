'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  Copy,
  Heading2,
  Image as ImageIcon,
  Link as LinkIcon,
  List,
  Plus,
  Quote,
  Rows3,
  Shapes,
  Trash2,
  Undo2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { EditorKind } from './BLOCK_KINDS';

/**
 * 書式バー（0091 / エディタ作り直し）。操作の中心はここ。
 *
 * - ソフトキーボードの**真上**に固定する（visualViewport の resize / scroll を購読）。
 *   visualViewport が無い環境は position: sticky; bottom: 0 にフォールバック。
 * - ボタンは全部 44×44px 以上。402px に **8 個まで**しか置かない（9 個目は画面外に出る）。
 * - 各ボタンは「いまカーソルがある行の書式を変えるトグル」。挿入ではない。
 * - 「この行」を押すと ↑ / ↓ / 複製 / 削除 のペインに切り替わる。
 *   文字が打てないブロック（写真・区切り線・リンク）を選んだときは自動でそちらに移る。
 *
 * ここに「見る（プレビュー）」を置いていないのは、
 *   - 402px に 8 個より多く並べると右端が画面外に出て、隠れていること自体が伝わらないため
 *   - 見る／書くは行ではなく**記事全体**の切り替えで、保存状態と同じ「記事の状態」だから
 * ヘッダ（BlockEditor）の 44px のボタンに置いた。バーは行に効くものだけにしてある。
 */

export type FormatBarProps = {
  /** 今カーソルがある行の種類。null＝未選択、または書式を持たないブロック */
  kind: EditorKind | null;
  /** 文字が打てるブロックにカーソルがある（＝書式トグルが効く） */
  canFormat: boolean;
  /** 何かのブロックが選ばれている */
  hasBlock: boolean;
  canUndo: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onInsert: () => void;
  onHeading: () => void;
  onList: () => void;
  onQuote: () => void;
  onPhoto: () => void;
  onLink: () => void;
  onUndo: () => void;
  onTurnInto: () => void;
  onMove: (dir: 'up' | 'down') => void;
  onDuplicate: () => void;
  onRemove: () => void;
};

type BtnProps = {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  /** true: 押してもキャレットを textarea に残す（キーボードを閉じない） */
  keepFocus?: boolean;
  danger?: boolean;
};

function Btn({ icon: Icon, label, onClick, active = false, disabled = false, keepFocus = false, danger = false }: BtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      // 押した瞬間にフォーカスが移るとキーボードが閉じてキャレットも消える。
      // その場で効かせたいボタン（書式トグル・移動・複製）は pointerdown を止めて手放さない
      onPointerDown={keepFocus ? (e) => e.preventDefault() : undefined}
      className={
        'flex h-11 min-w-[44px] shrink-0 flex-col items-center justify-center gap-[1px] rounded-lg px-1.5 transition ' +
        (disabled
          ? 'text-neutral-300'
          : danger
            ? 'text-danger-500 hover:bg-danger-50'
            : active
              ? 'bg-neutral-900 text-white'
              : 'text-neutral-700 hover:bg-neutral-100')
      }
    >
      <Icon className="h-[17px] w-[17px]" aria-hidden />
      {/* プロのライターでない書き手向けなので、アイコンだけにせず日本語を必ず添える（11px） */}
      <span className="whitespace-nowrap text-[11px] leading-none tracking-[0.01em]">{label}</span>
    </button>
  );
}

export function FormatBar(props: FormatBarProps) {
  const { kind, canFormat, hasBlock } = props;
  const [pane, setPane] = useState<'format' | 'block'>('format');

  // 文字が打てないブロック（写真・区切り線・リンク）を選んだら「この行」ペインへ。
  // 書式トグルが効く行に戻ったら書式ペインへ戻す。
  // deps は canFormat / hasBlock だけなので、書き手が自分でペインを切り替えたぶんは上書きしない
  useEffect(() => {
    setPane(canFormat ? 'format' : hasBlock ? 'block' : 'format');
  }, [canFormat, hasBlock]);

  // ===== キーボードの真上に置く =====
  const [lift, setLift] = useState(0);
  const [fixed, setFixed] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return; // 未対応: sticky bottom-0 のまま
    setFixed(true);
    const update = () => {
      // ソフトキーボードが隠している高さ＝レイアウト全体の高さ − 見えている領域
      const gap = window.innerHeight - vv.height - vv.offsetTop;
      setLift(gap > 60 ? Math.round(gap) : 0); // 60px 未満はアドレスバーの伸縮とみなして無視
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('orientationchange', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  // ===== 右端の見切れ =====
  // 320px の端末では 8 個でも収まらない。スクロールバーを消しているので、
  // 「まだ右に続く」ことを影で見せないと隠れていること自体が伝わらない
  const scroller = useRef<HTMLDivElement | null>(null);
  const [more, setMore] = useState(false);
  const checkEdge = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setMore(el.scrollWidth - el.clientWidth - el.scrollLeft > 4);
  }, []);
  useEffect(() => {
    checkEdge();
    const el = scroller.current;
    if (!el) return;
    el.addEventListener('scroll', checkEdge, { passive: true });
    window.addEventListener('resize', checkEdge);
    return () => {
      el.removeEventListener('scroll', checkEdge);
      window.removeEventListener('resize', checkEdge);
    };
  }, [checkEdge]);
  // 並ぶボタンが入れ替わったら測り直す
  useEffect(() => {
    checkEdge();
  }, [checkEdge, pane, kind, canFormat, hasBlock]);

  const headingActive = kind === 'heading2' || kind === 'heading3';
  const listActive = kind === 'bullet' || kind === 'number';

  return (
    <div
      role="toolbar"
      aria-label="書式"
      // bg-white/97 は Tailwind の opacity スケールに無く CSS が 1 行も出ない（＝背景が消えて本文が透ける）。
      // ヘッダと同じ /95 に揃える
      className={
        'z-40 border-t border-border bg-white/95 backdrop-blur ' +
        (fixed ? 'fixed inset-x-0 bottom-0' : 'sticky bottom-0')
      }
      style={{
        transform: lift ? `translateY(-${lift}px)` : undefined,
        paddingBottom: lift ? 0 : 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="relative mx-auto max-w-[720px]">
        <div
          ref={scroller}
          className="flex h-[52px] items-center gap-0.5 overflow-x-auto px-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {pane === 'block' ? (
            <>
              {/* canFormat が false でも必ず出す。これが消えると写真・区切り線・リンクを選んでいる間、
                  書式ペインにしかない「戻す」「写真」「リンク」に触れなくなる */}
              <Btn icon={ChevronLeft} label="書式" onClick={() => setPane('format')} keepFocus />
              <Btn icon={Shapes} label="種類" onClick={props.onTurnInto} disabled={!canFormat} />
              <Btn icon={ArrowUp} label="上へ" onClick={() => props.onMove('up')} disabled={!props.canMoveUp} keepFocus />
              <Btn icon={ArrowDown} label="下へ" onClick={() => props.onMove('down')} disabled={!props.canMoveDown} keepFocus />
              <Btn icon={Copy} label="複製" onClick={props.onDuplicate} disabled={!hasBlock} keepFocus />
              <Btn icon={Trash2} label="削除" onClick={props.onRemove} disabled={!hasBlock} keepFocus danger />
              {/* 「戻す」はペインをまたいで常に触れるようにする（消したあと取り消したいのがここ） */}
              <Btn icon={Undo2} label="戻す" onClick={props.onUndo} disabled={!props.canUndo} keepFocus />
              <Btn icon={Plus} label="追加" onClick={props.onInsert} />
            </>
          ) : (
            <>
              <Btn icon={Plus} label="追加" onClick={props.onInsert} />
              <Btn
                icon={Heading2}
                label={kind === 'heading3' ? '小見出し' : '見出し'}
                onClick={props.onHeading}
                active={headingActive}
                disabled={!canFormat}
                keepFocus
              />
              <Btn
                icon={List}
                label={kind === 'number' ? '番号つき' : '箇条書き'}
                onClick={props.onList}
                active={listActive}
                disabled={!canFormat}
                keepFocus
              />
              <Btn icon={Quote} label="引用" onClick={props.onQuote} active={kind === 'quote'} disabled={!canFormat} keepFocus />
              <Btn icon={ImageIcon} label="写真" onClick={props.onPhoto} keepFocus />
              <Btn icon={LinkIcon} label="リンク" onClick={props.onLink} />
              <Btn icon={Undo2} label="戻す" onClick={props.onUndo} disabled={!props.canUndo} keepFocus />
              {/* 「ブロック」は実装用語なので出さない。書き手の言葉で「この行」 */}
              <Btn icon={Rows3} label="この行" onClick={() => setPane('block')} disabled={!hasBlock} keepFocus />
            </>
          )}
        </div>
        {more ? (
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-8 rounded-l-sm bg-gradient-to-l from-white via-white/80 to-transparent"
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  );
}
