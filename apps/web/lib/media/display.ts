/**
 * 「発信・メディア」の表示形式（client / server 共用・純粋ロジック）。0088。
 *
 * リンクごとに display を選べる。auto のときは platform と kind から既定を決める:
 *   - YouTube の動画 → featured（16:9 の大きなサムネ）
 *   - note / blog / website の記事 → card（OG カード）
 *   - X / Instagram / TikTok / Threads / Facebook → button（自動サムネが取れないため）
 *   - アカウント（profile）は button。email はセクションに出さない（ヒーローのアイコン列のみ）
 * docs/experts-media-display-research.md §4
 */

export const LINK_KINDS = ['profile', 'video', 'article', 'post', 'podcast'] as const;
export type LinkKind = (typeof LINK_KINDS)[number];

export const LINK_DISPLAYS = ['auto', 'icon', 'button', 'card', 'featured', 'embed'] as const;
export type LinkDisplay = (typeof LINK_DISPLAYS)[number];

/** セクションで実際に使う描画形式（auto を解決したあと）。icon はセクション非表示 */
export type ResolvedDisplay = 'icon' | 'button' | 'card' | 'featured' | 'embed';

export const DISPLAY_LABEL: Record<LinkDisplay, string> = {
  auto: '自動（おすすめ）',
  icon: 'アイコンのみ（上部）',
  button: 'ボタン',
  card: 'カード',
  featured: '大きく見せる',
  embed: '埋め込み（YouTube）',
};

export const KIND_LABEL: Record<LinkKind, string> = {
  profile: 'アカウント',
  video: '動画',
  article: '記事',
  post: '投稿',
  podcast: '音声',
};

export const PLATFORM_LABEL: Record<string, string> = {
  instagram: 'Instagram',
  x: 'X',
  threads: 'Threads',
  note: 'note',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  blog: 'Blog',
  website: 'Web',
  email: 'メール',
};

export type MediaLinkLike = {
  platform: string;
  kind: string | null | undefined;
  display: string | null | undefined;
  imageUrl: string | null | undefined;
};

/** platform × kind からの既定表示 */
export function defaultDisplay(platform: string, kind: string | null | undefined, hasImage: boolean): ResolvedDisplay {
  if (platform === 'email') return 'icon';
  const k = (kind ?? 'profile') as LinkKind;
  if (platform === 'youtube') return k === 'video' ? 'featured' : 'button';
  if (k === 'podcast') return hasImage ? 'card' : 'button';
  if (k === 'article') return hasImage ? 'card' : 'button';
  if (k === 'video') return hasImage ? 'featured' : 'button';
  if (k === 'post') return hasImage ? 'card' : 'button';
  return 'button';
}

/** display（auto 含む）を実際の描画形式に解決する。embed は YouTube 動画だけ許可 */
export function resolveDisplay(link: MediaLinkLike): ResolvedDisplay {
  const hasImage = !!link.imageUrl;
  const d = (link.display ?? 'auto') as LinkDisplay;
  if (d === 'auto' || !LINK_DISPLAYS.includes(d)) return defaultDisplay(link.platform, link.kind, hasImage);
  if (d === 'embed') return link.platform === 'youtube' && link.kind === 'video' ? 'embed' : 'featured';
  if ((d === 'featured' || d === 'card') && !hasImage) return 'button';
  return d;
}

/** YouTube の動画 ID（watch?v= / youtu.be / shorts / embed）。動画でなければ null */
export function youtubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
    if (host !== 'youtube.com' && host !== 'music.youtube.com') return null;
    if (u.pathname === '/watch') return u.searchParams.get('v');
    const m = u.pathname.match(/^\/(shorts|embed|live)\/([A-Za-z0-9_-]{6,})/);
    return m ? m[2]! : null;
  } catch {
    return null;
  }
}

/** URL からリンクの種類を推定（取得前のヒューリスティック） */
export function detectKind(platform: string, url: string): LinkKind {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return 'profile';
  }
  const host = u.hostname.replace(/^www\.|^m\./, '');
  const path = u.pathname.replace(/\/+$/, '');
  if (platform === 'youtube' || host === 'youtu.be' || host.endsWith('youtube.com')) {
    return youtubeVideoId(url) ? 'video' : 'profile';
  }
  if (host === 'note.com') {
    return /^\/[^/]+\/n\/[A-Za-z0-9]+$/.test(path) ? 'article' : 'profile';
  }
  if (host === 'x.com' || host === 'twitter.com') {
    return /\/status\/\d+/.test(path) ? 'post' : 'profile';
  }
  if (host.endsWith('instagram.com')) {
    return /^\/(p|reel|reels|tv)\//.test(path) ? 'post' : 'profile';
  }
  if (host.endsWith('tiktok.com')) {
    return /\/video\/\d+/.test(path) ? 'video' : 'profile';
  }
  if (host.endsWith('threads.net') || host.endsWith('threads.com')) {
    return /\/post\//.test(path) ? 'post' : 'profile';
  }
  if (host.endsWith('facebook.com')) {
    return /\/(posts|videos|reel)\//.test(path) ? 'post' : 'profile';
  }
  if (host === 'open.spotify.com' || host.includes('podcasts.apple.com') || host.includes('anchor.fm')) {
    return 'podcast';
  }
  if (platform === 'email') return 'profile';
  // 一般ブログ: 階層が 2 つ以上（/2026/06/slug など）なら記事、ルートやユーザー直下はプロフィール
  const depth = path.split('/').filter(Boolean).length;
  return depth >= 2 || /\.(html?|md)$/.test(path) ? 'article' : 'profile';
}
