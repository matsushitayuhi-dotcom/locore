import type { ArticleBlock, BlockType } from '@/lib/articles/blocks';

/**
 * 新エディタで「書き手に見せる」ブロックの語彙（0091 / エディタ作り直し）。
 *
 * 方針:
 *  - 書き手が触る言葉は 9 語だけ。実装用語（paragraph / aside / link_card / embed / heading level …）と
 *    enum 値は UI 文言に一切出さない。「埋め込み 1 · リンク」のような名前は禁止。
 *  - ここに載っているものが、書き手が挿入できる全部。載っていないものは表示専用（DISPLAY_ONLY_KINDS）。
 *  - 保存形式（lib/articles/blocks.ts）は無改修。EditorKind は「保存形式 → 書き手の語彙」への写像でしかない。
 */

/** 編集 UI の中だけで使う種類。保存形式の BlockType とは 1 対 1 ではない（heading の level と list の style を畳んでいる） */
export const EDITOR_KINDS = [
  'paragraph',
  'heading2',
  'heading3',
  'bullet',
  'number',
  'quote',
  'aside',
  'image',
  'table',
  'divider',
  'link',
] as const;
export type EditorKind = (typeof EDITOR_KINDS)[number];

export type BlockKindDef = {
  kind: EditorKind;
  /** 書き手に見せる名前。ここに実装用語を出さない */
  label: string;
  /** lucide-react のアイコン名（呼び出し側で import する） */
  icon: string;
  /** 88px のセルに添える一行。何ができるかだけを書く */
  hint: string;
};

/**
 * ＋ のボトムシートに並ぶ 9 種。この順番でそのまま 2 列グリッドに置く。
 * 「本文」がここに無いのは、何も選ばなかったときの既定＝挿入対象として見せる必要がないから。
 */
export const BLOCK_KINDS: readonly BlockKindDef[] = [
  { kind: 'image', label: '写真', icon: 'Image', hint: 'スマホの写真をそのまま' },
  { kind: 'heading2', label: '見出し', icon: 'Heading2', hint: '話のまとまりを分ける' },
  { kind: 'bullet', label: '箇条書き', icon: 'List', hint: '・で並べる' },
  { kind: 'number', label: '番号つき', icon: 'ListOrdered', hint: '順番のある手順に' },
  { kind: 'quote', label: '引用', icon: 'Quote', hint: '誰かの言葉。出典も書ける' },
  { kind: 'aside', label: 'メモ', icon: 'StickyNote', hint: '補足や注意を囲みで' },
  { kind: 'table', label: '表', icon: 'Table', hint: '料金や比較を行と列で' },
  { kind: 'divider', label: '区切り線', icon: 'Minus', hint: '話題が変わるところに' },
  { kind: 'link', label: 'リンクを貼る', icon: 'Link', hint: 'URL を貼るとカードになる' },
] as const;

/** 「小見出し」は ＋ には出さない（見出しボタンの循環と「種類を変える」からだけ選ばせる） */
export const HEADING3_KIND: BlockKindDef = { kind: 'heading3', label: '小見出し', icon: 'Heading3', hint: '見出しの中でさらに分ける' };
export const PARAGRAPH_KIND: BlockKindDef = { kind: 'paragraph', label: '本文', icon: 'Type', hint: 'ふつうの文章' };

/**
 * キャレットのあるブロックの「種類を変える」に並べる候補。
 * 本文テキストを保ったまま行き来できるものだけ（turnInto が対応する範囲）。
 */
export const TURN_INTO_KINDS: readonly BlockKindDef[] = [
  PARAGRAPH_KIND,
  { kind: 'heading2', label: '見出し', icon: 'Heading2', hint: '話のまとまりを分ける' },
  HEADING3_KIND,
  { kind: 'bullet', label: '箇条書き', icon: 'List', hint: '・で並べる' },
  { kind: 'number', label: '番号つき', icon: 'ListOrdered', hint: '順番のある手順に' },
  { kind: 'quote', label: '引用', icon: 'Quote', hint: '誰かの言葉。出典も書ける' },
  { kind: 'aside', label: 'メモ', icon: 'StickyNote', hint: '補足や注意を囲みで' },
] as const;

/** turnInto で本文テキストを持ち回せる種類（＝ 1 つの文章として読める種類） */
export const TEXT_KINDS: readonly EditorKind[] = ['paragraph', 'heading2', 'heading3', 'bullet', 'number', 'quote', 'aside'];

/** メモ（aside）の中のピル。enum 値（point / caution / memo）は表に出さず、この label だけを見せる */
export const ASIDE_TONES: readonly { tone: 'point' | 'caution' | 'memo'; label: string }[] = [
  { tone: 'point', label: 'ポイント' },
  { tone: 'caution', label: '注意' },
  { tone: 'memo', label: 'メモ' },
];

/** 書き手が触る語彙（原則 1 の「9 語」）。UI 文言のレビュー用に残しておく */
export const WRITER_VOCABULARY: readonly string[] = ['本文', '見出し', '箇条書き', '引用', '写真', 'メモ', '表', '区切り線', 'リンク'];

/**
 * 表示専用に落とす 9 種。
 * blockSchema と Prose.tsx の描画は無傷のまま（公開済み記事の見た目を変えない）。
 * 新エディタには挿入手段を置かず、既存記事に含まれるときだけ
 * 「読み取り専用カード ＋『本文に変換』」（blockOps.convertToBody）を出す。
 */
export const DISPLAY_ONLY_KINDS: readonly { type: BlockType; label: string; note: string }[] = [
  { type: 'images', label: '写真を並べたもの', note: '写真ブロックに分けられます' },
  { type: 'takeaways', label: 'まとめ', note: '箇条書きに変えられます' },
  { type: 'checklist', label: 'チェックリスト', note: '箇条書きに変えられます' },
  { type: 'faq', label: 'よくある質問', note: '小見出しと本文に変えられます' },
  { type: 'terms', label: '用語の説明', note: '本文に変えられます' },
  { type: 'timeline', label: '時系列', note: '箇条書きに変えられます' },
  { type: 'proscons', label: '良い点・気になる点', note: '箇条書きに変えられます' },
  { type: 'stats', label: '数字', note: '箇条書きに変えられます' },
  { type: 'footnotes', label: '注釈', note: '番号つきに変えられます' },
] as const;

const DISPLAY_ONLY_SET = new Set<BlockType>(DISPLAY_ONLY_KINDS.map((d) => d.type));

/** 表示専用（編集 UI を持たない）ブロックか */
export function isDisplayOnly(block: ArticleBlock): boolean {
  return DISPLAY_ONLY_SET.has(block.type);
}

/** 読み取り専用カードに出す日本語名。表示専用でなければ null */
export function displayOnlyLabel(block: ArticleBlock): { label: string; note: string } | null {
  const d = DISPLAY_ONLY_KINDS.find((x) => x.type === block.type);
  return d ? { label: d.label, note: d.note } : null;
}

const LABELS: Record<EditorKind, string> = {
  paragraph: '本文',
  heading2: '見出し',
  heading3: '小見出し',
  bullet: '箇条書き',
  number: '番号つき',
  quote: '引用',
  aside: 'メモ',
  image: '写真',
  table: '表',
  divider: '区切り線',
  link: 'リンク',
};

/** 種類 → 書き手に見せる名前 */
export function kindLabel(kind: EditorKind): string {
  return LABELS[kind];
}
