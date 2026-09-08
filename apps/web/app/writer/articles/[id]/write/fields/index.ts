/**
 * ブロックの編集 UI（0091 / エディタ作り直し）。
 *
 * BlockEditor から使うのは基本この 4 つ:
 *   useCreateFieldFocus / FieldFocusProvider … キャレットを戻す仕組み
 *   BlockField                                … ブロック 1 つぶんの編集 UI
 *   useLinkResolver                           … ＋ の「リンクを貼る」で URL をブロックにする
 *
 * 守っていること（全ファイル共通）:
 *   - 入力欄の font-size は 16px 以上（iOS Safari の自動ズーム対策）
 *   - タップできる要素は 44px 以上。hover でしか出ない操作を作らない
 *   - キー処理は必ず useBlockKeymap を通す（IME の分岐を 1 か所に閉じ込める）
 *   - 保存形式（lib/articles/blocks.ts）と Prose の描画には手を入れない
 */
export { BlockField } from './BlockField';
export { AutoTextarea } from './AutoTextarea';
export { FieldFocusProvider, fieldKey, useCreateFieldFocus, useFieldFocus, useFieldRegister } from './fieldFocus';
export type { FieldEl, FieldFocus } from './fieldFocus';
export { useLinkResolver } from './LinkField';
export { MAX_UPLOAD_BYTES, prepareImage } from './prepareImage';
export { useIsWide } from './useIsWide';
export { paragraphsFrom, spillOverflow, writeBodyText } from './writeBody';
export type { BlockOf, FieldContext, FieldProps } from './types';
export { AsideField } from './AsideField';
export { DisplayOnlyField } from './DisplayOnlyField';
export { DividerField } from './DividerField';
export { HeadingField } from './HeadingField';
export { ImageField } from './ImageField';
export { LinkField } from './LinkField';
export { ListField } from './ListField';
export { ParagraphField } from './ParagraphField';
export { QuoteField } from './QuoteField';
export { TableField } from './TableField';
export { BOXED_INPUT, DASHED_BUTTON, HINT, ICON_BUTTON, OUTLINE_BUTTON, SECTION_LABEL, SOLID_BUTTON, TAP } from './ui';
