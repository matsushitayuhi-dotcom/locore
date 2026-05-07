import { marked } from 'marked';

/**
 * Markdown 文字列を HTML に変換する。
 * TipTap エディタの初期コンテンツ用に使う（編集中の表示は TipTap 内部で管理）。
 *
 * 設定:
 *   - GFM ON（テーブル、打消し線等）
 *   - 改行を `<br>` に変換（日本語の自然な改行を尊重）
 *   - サニタイズは TipTap が許可する要素に絞られているため最小限で OK
 */
export function markdownToHtml(md: string): string {
  if (!md) return '';
  marked.setOptions({
    gfm: true,
    breaks: true,
  });
  // marked は string | Promise<string> を返す可能性あり。同期版を使う。
  const out = marked.parse(md, { async: false });
  return typeof out === 'string' ? out : '';
}
