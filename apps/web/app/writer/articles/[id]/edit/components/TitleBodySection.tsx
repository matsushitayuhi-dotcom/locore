'use client';

import { BodySplitSection } from './BodySplitSection';

/**
 * タイトル + 本文（無料 / 有料）を 1 つのセクションに統合した編集 UI。
 *
 * 旧 BasicInfoSection から「タイトル」を移してきて、本文と一緒に書ける形にする。
 * 価格 / 種別 / 都市 / タグなどのメタは BasicInfoSection 側に残す。
 */

const TITLE_MAX = 200;

type Props = {
  title: string;
  bodyFree: string;
  bodyPaid: string;
  onChangeTitle: (next: string) => void;
  onChangeBodyFree: (markdown: string) => void;
  onChangeBodyPaid: (markdown: string) => void;
};

export function TitleBodySection({
  title,
  bodyFree,
  bodyPaid,
  onChangeTitle,
  onChangeBodyFree,
  onChangeBodyPaid,
}: Props) {
  const titleOver = title.length > TITLE_MAX;
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
          タイトル & 本文
        </h3>
        <p className="mt-1 text-[12px] text-foreground/60">
          タイトルを書くと自動保存が始まります（書き始めるまで保存はされません）。
        </p>
      </header>

      {/* タイトル：見出しっぽく大きく入力させる */}
      <div>
        <label
          htmlFor="art-title"
          className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-300"
        >
          タイトル <span className="text-danger-500">*</span>
        </label>
        <input
          id="art-title"
          type="text"
          value={title}
          onChange={(e) => onChangeTitle(e.target.value)}
          maxLength={TITLE_MAX}
          required
          placeholder="例: マレ地区で観光客が来ない、地元のおじさんが集う朝のビストロ3軒"
          className="block w-full border-0 border-b-2 border-border bg-transparent px-0 py-2 text-[24px] font-bold leading-snug text-foreground placeholder:text-foreground/30 focus:border-primary-500 focus:outline-none sm:text-[28px]"
        />
        <p
          className={
            'mt-1 text-[11px] ' +
            (titleOver ? 'text-danger-500' : 'text-foreground/50')
          }
        >
          {title.length} / {TITLE_MAX}
        </p>
      </div>

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
