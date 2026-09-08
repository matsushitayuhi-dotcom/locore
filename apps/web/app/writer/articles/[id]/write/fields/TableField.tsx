'use client';

import { Fragment } from 'react';
import { Check, Minus, Plus, Trash2 } from 'lucide-react';
import type { ArticleBlock } from '@/lib/articles/blocks';
import {
  TABLE_COLS_MAX,
  TABLE_ROWS_MAX,
  addTableColumn,
  addTableRow,
  removeTableColumn,
  removeTableRow,
  setCell,
  tableSize,
} from '../blockOps';
import { AutoTextarea } from './AutoTextarea';
import type { BlockOf, FieldProps } from './types';
import { DASHED_BUTTON, ICON_BUTTON, SECTION_LABEL } from './ui';
import { useIsWide } from './useIsWide';

/**
 * 表（0091 / エディタ作り直し）。**セル単位で入力する**。
 *
 * 旧エディタは「1 つの textarea を | で parse」していたので、
 *   - セルの中に | を書けない（全角｜も未対応）
 *   - 行ごとに列数がズレると Prose 側の Math.max で表が崩れる
 * という壊れ方をしていた。ここでは 1 セル 1 入力欄にして、列数は操作でしか変わらないようにする。
 *
 * 402px では **1 行 = 1 カード**に展開する（列の見出しがラベル、その下に値の入力欄）。
 * 横スクロールのグリッドを指で編集させない。PC ではグリッドのまま編集できる。
 */
export function TableField(props: FieldProps<BlockOf<'table'>>) {
  const { block, blocks, apply, update, keymap, onFocusField } = props;
  const wide = useIsWide();
  const { rows: rowCount, cols: rawCols } = tableSize(block);
  const cols = Math.max(1, rawCols);
  const colIndexes = Array.from({ length: cols }, (_, i) => i);
  // Prose と同じ判定。header が undefined の既存記事は「1 行目が見出し」
  const hasHeader = block.header !== false;
  const headerCells = hasHeader ? (block.rows[0] ?? []) : [];

  const cellAt = (row: number, col: number) => block.rows[row]?.[col] ?? '';

  /** 列の名前。見出しが無い / 空なら「1 列目」 */
  const colLabel = (col: number) => {
    const head = headerCells[col]?.trim();
    return head && head.length > 0 ? head : `${col + 1} 列目`;
  };

  /**
   * セルを書き戻す。
   * setCell は「その行に col 番目のセルが既にある」ことを前提にしているので、
   * 既存記事のギザギザな行（列数が足りない行）を先に空文字で埋めてから渡す。
   */
  const writeCell = (row: number, col: number, text: string) =>
    update((bs) => setCell(padRow(bs, block.id, row, col), block.id, row, col, text));

  const setHeader = (on: boolean) =>
    update((bs) => bs.map((b) => (b.id === block.id && b.type === 'table' ? { ...b, header: on } : b)));

  const canAddRow = rowCount < TABLE_ROWS_MAX;
  const canAddCol = cols < TABLE_COLS_MAX;
  // 最後の 1 行 / 1 列を消すと blockOps 側が「表ごと削除」に落ちる（removeTableRow / removeTableColumn）。
  // 「列を削除」と書いてあるボタンで表全体（他の列の文字）が消えるのは事故なので、ここで止める。
  // 表そのものを消すのは書式バーの「削除」の仕事
  const canRemoveRow = rowCount > 1;
  const canRemoveCol = cols > 1;

  const cell = (row: number, col: number, label: string, head: boolean) => (
    <AutoTextarea
      pos={{ blockId: block.id, row, col }}
      value={cellAt(row, col)}
      onChange={(v) => writeCell(row, col, v)}
      keymap={keymap}
      onFocusField={onFocusField}
      singleLine
      boxed
      ariaLabel={label}
      className={head ? 'text-[16px] font-bold text-foreground' : 'text-[16px] text-neutral-900'}
    />
  );

  /**
   * 行と列の増減。
   * 「列を減らす」は狭い画面にだけ出す（広い画面は列ごとのゴミ箱がある）。
   * 1 行目を見出しにしていない表では列ごとのゴミ箱が画面に出ないので、
   * ここが無いと **402px では列を増やせるのに減らせない**（右端の列を消す）
   */
  const controls = (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => apply(addTableRow(blocks, block.id))}
        disabled={!canAddRow}
        className={DASHED_BUTTON + ' flex-1 px-4 disabled:opacity-40'}
      >
        <Plus className="h-4 w-4" aria-hidden /> 行を追加
      </button>
      <button
        type="button"
        onClick={() => apply(addTableColumn(blocks, block.id))}
        disabled={!canAddCol}
        className={DASHED_BUTTON + ' flex-1 px-4 disabled:opacity-40'}
      >
        <Plus className="h-4 w-4" aria-hidden /> 列を追加
      </button>
      {!wide ? (
        <button
          type="button"
          onClick={() => apply(removeTableColumn(blocks, block.id, cols - 1))}
          disabled={!canRemoveCol}
          className={DASHED_BUTTON + ' w-full px-4 disabled:opacity-40'}
        >
          <Minus className="h-4 w-4" aria-hidden /> いちばん右の列を減らす
        </button>
      ) : null}
    </div>
  );

  /** 1 行目を見出しにするかの切り替え。チェックボックスではなく 44px のトグルにする */
  const headerToggle = (
    <button
      type="button"
      role="switch"
      aria-checked={hasHeader}
      onClick={() => setHeader(!hasHeader)}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border-strong bg-card px-4 text-[14px] font-bold text-foreground"
    >
      <span
        aria-hidden
        className={
          'grid h-5 w-5 place-items-center rounded border ' +
          (hasHeader ? 'border-foreground bg-foreground text-white' : 'border-border-strong bg-card text-transparent')
        }
      >
        <Check className="h-3.5 w-3.5" />
      </span>
      1 行目を見出しにする
    </button>
  );

  if (wide) {
    // ── PC: グリッドのまま編集する（マウスなら横に長くても扱える） ──
    return (
      <div>
        {headerToggle}
        <div className="mt-2 overflow-x-auto">
          <div
            className="grid min-w-max gap-1"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(140px, 1fr)) 44px` }}
          >
            {colIndexes.map((col) => (
              <div key={`del-col-${col}`} className="flex justify-center">
                <button
                  type="button"
                  onClick={() => apply(removeTableColumn(blocks, block.id, col))}
                  disabled={!canRemoveCol}
                  className={ICON_BUTTON + ' disabled:opacity-30'}
                  aria-label={`${colLabel(col)}の列を削除`}
                  title={canRemoveCol ? 'この列を削除' : '最後の 1 列は消せません'}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ))}
            <div />
            {block.rows.map((_, row) => (
              <Fragment key={`row-${row}`}>
                {colIndexes.map((col) => (
                  <div key={`c-${row}-${col}`}>
                    {cell(
                      row,
                      col,
                      hasHeader && row === 0 ? `${col + 1} 列目の見出し` : `${row + 1} 行目の ${colLabel(col)}`,
                      hasHeader && row === 0,
                    )}
                  </div>
                ))}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => apply(removeTableRow(blocks, block.id, row))}
                    disabled={!canRemoveRow}
                    className={ICON_BUTTON + ' disabled:opacity-30'}
                    aria-label={`${row + 1} 行目を削除`}
                    title={canRemoveRow ? 'この行を削除' : '最後の 1 行は消せません'}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
        {controls}
      </div>
    );
  }

  // ── 402px: 1 行 = 1 カード。列の見出しがラベルになる ──
  const dataRows = block.rows.map((_, row) => row).filter((row) => !(hasHeader && row === 0));

  return (
    <div>
      {headerToggle}
      {hasHeader ? (
        <div className="mt-2 rounded-lg border border-border bg-muted p-3">
          <p className={SECTION_LABEL}>列の見出し</p>
          <div className="mt-1 space-y-1">
            {colIndexes.map((col) => (
              <div key={`h-${col}`} className="flex items-center gap-1">
                <div className="min-w-0 flex-1">{cell(0, col, `${col + 1} 列目の見出し`, true)}</div>
                <button
                  type="button"
                  onClick={() => apply(removeTableColumn(blocks, block.id, col))}
                  disabled={!canRemoveCol}
                  className={ICON_BUTTON + ' disabled:opacity-30'}
                  aria-label={`${colLabel(col)}の列を削除`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-2 space-y-2">
        {dataRows.map((row, i) => (
          <div key={`card-${row}`} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <p className={SECTION_LABEL}>{i + 1} 行目</p>
              <button
                type="button"
                onClick={() => apply(removeTableRow(blocks, block.id, row))}
                disabled={!canRemoveRow}
                className={ICON_BUTTON + ' disabled:opacity-30'}
                aria-label={`${i + 1} 行目を削除`}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="space-y-2">
              {colIndexes.map((col) => (
                <div key={`c-${row}-${col}`}>
                  <p className="mb-1 text-[13px] text-neutral-500">{colLabel(col)}</p>
                  {cell(row, col, `${i + 1} 行目の ${colLabel(col)}`, false)}
                </div>
              ))}
            </div>
          </div>
        ))}
        {/* 見出しだけで中身の行が 1 つも無いとき、追加ボタンだけが出るようにしておく */}
        {dataRows.length === 0 ? <p className="text-[13px] text-neutral-500">「行を追加」で中身を入れます</p> : null}
      </div>
      {controls}
    </div>
  );
}

/** setCell が書けるように、その行を col 番目まで空文字で伸ばす（既存記事の列数がそろっていない表への備え） */
function padRow(blocks: ArticleBlock[], id: string, row: number, col: number): ArticleBlock[] {
  return blocks.map((b) => {
    if (b.id !== id || b.type !== 'table') return b;
    const target = b.rows[row];
    if (!target || target.length > col || col >= TABLE_COLS_MAX) return b;
    const rows = b.rows.map((r) => r.slice());
    const line = rows[row];
    if (!line) return b;
    while (line.length <= col) line.push('');
    return { ...b, rows };
  });
}
