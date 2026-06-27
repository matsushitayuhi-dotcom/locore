import Link from 'next/link';

/**
 * `/mockup` — デザインモックアップのインデックス。
 *
 * 記事「タイプ」を主役に、3タイプ（旅程 / 場所紹介 / 読み物）へのカードを並べる。
 * 位置づけは docs/editor-spec.md に準拠し「投稿エディタの “同じブロック” から、
 * タイプ別にこう組み上がる」というデモ集。本番ファイルとは独立。
 */
export const metadata = {
  title: '【モックアップ集】記事タイプ別レイアウト | Locore',
  robots: { index: false, follow: false },
};

type TypeCard = {
  href: string;
  tag: string;
  title: string;
  desc: string;
  blocks: string;
  img: string;
};

const TYPES: TypeCard[] = [
  {
    href: '/mockup/trip-article',
    tag: 'ITINERARY · 旅程',
    title: '旅程（モデルコース）',
    desc: '順序のある体験。時刻つきタイムラインで一日を追い、順路マップ（directions）で全体像を見せる。',
    blocks:
      'editorsNote → 集約マップ＋概観 → place（順番・時間・移動つき）→ サマリー',
    img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=80',
  },
  {
    href: '/mockup/place-guide',
    tag: 'PLACE GUIDE · 場所紹介',
    title: '場所紹介（順不同）',
    desc: '順序のない記事。複数の場所をリッチに並べ、末尾に順路ではない「ピン集約マップ」を置く。',
    blocks:
      '導入 → place（順不同・order/time/transfer なし）→ ピンマップ → 場所リスト',
    img: 'https://images.unsplash.com/photo-1431274172761-fca41d930114?auto=format&fit=crop&w=900&q=80',
  },
  {
    href: '/mockup/essay',
    tag: 'ESSAY · 読み物',
    title: '読み物（エッセイ）',
    desc: '場所・地図を持たない、文章・写真・動画主体のジャーナル。ドロップキャップと動画埋め込みで読ませる。',
    blocks:
      'paragraph / image / video / quote / callout / divider の自由な連なり',
    img: 'https://images.unsplash.com/photo-1471623320832-752e8bbf8413?auto=format&fit=crop&w=900&q=80',
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
.mx-head h1{color:#fff;font-family:var(--disp);font-weight:800;letter-spacing:-.03em;line-height:1.06;font-size:clamp(32px,5vw,60px);margin-top:20px;max-width:20ch}
.mx-head h1 em{font-style:normal;color:var(--lime)}
.mx-head p{margin-top:20px;max-width:66ch;font-size:15.5px;line-height:1.9;color:rgba(255,255,255,.8)}
.mx-note{margin-top:22px;display:inline-flex;align-items:flex-start;gap:11px;background:rgba(168,224,28,.12);border:1px solid rgba(168,224,28,.4);border-radius:14px;padding:14px 18px;max-width:72ch}
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
.mx-cb p{color:var(--mu);font-size:13.5px;line-height:1.8;margin-top:10px}
.mx-blockline{margin-top:14px;padding-top:14px;border-top:1px solid var(--bd);flex:1}
.mx-blockline .bl-lab{font-family:var(--mono);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--lime-d);font-weight:700}
.mx-blockline .bl-val{font-family:var(--mono);font-size:11.5px;line-height:1.7;color:var(--ink2);margin-top:5px}
.mx-go{margin-top:16px;display:inline-flex;align-items:center;gap:9px;font-family:var(--mono);font-size:13px;font-weight:600;color:#0b0c09;background:var(--lime);padding:11px 20px;border-radius:999px;align-self:flex-start;transition:transform .2s,box-shadow .2s;box-shadow:0 10px 24px -10px var(--glow)}
.mx-card:hover .mx-go{transform:translateY(-1px)}
.mx-go svg{width:14px;height:14px;transition:transform .25s var(--ease)}
.mx-card:hover .mx-go svg{transform:translateX(4px)}

.mx-blocks{margin-top:64px;background:var(--white);border:1px solid var(--bd);border-radius:22px;padding:34px 32px}
.mx-blocks .k{font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--lime-d)}
.mx-blocks h3{color:var(--ink);font-family:var(--disp);font-weight:700;font-size:23px;letter-spacing:-.015em;margin-top:8px}
.mx-blocks .lead{color:var(--mu);font-size:14px;line-height:1.85;margin-top:12px;max-width:76ch}
.mx-bgroup{margin-top:22px}
.mx-bgroup .gl{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mu);margin-bottom:9px}
.mx-chips{display:flex;flex-wrap:wrap;gap:9px}
.mx-bchip{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:12px;color:var(--ink2);background:var(--bg);border:1px solid var(--bd);border-radius:999px;padding:8px 14px}
.mx-bchip.spot{background:var(--lime-l);border-color:rgba(168,224,28,.45);color:var(--lime-d);font-weight:700}
.mx-bchip i{width:6px;height:6px;border-radius:50%;background:var(--lime);display:inline-block}
.mx-spec{margin-top:20px;font-family:var(--mono);font-size:12px;color:var(--mu)}
.mx-spec b{color:var(--ink2);font-weight:600}

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
          <span className="mx-kick">Design mockups · Article types</span>
          <h1>
            記事タイプ別、<em>レイアウトのかたち</em>。
          </h1>
          <p>
            Locore の記事は <strong style={{ color: '#fff' }}>itinerary（旅程）</strong> と
            <strong style={{ color: '#fff' }}> standard（それ以外）</strong> の2タイプ。
            standard はブロック構成で「場所紹介」と「読み物」に分かれます。3タイプを
            それぞれ実物大のモックで確認できます。ヒーローのフルブリードと、ライム×
            クリームのトーンは全タイプで統一。
          </p>
          <div className="mx-note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16v-4M12 8h.01" />
              <circle cx="12" cy="12" r="9" />
            </svg>
            <p>
              これらは<b>投稿エディタの “同じブロック” から、タイプ別にこう組み上がります</b>
              という実演です（docs/editor-spec.md 準拠）。
              場所を構成する <b>place ブロックは全タイプ共通</b>。旅程系のときだけ、それに
              <b> 順番・時間・移動 </b>を付記します。地図は <b>place.location から自動生成</b>。
            </p>
          </div>
        </div>
      </header>

      <section className="mx-sec">
        <div className="mx-wrap">
          <div className="mx-grid">
            {TYPES.map((v) => (
              <Link key={v.href} className="mx-card" href={v.href}>
                <div className="mx-cov">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.img} alt="" />
                  <span className="mx-tag">{v.tag}</span>
                </div>
                <div className="mx-cb">
                  <h2>{v.title}</h2>
                  <p>{v.desc}</p>
                  <div className="mx-blockline">
                    <div className="bl-lab">構成ブロック</div>
                    <div className="bl-val">{v.blocks}</div>
                  </div>
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
            <h3>同じブロックから、タイプ別に組み上がる</h3>
            <p className="lead">
              下のブロックが、エディタで記事を組み立てる素材です。書き手は自由HTMLを
              書かず、ブロックを積み上げるだけ。場所・旅程は構造化ブロック（フォーム入力）
              なのでレイアウトが崩れず、地図は「場所」フィールドから自動生成されます。
            </p>

            <div className="mx-bgroup">
              <div className="gl">共通ブロック（全タイプ）</div>
              <div className="mx-chips">
                {['見出し', '本文', '画像', '動画', '引用', '区切り', 'コールアウト（コツ・注意）', 'エディターズノート'].map((b) => (
                  <span key={b} className="mx-bchip">
                    <i />
                    {b}
                  </span>
                ))}
              </div>
            </div>

            <div className="mx-bgroup">
              <div className="gl">場所ブロック（全タイプ共通 / 旅程はこれに付記）</div>
              <div className="mx-chips">
                <span className="mx-bchip spot">
                  <i />
                  place（名称・カテゴリ・場所〔地図〕・写真・説明・費用・コツ）
                </span>
                <span className="mx-bchip">
                  <i />
                  ＋ 旅程拡張: 順番 / 時間 / 移動
                </span>
              </div>
            </div>

            <p className="mx-spec">
              <b>地図の出し分け:</b> itinerary → 順路（directions）/ place-guide →
              ピン群 / essay → place が無いので地図なし。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
