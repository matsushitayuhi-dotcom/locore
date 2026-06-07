import type { MetadataRoute } from 'next';

/**
 * robots.txt — Vercel Origin Data Transfer 抑制が目的。
 *
 * MOC 段階での問題:
 *   - /jobs / /apartments / /marketplace 等のコミュニティ系を中心に、
 *     AI クローラ (GPTBot, ClaudeBot, anthropic-ai, CCBot, Bytespider 等)
 *     が頻繁にスクレイピング → 1 ページあたり数十 KB の HTML/RSC payload を
 *     Vercel が返し続けて Origin Data Transfer 課金が暴騰
 *
 * 方針:
 *   - 通常の検索エンジン (Googlebot / Bingbot) はそのまま許可
 *   - AI 学習目的のクローラは Disallow
 *   - 認証必須 / 動的すぎる領域は Googlebot にも Disallow (/api, /writer 等)
 */
export default function robots(): MetadataRoute.Robots {
  const blockedAiBots = [
    'GPTBot',
    'ChatGPT-User',
    'OAI-SearchBot',
    'ClaudeBot',
    'Claude-Web',
    'anthropic-ai',
    'Applebot-Extended',
    'CCBot',
    'PerplexityBot',
    'Perplexity-User',
    'Bytespider',
    'Amazonbot',
    'Diffbot',
    'DataForSeoBot',
    'MJ12bot',
    'AhrefsBot',
    'SemrushBot',
    'DotBot',
    'Meta-ExternalAgent',
    'Meta-ExternalFetcher',
    'FacebookBot',
    'ImagesiftBot',
    'Omgilibot',
    'Omgili',
    'PetalBot',
    'Webzio-Extended',
    'YouBot',
  ];

  return {
    rules: [
      // 通常の検索エンジン: 公開ページのみ許可、API/管理画面/動的フォーム系は除外
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/auth/',
          '/writer/',
          '/settings/',
          '/chat/',
          '/library/',
          '/purchases/',
          '/preview/',
          '/*/new', // 投稿フォーム系全般
          '/*/edit',
        ],
        // 1 秒あたり 0.5 リクエスト相当のクロール間隔目安
        crawlDelay: 2,
      },
      // AI 学習目的のクローラを全領域でブロック
      ...blockedAiBots.map((bot) => ({
        userAgent: bot,
        disallow: '/',
      })),
    ],
  };
}
