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
      className="space-y-5 rounded-md bg-card p-5 ring-1 ring-border sm:p-6"
      aria-labelledby="title-body-section"
    >
      <header>
        <h3
          id="title-body-section"
          className="text-[15px] font-semibold tracking-tight"
        >
          本文を書く
        </h3>
        <p className="mt-1 text-[12px] text-foreground/60">
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
