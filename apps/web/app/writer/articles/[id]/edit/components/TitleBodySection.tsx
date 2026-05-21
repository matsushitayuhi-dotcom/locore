'use client';

import { BodySplitSection } from './BodySplitSection';

/**
 * クラシックスタイル本文の編集セクション。
 *
 * 旧版ではタイトル入力欄も内包していたが、WizardShell 側のタイトル欄と
 * 二重に表示される UX の問題があったため 2026-05 にタイトルは削除。
 * いまは無料 / 有料の本文を `BodySplitSection` で 2 段表示するだけのラッパー。
 */

type Props = {
  bodyFree: string;
  bodyPaid: string;
  onChangeBodyFree: (markdown: string) => void;
  onChangeBodyPaid: (markdown: string) => void;
};

export function TitleBodySection({
  bodyFree,
  bodyPaid,
  onChangeBodyFree,
  onChangeBodyPaid,
}: Props) {
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
          無料パートは購入前に読者が読める部分。有料パートは購入後に解放されます。
        </p>
      </header>

      {/* 本文（無料 / 有料） */}
      <BodySplitSection
        bodyFree={bodyFree}
        bodyPaid={bodyPaid}
        onChangeFree={onChangeBodyFree}
        onChangePaid={onChangeBodyPaid}
      />
    </section>
  );
}
