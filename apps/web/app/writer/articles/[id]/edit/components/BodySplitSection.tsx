'use client';

import { BodyEditorSection } from './BodyEditorSection';

/**
 * 本文を「無料プレビュー」と「有料部分」の 2 段で書ける編集セクション。
 *
 * - 無料部分：購入前にも読み手に表示される。雰囲気を伝えるリード文。
 * - 有料部分：購入後に解放。具体的な店名・住所・コツなど。
 *
 * 既存の BodyEditorSection（Markdown / WYSIWYG 切替対応）を 2 つ並べる。
 * `bodyPaid` が空の場合は記事詳細側で旧フォールバック（body の途中を自動分割）が動く。
 */

type Props = {
  bodyFree: string;
  bodyPaid: string;
  onChangeFree: (markdown: string) => void;
  onChangePaid: (markdown: string) => void;
};

export function BodySplitSection({
  bodyFree,
  bodyPaid,
  onChangeFree,
  onChangePaid,
}: Props) {
  return (
    <div className="space-y-5">
      <div className="rounded-md border border-border bg-primary-500/10 px-4 py-3 text-[12px] text-primary-300">
        <p className="font-semibold">本文は 2 段に分かれています</p>
        <p className="mt-1 text-primary-300/80">
          上の「無料プレビュー」は購入前の読者にも表示されます。下の「有料部分」は購入後にだけ解放されます（空のままにすると、無料プレビューの後半を自動的に有料扱いにします）。
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[13px] font-medium text-foreground/80">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-500/15 text-[11px] text-primary-300">
            無
          </span>
          無料プレビュー（購入前にも見える）
        </div>
        <BodyEditorSection value={bodyFree} onChange={onChangeFree} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[13px] font-medium text-foreground/80">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-secondary-50 text-[11px] text-secondary-700">
            有
          </span>
          有料部分（購入後に解放）
        </div>
        <BodyEditorSection value={bodyPaid} onChange={onChangePaid} />
      </div>
    </div>
  );
}
