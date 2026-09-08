'use client';

import { isDisplayOnly } from '../BLOCK_KINDS';
import { AsideField } from './AsideField';
import { DisplayOnlyField } from './DisplayOnlyField';
import { DividerField } from './DividerField';
import { HeadingField } from './HeadingField';
import { ImageField } from './ImageField';
import { LinkField } from './LinkField';
import { ListField } from './ListField';
import { ParagraphField } from './ParagraphField';
import { QuoteField } from './QuoteField';
import { TableField } from './TableField';
import type { FieldProps } from './types';

/**
 * ブロック 1 つぶんの編集 UI を選ぶ（0091 / エディタ作り直し）。
 *
 * BlockEditor 側はブロックの枠（並べ替え・選択の見た目）だけを描き、
 * 中身はここに任せる。書き手が作れるのは 9 種だけで、
 * それ以外（表示専用の 9 種）は読み取り専用カードになる。
 */
export function BlockField(props: FieldProps) {
  const { block } = props;

  // 編集 UI を持たない 9 種は読み取り専用カード ＋「本文に変換」
  if (isDisplayOnly(block)) return <DisplayOnlyField {...props} />;

  switch (block.type) {
    case 'paragraph':
      return <ParagraphField {...props} block={block} />;
    case 'heading':
      return <HeadingField {...props} block={block} />;
    case 'list':
      return <ListField {...props} block={block} />;
    case 'quote':
      return <QuoteField {...props} block={block} />;
    case 'aside':
      return <AsideField {...props} block={block} />;
    case 'table':
      return <TableField {...props} block={block} />;
    case 'image':
      return <ImageField {...props} block={block} />;
    case 'divider':
      return <DividerField {...props} block={block} />;
    case 'link_card':
    case 'embed':
      return <LinkField {...props} block={block} />;
    default:
      return null;
  }
}
