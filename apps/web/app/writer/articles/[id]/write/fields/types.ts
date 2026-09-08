import type { ArticleBlock } from '@/lib/articles/blocks';
import type { OpResult } from '../blockOps';
import type { BlockKeymap, FieldPos } from '../useBlockKeymap';

/**
 * 各ブロックの編集 UI に共通で渡すもの（0091 / エディタ作り直し）。
 *
 * 分け方:
 *   - update … 1 文字打つたびの書き戻し。**キャレットは動かない**。関数形なので最新の配列に必ず当たる
 *   - apply  … 行や列が増える・種類が変わるなど、構造が変わる操作。caret があればそこへ戻す
 * この 2 つを分けておくと、入力のたびに focus をいじらずに済む（キャレットが飛ばない）。
 */
export type FieldContext = {
  /** いまの全ブロック。blockOps の純粋関数に渡すために持つ */
  blocks: ArticleBlock[];
  /** 構造が変わる操作の結果を反映する（BlockEditor 側で caret へフォーカスを戻す） */
  apply: (result: OpResult) => void;
  /** 入力欄の書き戻し。関数形（前の配列 → 次の配列） */
  update: (fn: (blocks: ArticleBlock[]) => ArticleBlock[]) => void;
  /** キー処理（IME を壊さないため、分岐はすべて useBlockKeymap 側に置く） */
  keymap: BlockKeymap;
  /** いまキャレットがある入力欄を親に知らせる（書式バーの表示切り替え用） */
  onFocusField?: (pos: FieldPos) => void;
  /**
   * 本文を書いている途中で写真ファイルを貼り付けた（⌘V / ドロップ）ときに親へ渡す。
   * 親は「そのブロックの直後に写真ブロックを足す」を行う。
   * 繋がっていないときは何もしない（本文への文字の貼り付けは今までどおり）。
   */
  onPasteFiles?: (files: FileList, afterBlockId: string) => void;
};

export type FieldProps<B extends ArticleBlock = ArticleBlock> = FieldContext & { block: B };

/** 保存形式の 1 種類だけを取り出す型（各フィールドの block を絞る） */
export type BlockOf<T extends ArticleBlock['type']> = Extract<ArticleBlock, { type: T }>;
