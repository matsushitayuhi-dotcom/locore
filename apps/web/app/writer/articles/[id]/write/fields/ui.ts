/**
 * 編集 UI で使い回す class 名（0091 / エディタ作り直し）。
 *
 * ここに集めているのは、守るべき数値を 1 か所に固定するため:
 *   - **入力欄の font-size は例外なく 16px 以上**（iOS Safari はこれ未満だとフォーカスのたびに拡大する）
 *   - **タップできる要素は 44×44px 以上**（h-11 w-11 = 44px）
 *   - hover でしか出ない操作を作らない（ボタンは常に見えている）
 * 小さく見せたいところは色・字間・太さで従属させる。文字を小さくして解決しない。
 */

/** 44px の当たり判定。ボタンには必ずこれを混ぜる */
export const TAP = 'min-h-[44px]';

/** 丸いアイコンボタン（削除・追加）。44×44px */
export const ICON_BUTTON =
  'grid h-11 w-11 shrink-0 place-items-center rounded-full text-neutral-500 transition active:bg-neutral-100';

/** 枠線だけの小さなボタン（列を追加・写真を変える など） */
export const OUTLINE_BUTTON =
  'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-border-strong bg-card px-4 text-[14px] font-bold text-foreground transition active:bg-neutral-100';

/** 破線の追加ボタン（項目を追加・行を追加） */
export const DASHED_BUTTON =
  'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-strong text-[14px] font-bold text-neutral-500 transition active:bg-neutral-100';

/** 強い操作（読み込む・本文に変換） */
export const SOLID_BUTTON =
  'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-neutral-900 px-5 text-[14px] font-bold text-white transition disabled:opacity-40';

/** 枠のある入力欄（キャプション・URL・表のセル）。16px を下回らせない */
export const BOXED_INPUT =
  'block w-full min-h-[44px] rounded-lg border border-border bg-card px-3 py-2 text-[16px] leading-[1.6] text-foreground placeholder:text-neutral-300 focus:border-primary-500 focus:outline-none';

/** 枠の無い入力欄（本文・見出し・引用）。記事ページと同じ見た目で書けるように */
export const BARE_INPUT =
  'block w-full resize-none overflow-hidden border-0 bg-transparent p-0 placeholder:text-neutral-300 focus:outline-none';

/** ブロックの中の小さな説明文。入力欄ではないので 16px 未満でよい */
export const HINT = 'text-[13px] leading-[1.6] text-neutral-500';

/** セクションの見出し（「列の見出し」「2 行目」など） */
export const SECTION_LABEL = 'text-[12px] font-bold tracking-[0.14em] text-neutral-500';
