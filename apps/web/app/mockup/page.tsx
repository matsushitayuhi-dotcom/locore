import Link from 'next/link';

/**
 * `/mockup` — デザインモックアップのインデックス。
 *
 * 旅程記事ページの各レイアウト案（A: タイムライン / B: マップ先行 /
 * C: 読み物）へのカードを並べる。位置づけは「投稿エディタの “同じブロック”
 * から、こう出し分けられる」というデモ集。本番ファイルとは独立。
 */
export const metadata = {
  title: '【モックアップ集】旅程記事レイアウト案 | Locore',
  robots: { index: false, follow: false },
};

type Variant = {
  href: string;
  tag: string;
  title: string;
  desc: string;
  img: string;
};

const VARIANTS: Variant[] = [
  {
    href: '/mockup/trip-article',
    tag: 'A · TIMELINE',
    title: 'タイムライン主役',
    desc: '時刻つき縦タイムラインで一日を追う、雑誌的な王道レイアウト。スポット写真と移動コネクタで「流れ」を見せる。',
    img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=80',
  },
  {
    href: '/mockup/trip-article-b',
    tag: 'B · MAP-FIRST',
    title: 'マップ先行',
    desc: 'Route Map を主役に大きく見せ、その下に番号付きカードのグリッドで全スポットを並べる「地図 → 一覧」型。',
    img: 'https://images.unsplash.com/photo-1569949381669-ecf31ae8e613?auto=format&fit=crop&w=900&q=80',
  },
  {
    href: '/mockup/trip-article-c',
    tag: 'C · ESSAY',
    title: 'エディトリアル（読み物）',
    desc: 'ドロップキャップのリード、要所のみの写真、本文中のインラインコールアウト。文章主役の読み物スタイル。',
    img: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=900&q=80',
  },
];

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700;800;900&display=swap');

.mx{--bg:#F4F4EF;--bg2:#ECECE4;--white:#fff;--ink:#111;--ink2:#2a2a28;--mu:#6E6E6E;--bd:#E7E7E0;--bd2:#D8D8CF;--lime:#A8E01C;--lime-d:#5E8B0E;--lime-l:#E3F7B8;--glow:rgba(168,224,28,.5);--mono:'JetBrains Mono',ui-monospace,monospace;--disp:'Space Grotesk','Noto Sans JP',sans-serif;--jp:'Noto Sans JP',system-ui,sans-serif;--ease:cubic-bezier(.22,1,.36,1);min-height:100svh;background:var(--bg);color:var(--ink);font-family:var(--jp);line-height:1.75;-webkit-font-smoothing:antialiased;overflow-x:clip}
.mx *{box-sizing:border-box;margin:0;padding:0}
.mx a{color:inherit;text-decoration:none}
.mx img{display:block;max-width:100%}
.mx-wrap{max-width:1100px;margin:0 auto;padding:0 24px}

.mx-head{position:relative;width:100vw;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;overflow:hidden;padding:74px 0 64px}
.mx-head .glow{position:absolute;width:540px;height:540px;border-radius:50%;background:var(--lime);filter:blur(150px);opacity:.2;top:-220px;left:-60px}
.mx-head .mx-wrap{position:relative;z-index:2}
.mx-kick{display:inline-flex;align-items:center;gap:11px;font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--lime)}
.mx-kick::before{content:"";width:30px;height:1.5px;background:var(--lime)}
.mx-head h1{color:#fff;font-family:var(--disp);font-weight:800;letter-spacing:-.03em;line-height:1.06;font-size:clamp(32px,5vw,60px);margin-top:20px;max-width:18ch}
.mx-head h1 em{font-style:normal;color:var(--lime)}
.mx-head p{margin-top:20px;max-width:64ch;font-size:15.5px;line-height:1.9;color:rgba(255,255,255,.8)}
.mx-note{margin-top:22px;display:inline-flex;align-items:flex-start;gap:11px;background:rgba(168,224,28,.12);border:1px solid rgba(168,224,28,.4);border-radius:14px;padding:14px 18px;max-width:70ch}
.mx-note svg{flex:none;width:18px;height:18px;color:var(--lime);margin-top:2px}
.mx-note p{margin:0;color:rgba(255,255,255,.88);font-size:13.5px;line-height:1.8}
.mx-note b{color:var(--lime)}

.mx-sec{padding:60px 0 90px}
.mx-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.mx-card{display:flex;flex-direction:column;background:var(--white);border:1px solid var(--bd);border-radius:20px;overflow:hidden;box-shadow:0 14px 36px -24px rgba(17,17,17,.22);transition:transform .4s var(--ease),box-shadow .4s,border-color .4s}
.mx-card:hover{transform:translateY(-5px);border-color:rgba(168,224,28,.55);box-shadow:0 26px 52px -26px rgba(17,17,17,.26)}
.mx-cov{position:relative;aspect-ratio:16/10;overflow:hidden;background:var(--bg2)}
.mx-cov img{width:100%;height:100%;object-fit:cover;transition:transform 1s var(--ease)}
.mx-card:hover .mx-cov img{transform:scale(1.06)}
.mx-cov::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(6,8,4,.45),transparent 55%)}
.mx-tag{position:absolute;top:14px;left:14px;z-index:2;font-family:var(--mono);font-size:10.5px;font-weight:700;letter-spacing:.06em;color:#0b0c09;background:var(--lime);padding:6px 12px;border-radius:999px}
.mx-cb{padding:20px 22px 22px;display:flex;flex-direction:column;flex:1}
.mx-cb h2{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:20px;letter-spacing:-.015em}
.mx-cb p{color:var(--mu);font-size:13.5px;line-height:1.8;margin-top:10px;flex:1}
.mx-go{margin-top:16px;display:inline-flex;align-items:center;gap:9px;font-family:var(--mono);font-size:13px;font-weight:600;color:#0b0c09;background:var(--lime);padding:11px 20px;border-radius:999px;align-self:flex-start;transition:transform .2s,box-shadow .2s;box-shadow:0 10px 24px -10px var(--glow)}
.mx-card:hover .mx-go{transform:translateY(-1px)}
.mx-go svg{width:14px;height:14px;transition:transform .25s var(--ease)}
.mx-card:hover .mx-go svg{transform:translateX(4px)}

.mx-blocks{margin-top:64px;background:var(--white);border:1px solid var(--bd);border-radius:22px;padding:34px 32px}
.mx-blocks .k{font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--lime-d)}
.mx-blocks h3{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:23px;letter-spacing:-.015em;margin-top:8px}
.mx-blocks .lead{color:var(--mu);font-size:14px;line-height:1.85;margin-top:12px;max-width:74ch}
.mx-chips{margin-top:20px;display:flex;flex-wrap:wrap;gap:9px}
.mx-bchip{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:12px;color:var(--ink2);background:var(--bg);border:1px solid var(--bd);border-radius:999px;padding:8px 14px}
.mx-bchip.spot{background:var(--lime-l);border-color:rgba(168,224,28,.45);color:var(--lime-d);font-weight:700}
.mx-bchip i{width:6px;height:6px;border-radius:50%;background:var(--lime);display:inline-block}

@media(max-width:880px){.mx-grid{grid-template-columns:1fr 1fr}}
@media(max-width:600px){.mx-grid{grid-template-columns:1fr}}
`;

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function MockupIndexPage() {
  return (
    <div className="mx">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <header className="mx-head">
        <div className="glow" />
        <div className="mx-wrap">
          <span className="mx-kick">Design mockups · Itinerary article</span>
          <h1>
            旅程記事ページの、<em>レイアウト案</em>。
          </h1>
          <p>
            「パリ 完璧モデルコース」を題材に、旅程系ブログ記事の見せ方を複数案で
            並べています。フルブリードのヒーローと、ライム×クリームのトーンは全案で
            統一。各案をクリックして実際の見え方を確認できます。
          </p>
          <div className="mx-note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16v-4M12 8h.01" />
              <circle cx="12" cy="12" r="9" />
            </svg>
            <p>
              これらは<b>投稿エディタの “同じブロック” から、こう出し分けられます</b>
              という実演です。見出し・本文・画像・引用・コールアウトの共通ブロックと、
              旅程専用の構造化「スポット」ブロック（時刻・場所〔地図〕・写真・本文・
              費用・コツ）という一つのデータから、レイアウトだけを変えて A / B / C を
              生成しています。
            </p>
          </div>
        </div>
      </header>

      <section className="mx-sec">
        <div className="mx-wrap">
          <div className="mx-grid">
            {VARIANTS.map((v) => (
              <Link key={v.href} className="mx-card" href={v.href}>
                <div className="mx-cov">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.img} alt="" />
                  <span className="mx-tag">{v.tag}</span>
                </div>
                <div className="mx-cb">
                  <h2>{v.title}</h2>
                  <p>{v.desc}</p>
                  <span className="mx-go">
                    プレビューを開く
                    <ArrowIcon />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mx-blocks">
            <div className="k">Editor block model</div>
            <h3>同じブロックから、別レイアウトへ</h3>
            <p className="lead">
              下のブロックが、エディタで記事を組み立てる素材です。旅程専用の「スポット」
              ブロックは構造化フィールドを持ち、その「場所」フィールドから各案の Route
              Map（Google マップ埋め込み）と個別の「地図で見る」リンクを自動生成します。
            </p>
            <div className="mx-chips">
              <span className="mx-bchip">
                <i />
                見出し
              </span>
              <span className="mx-bchip">
                <i />
                本文
              </span>
              <span className="mx-bchip">
                <i />
                画像
              </span>
              <span className="mx-bchip">
                <i />
                引用
              </span>
              <span className="mx-bchip">
                <i />
                区切り
              </span>
              <span className="mx-bchip">
                <i />
                コールアウト（コツ・注意）
              </span>
              <span className="mx-bchip spot">
                <i />
                スポット（時刻・場所〔地図〕・写真・本文・費用・コツ）
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
