'use client';

import { BodyEditorSection } from './BodyEditorSection';

/**
 * クラシックスタイル本文の編集セクション。
 *
 * Phase C (2026-06) 改修:
 *   旧版は「無料」「有料」の 2 つの RichTextEditor を縦に並べる方式だったが、
 *   書き手が 2 つのボックスを行き来する分かりにくさがあった。本改修で
 *   **1 本の本文エディタ + 本文中マーカー（ここから下を有料）** 方式へ統合。
 *
 *   - エディタは combined HTML（無料 + 境界 + 有料）を 1 本で編集する。
 *   - 「ここから下を有料に」ボタン / スラッシュコマンド `/paid` で境界を 1 つ挿入する。
 *   - 保存時に WizardShell 側で lib/editor/paywallMarker により body / body_paid へ分割する。
 *   - 境界が無ければ全文が無料 body（＝従来どおり）。
 */

type Props = {
  /** 無料 + 境界 + 有料 を 1 本にまとめた combined HTML */
  body: string;
  onChangeBody: (html: string) => void;
};

export function TitleBodySection({ body, onChangeBody }: Props) {
  return (
    <section
      // 2026-05 改修: スマホで縦長になりすぎる問題への対応で外側余白を圧縮
      className="space-y-3 rounded-md bg-card p-2 ring-1 ring-border sm:space-y-5 sm:p-6"
      aria-labelledby="title-body-section"
    >
      <header>
        <h3
          id="title-body-section"
          className="text-[14px] font-semibold tracking-tight sm:text-[15px]"
        >
          本文を書く
        </h3>
        <p className="mt-1 text-[11px] text-foreground/60 sm:text-[12px]">
          本文は 1 つのエディタで書きます。「ここから下を有料に」の区切りを 1
          箇所入れると、その上が無料プレビュー、下が購入後に解放される有料パートになります。区切りを入れなければ全文が無料で表示されます。
        </p>
      </header>

      <BodyEditorSection
        value={body}
        onChange={onChangeBody}
        showPaywallControl
      />
    </section>
  );
}
