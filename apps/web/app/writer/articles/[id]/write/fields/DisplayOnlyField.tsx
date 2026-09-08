'use client';

import { blocksToPlainText } from '@/lib/articles/blocks';
import { displayOnlyLabel } from '../BLOCK_KINDS';
import { convertToBody } from '../blockOps';
import type { FieldProps } from './types';
import { HINT, SECTION_LABEL, SOLID_BUTTON } from './ui';

/**
 * 表示専用に落とした 9 種（写真を並べたもの / まとめ / チェックリスト / よくある質問 /
 * 用語の説明 / 時系列 / 良い点・気になる点 / 数字 / 注釈）の読み取り専用カード。
 *
 * 0091 / エディタ作り直しの方針:
 *   保存形式と記事ページ（Prose）の描画は無傷のまま残す＝**公開済みの記事の見た目は変わらない**。
 *   新エディタからは作れなくして、既に記事に入っているものだけ
 *   「そのままにする」か「本文に変換する」かを選べるようにする。中身は 1 文字も捨てない。
 *
 * 文字を打てないので、区切り線と同じく触られたことを親に伝える（onFocusField）。
 * これが無いと書式バーの「↑ / ↓ / 複製 / 削除」がこのカードを掴めない。
 */
export function DisplayOnlyField({ block, blocks, apply, onFocusField }: FieldProps) {
  const meta = displayOnlyLabel(block);
  if (!meta) return null;
  const preview = blocksToPlainText([block]).trim();
  // blocksToPlainText は写真から caption しか拾わない（lib/articles/blocks.ts）。
  // 「写真を並べたもの」はキャプションが無いと中身が何も見えないので、ここだけ実物を出す
  const urls = block.type === 'images' ? block.urls : null;
  const select = () => onFocusField?.({ blockId: block.id });

  return (
    <div
      className="rounded-xl border border-border bg-muted p-3"
      onPointerDown={select}
      onFocusCapture={select}
    >
      <p className={SECTION_LABEL}>{meta.label}</p>
      {urls ? (
        <div className="mt-1.5 flex gap-1.5 overflow-x-auto">
          {urls.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${i}-${url}`}
              src={url}
              alt=""
              className="h-16 w-16 shrink-0 rounded-lg bg-neutral-100 object-cover"
            />
          ))}
        </div>
      ) : null}
      {preview ? (
        <p className="mt-1.5 line-clamp-6 whitespace-pre-wrap text-[16px] leading-[1.8] text-neutral-700">{preview}</p>
      ) : null}
      <p className={HINT + ' mt-2'}>この形はもう新しく作れません。今のまま公開もできます（{meta.note}）</p>
      <button type="button" onClick={() => apply(convertToBody(blocks, block.id))} className={SOLID_BUTTON + ' mt-2'}>
        本文に変換
      </button>
    </div>
  );
}
