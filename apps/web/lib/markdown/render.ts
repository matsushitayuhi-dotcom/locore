import sanitizeHtml from 'sanitize-html';
import { markdownToHtml } from './toHtml';

/**
 * 記事本文のレンダリング統一ヘルパ。
 *
 * 2026-05 改修 (#エディタ⇄表示 Markdown バグ修正):
 *
 * - 旧仕様: 編集中の HTML を `htmlToMarkdown` で Markdown に潰してから DB 保存し、
 *   表示時に `markdownToHtml` で戻していた。
 *   この経路では TipTap 独自のブロック（コールアウト / コードブロック / テーブル /
 *   タスクリスト / ハイライト等）が Markdown 変換で消失したり、表示側で `## 〜` の
 *   まま素のテキストとして見えてしまう不具合があった。
 *
 * - 新仕様: 編集中の HTML をそのまま `articles.body` / `articles.body_paid` に保存する。
 *   DB スキーマは text のままで互換。表示時は body の先頭を見て:
 *     - `<` で始まる → HTML としてサニタイズして dangerouslySetInnerHTML
 *     - そうでない → 従来通り Markdown として解釈 → HTML 化 → サニタイズ
 *   旧 Markdown 記事との互換を維持しつつ、新規 / 編集後の記事は TipTap 由来の
 *   ブロックを完全に保持して表示できる。
 *
 * セキュリティ:
 * - `sanitize-html` でホワイトリスト方式の sanitize を行う（jsdom 依存なし）。
 * - script / style / object / embed / form は除去。on* イベント属性も除去。
 * - 許可するタグは TipTap が生成しうるブロック一式 + Markdown 由来の標準要素。
 * - 許可属性は href / src / alt / class / data-callout / data-type など必要最小限。
 *   とくに style 属性はコールアウトの色付け (RichTextEditor.insertCallout) を生かすため
 *   blockquote / p / span に限り許可するが、`url(...)` / `expression(...)` は遮断。
 * - iframe は YouTube / Vimeo 系のみ許可。
 */

/**
 * 本文が HTML として保存されているかを判定する。
 *
 * 最初の非空白文字が `<` で始まるなら HTML とみなす。
 * 旧 Markdown 記事（`# 見出し` / 段落のみ等）は false を返し、Markdown 経路で render される。
 */
export function isHtmlBody(body: string): boolean {
  if (!body) return false;
  const head = body.trimStart();
  return head.startsWith('<');
}

const ALLOWED_IFRAME_HOSTNAMES = [
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'youtube-nocookie.com',
  'player.vimeo.com',
];

/**
 * style 属性の安全な値を許す（インライン色付け 等）。
 * url(...) / expression(...) / javascript: を含む値は弾く。
 */
const safeStyleRegex = /^[^()'"]*$/;

const sanitizeOptions: sanitizeHtml.IOptions = {
  // TipTap が吐くブロック一式 + Markdown 標準要素
  allowedTags: [
    // ブロック
    'p', 'div', 'section', 'article',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'hr', 'br',
    // テーブル
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'colgroup', 'col',
    // インライン装飾
    'strong', 'em', 'b', 'i', 'u', 's', 'del', 'mark', 'sup', 'sub', 'span',
    // メディア
    'a', 'img', 'iframe',
    // タスクリスト
    'input', 'label',
  ],
  allowedAttributes: {
    '*': ['class', 'data-callout', 'data-type', 'data-checked'],
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    iframe: [
      'src', 'width', 'height', 'allow', 'allowfullscreen',
      'frameborder', 'title', 'loading',
    ],
    input: ['type', 'checked', 'disabled'],
    // コールアウトのインライン色付け（RichTextEditor.insertCallout）を生かす
    blockquote: ['style'],
    p: ['style'],
    span: ['style'],
    th: ['colspan', 'rowspan', 'scope', 'style'],
    td: ['colspan', 'rowspan', 'style'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    img: ['http', 'https', 'data'],
  },
  // a タグの href が外部 URL のときに rel="noopener" を強制
  transformTags: {
    a: (tagName, attribs) => {
      const out: Record<string, string> = { ...attribs };
      if (out.href && /^https?:/i.test(out.href)) {
        out.target = out.target ?? '_blank';
        out.rel = 'noopener noreferrer';
      }
      return { tagName, attribs: out };
    },
  },
  // iframe[src] のホスト制限
  allowedIframeHostnames: ALLOWED_IFRAME_HOSTNAMES,
  // style の値は安全な書式のみ
  allowedStyles: {
    '*': {
      // 色 / 背景 / ボーダー / 余白 / 整形のみ。url(...) / expression(...) は弾く
      color: [safeStyleRegex],
      'background-color': [safeStyleRegex],
      background: [safeStyleRegex],
      'border-left': [safeStyleRegex],
      'border-radius': [safeStyleRegex],
      padding: [safeStyleRegex],
      margin: [safeStyleRegex],
      'margin-top': [safeStyleRegex],
      'margin-bottom': [safeStyleRegex],
      'text-align': [/^(left|right|center|justify)$/],
      'letter-spacing': [safeStyleRegex],
      'font-weight': [/^(normal|bold|\d{3})$/],
    },
  },
};

/**
 * 記事本文を最終 HTML（サニタイズ済み）に変換する。
 *
 * @param body 記事本文（HTML or 旧 Markdown）
 * @returns dangerouslySetInnerHTML に渡せるサニタイズ済み HTML 文字列
 */
export function renderArticleBodyHtml(body: string): string {
  if (!body) return '';
  const html = isHtmlBody(body) ? body : markdownToHtml(body);
  return sanitizeHtml(html, sanitizeOptions);
}
