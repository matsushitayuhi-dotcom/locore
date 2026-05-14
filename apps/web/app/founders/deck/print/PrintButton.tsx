'use client';

import { Printer } from 'lucide-react';

/**
 * 「PDF として保存」ボタン。
 * ブラウザの印刷ダイアログを開く。プリンタ欄で "PDF として保存" を選択
 * すると、A4 縦の PDF が出力される。
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-500 px-4 py-2 text-[12px] font-bold text-neutral-950 transition hover:bg-primary-300"
    >
      <Printer className="h-3.5 w-3.5" />
      PDF として保存
    </button>
  );
}
