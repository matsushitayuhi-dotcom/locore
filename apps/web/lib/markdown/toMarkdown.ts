import TurndownService from 'turndown';

/**
 * HTML → Markdown 変換（TipTap 編集内容を DB 保存形式の Markdown に戻す）。
 *
 * Locore は記事本文の正本を Markdown として保存している（既存スキーマと互換）。
 * WYSIWYG 編集中はその場の HTML を保持し、保存／タブ切替時にこの関数で変換する。
 */
let cachedService: TurndownService | null = null;

function getService(): TurndownService {
  if (cachedService) return cachedService;
  const service = new TurndownService({
    headingStyle: 'atx', // # H1 形式
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
  });

  // YouTube 等の iframe を埋め込みとして残す（Markdown では HTML を許可）
  service.addRule('iframe', {
    filter: ['iframe'],
    replacement: (_content, node) => {
      const el = node as HTMLElement;
      const src = el.getAttribute('src') ?? '';
      if (!src) return '';
      return `\n\n<iframe src="${src}" frameborder="0" allowfullscreen></iframe>\n\n`;
    },
  });

  // <img> は ![alt](src) として標準ルールに任せる（turndown のデフォルトで OK）
  cachedService = service;
  return service;
}

export function htmlToMarkdown(html: string): string {
  if (!html) return '';
  return getService().turndown(html);
}
