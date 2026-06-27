import 'server-only';
import Link from 'next/link';
import { getPublishedDbArticles } from '@/lib/articles/published';
import { getArticleBundleForPreview } from '@/lib/articles/v2';
import {
  classifyArticle,
  RENDER_KIND_LABEL,
  type RenderKind,
} from '@/components/article/v2/classify';

/**
 * `/mockup/real` — 公開記事の一覧（Phase A プレビュー入口）。
 *
 * 既存の公開記事取得ロジック（getPublishedDbArticles）を再利用して一覧を出し、
 * 各記事を新レンダラで描く `/mockup/real/<id>` へリンクする。判定タイプ
 * （モデルコース / ブログ・場所あり / ブログ・場所なし）をバッジで表示する。
 *
 * 判定には spots の有無が必要なため、記事ごとにプレビュー用バンドルを引いて
 * classifyArticle を通す（一覧件数は控えめにして N+1 を抑える）。
 *
 * /mockup 配下はログインゲート下（middleware）。robots noindex。
 * 本番 /articles/[id] は無変更。
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: '【プレビュー】実データ × 新デザイン | Locore',
  robots: { index: false, follow: false },
};

const KIND_BADGE: Record<RenderKind, { bg: string; fg: string }> = {
  itinerary: { bg: '#A8E01C', fg: '#0b0c09' },
  'place-guide': { bg: '#E3F7B8', fg: '#5E8B0E' },
  essay: { bg: '#ECECE4', fg: '#2a2a28' },
};

export default async function MockupRealIndexPage() {
  const articles = await getPublishedDbArticles(40);

  // 各記事のタイプを判定（spots の有無が必要なのでバンドルを引く）。
  const classified = await Promise.all(
    articles.map(async (a) => {
      const bundle = await getArticleBundleForPreview(a.id);
      const kind: RenderKind = bundle
        ? classifyArticle(bundle.article, bundle.spots)
        : a.articleType === 'itinerary'
          ? 'itinerary'
          : 'essay';
      const spotCount = bundle?.spots.length ?? 0;
      return { article: a, kind, spotCount };
    }),
  );

  return (
    <div className="mr">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <header className="mr-head">
        <div className="glow" />
        <div className="mr-wrap">
          <span className="mr-kick">Phase A · 実データ × 新デザイン</span>
          <h1>
            本物の記事を、<em>新しいレイアウト</em>で。
          </h1>
          <p>
            公開中の記事を、承認済みモックの新デザイン（モデルコース / ブログ・場所あり /
            ブログ・場所なし）で描画したプレビューです。入口は2択（モデルコース＝
            itinerary、ブログ＝それ以外）。ブログはスポット情報の有無で place-guide /
            essay を自動判定します。ライブの記事ページ（/articles/[id]）には影響しません。
          </p>
        </div>
      </header>

      <section className="mr-sec">
        <div className="mr-wrap">
          {classified.length === 0 ? (
            <p className="mr-empty">
              公開記事が見つかりませんでした（DB 未接続 / 認証なし の可能性）。
            </p>
          ) : (
            <div className="mr-grid">
              {classified.map(({ article, kind, spotCount }) => {
                const badge = KIND_BADGE[kind];
                return (
                  <Link
                    key={article.id}
                    className="mr-card"
                    href={`/mockup/real/${article.id}`}
                  >
                    <div className="mr-cov">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={article.coverImageUrl} alt="" />
                      <span
                        className="mr-badge"
                        style={{ background: badge.bg, color: badge.fg }}
                      >
                        {RENDER_KIND_LABEL[kind]}
                      </span>
                    </div>
                    <div className="mr-cb">
                      <div className="mr-meta">
                        {article.articleType} · スポット {spotCount}
                      </div>
                      <h2>{article.title}</h2>
                      <div className="mr-foot">
                        <span className="mr-area">{article.area}</span>
                        <span className="mr-go">新デザインで見る →</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700;800;900&display=swap');

.mr{--bg:#F4F4EF;--bg2:#ECECE4;--white:#fff;--ink:#111;--ink2:#2a2a28;--mu:#6E6E6E;--bd:#E7E7E0;--lime:#A8E01C;--lime-d:#5E8B0E;--mono:'JetBrains Mono',ui-monospace,monospace;--disp:'Space Grotesk','Noto Sans JP',sans-serif;--jp:'Noto Sans JP',system-ui,sans-serif;--ease:cubic-bezier(.22,1,.36,1);min-height:100svh;background:var(--bg);color:var(--ink);font-family:var(--jp);line-height:1.75;-webkit-font-smoothing:antialiased;overflow-x:clip}
.mr *{box-sizing:border-box;margin:0;padding:0}
.mr a{color:inherit;text-decoration:none}
.mr img{display:block;max-width:100%}
.mr-wrap{max-width:1100px;margin:0 auto;padding:0 24px}
.mr-head{position:relative;width:100vw;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;overflow:hidden;padding:74px 0 64px}
.mr-head .glow{position:absolute;width:540px;height:540px;border-radius:50%;background:var(--lime);filter:blur(150px);opacity:.2;top:-220px;left:-60px}
.mr-head .mr-wrap{position:relative;z-index:2}
.mr-kick{display:inline-flex;align-items:center;gap:11px;font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--lime)}
.mr-kick::before{content:"";width:30px;height:1.5px;background:var(--lime)}
.mr-head h1{color:#fff;font-family:var(--disp);font-weight:800;letter-spacing:-.03em;line-height:1.06;font-size:clamp(32px,5vw,60px);margin-top:20px;max-width:20ch}
.mr-head h1 em{font-style:normal;color:var(--lime)}
.mr-head p{margin-top:20px;max-width:72ch;font-size:15px;line-height:1.9;color:rgba(255,255,255,.8)}
.mr-sec{padding:54px 0 90px}
.mr-empty{color:var(--mu);font-size:15px}
.mr-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.mr-card{display:flex;flex-direction:column;background:var(--white);border:1px solid var(--bd);border-radius:20px;overflow:hidden;box-shadow:0 14px 36px -24px rgba(17,17,17,.22);transition:transform .4s var(--ease),box-shadow .4s,border-color .4s}
.mr-card:hover{transform:translateY(-5px);border-color:rgba(168,224,28,.55);box-shadow:0 26px 52px -26px rgba(17,17,17,.26)}
.mr-cov{position:relative;aspect-ratio:16/10;overflow:hidden;background:var(--bg2)}
.mr-cov img{width:100%;height:100%;object-fit:cover;transition:transform 1s var(--ease)}
.mr-card:hover .mr-cov img{transform:scale(1.06)}
.mr-badge{position:absolute;top:14px;left:14px;z-index:2;font-family:var(--mono);font-size:10.5px;font-weight:700;letter-spacing:.04em;padding:6px 12px;border-radius:999px}
.mr-cb{padding:18px 20px 20px;display:flex;flex-direction:column;flex:1}
.mr-meta{font-family:var(--mono);font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--lime-d);font-weight:600}
.mr-cb h2{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:18px;letter-spacing:-.015em;margin-top:9px;line-height:1.35;flex:1}
.mr-foot{margin-top:16px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.mr-area{font-family:var(--mono);font-size:11px;color:var(--mu)}
.mr-go{font-family:var(--mono);font-size:12px;font-weight:600;color:var(--lime-d)}
@media(max-width:880px){.mr-grid{grid-template-columns:1fr 1fr}}
@media(max-width:600px){.mr-grid{grid-template-columns:1fr}}
`;
