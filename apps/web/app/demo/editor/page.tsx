import type { ComponentProps } from 'react';
import { BlockEditor } from '@/app/writer/articles/[id]/write/BlockEditor';
import type { ArticleBlock } from '@/lib/articles/blocks';

/**
 * /demo/editor — ログインなしで触れる記事エディタのデモ（保存されない）。
 * 実物（/writer/articles/[id]/write）と同じコンポーネントをそのまま置く。
 *
 * 初期データの決まりごと（docs/editor-v2.md）:
 *  - **書き手が挿入できる 9 種だけ**で組む。以前は takeaways / timeline で始まっていたが、
 *    どちらも新エディタには挿入手段が無い（＝デモで見せても書き手が再現できない）ので外した。
 *  - 記事として自然に読めることを優先しつつ、9 種が一通り出てくる並びにする。
 *    書式バー（見出し・箇条書き・引用のトグル）と ＋ シート（写真・表・区切り線・リンク）の
 *    両方を、触れば分かる形で見せるのが目的。
 *  - 場所は「見出し + 写真 + 段落 + Google マップの URL を 1 行」で書く（末尾の 2 見出し）。
 *    スポット登録 UI は無い。旅行専用の作りをデモから再導入しないための実演でもある。
 *  - 末尾は空の段落。開いてすぐ自分の文が書けるように。
 *  - **触れば再現できる見た目だけを置く。** 未ログインなので resolveUrlBlock は外部プレビューを
 *    取らない（canFetch=false）。だから link_card / embed に preview を持たせない。
 *  - 写真は picsum のランダム画像。alt に写っているものを断定して書かない。実在の店名も置かない。
 */
export const metadata = { title: '記事エディタのデモ' };

const BLOCKS: ArticleBlock[] = [
  // 1) メモ（aside/memo）… デモの説明を記事の中に置く。ここで書式バーと ＋ の存在を伝える
  {
    id: 'd-intro-memo',
    type: 'aside',
    kind: 'memo',
    label: 'このページについて',
    text: '記事エディタのデモです。**書いたものは保存されません。** 好きに消して、書いて試してください。\n文の途中にカーソルを置いて下のバーを押すと、その行が見出しや箇条書きに変わります。写真・表・区切り線・リンクは ＋ から足せます。',
  },

  // 2) 導入 → 見出し → 本文 → 番号つき … 「書式バーで変えられるもの」の並び
  { id: 'd-lead', type: 'paragraph', text: '出願を決めてから最初の 1 か月でやったことを、順番のまま書き出しました。うまくいったことも、やらなくてよかったことも入っています。' },
  { id: 'd-h-first', type: 'heading', level: 2, text: '最初の 1 か月でやったこと' },
  { id: 'd-p-first', type: 'paragraph', text: '結論から言うと、この時期に大事なのは情報を集めることではなく、**締め切りを 1 枚の紙に書き出すこと**でした。学校ごとに締め切りが 3 週間ずれているだけで、やる順番が変わります。' },
  { id: 'd-steps', type: 'list', style: 'number', items: ['志望校を 6 校まで書き出して、Round 1 の締め切りを並べる', '推薦してもらう人に、断りやすい形で先に打診する', 'GMAT の模試を 1 回だけ受けて、いまの点数を知る'] },

  // 3) 写真（alt も編集できることを見せたいので alt を入れておく）
  //    picsum はランダム画像で中身が毎回変わるため、alt に写っているものを断定して書かない。
  //    ここは「alt には何を書くか」の手本として読まれる位置なので、書き方の指示そのものを入れておく
  { id: 'd-img-desk', type: 'image', url: 'https://picsum.photos/seed/locore-editor-desk/1200/800', caption: '締め切りを紙に書き出した日。付箋は結局 3 枚に減りました', alt: 'デモ用の写真（この欄には、目の見えない人に伝わるよう写真の中身を書きます）' },

  // 4) 小見出し → 箇条書き → 引用
  { id: 'd-h3-mistake', type: 'heading', level: 3, text: 'やらなくてよかったこと' },
  { id: 'd-p-mistake', type: 'paragraph', text: '合格体験記を読み漁った 2 週間は、ほとんど何も残りませんでした。読むなら 3 本までで十分だと思います。' },
  { id: 'd-list-mistake', type: 'list', style: 'bullet', items: ['ランキングを毎日見る（順位は 1 年で動きません）', '受験する予定のない学校の説明会に出る', 'エッセイの構成を、1 文字も書かないまま考え続ける'] },
  { id: 'd-quote', type: 'quote', text: '下手でいいから、まず 1 本書き切って。', cite: '相談に乗ってくれた在校生。この一言で 1 か月分の迷いが終わりました' },

  // 5) ポイント / 注意（メモの中のピルで切り替わることを見せる）
  { id: 'd-aside-point', type: 'aside', kind: 'point', label: 'ポイント', text: '第 1 稿は「他人に見せられる状態」を目指さない。自分で読み返せればそれでいい。' },

  // 6) 表（＋ から入る。3 列は 402px だと横スワイプになるのでその見え方も兼ねる）
  { id: 'd-table', type: 'table', header: true, rows: [['時期', 'やること', '費用の目安'], ['1 か月目', '締め切りの整理、推薦者への打診', '¥0'], ['2〜3 か月目', 'GMAT の勉強、模試 2 回', '¥120,000'], ['4 か月目', 'エッセイ第 1〜3 稿', '¥30,000']] },
  { id: 'd-aside-caution', type: 'aside', kind: 'caution', label: '注意', text: '費用は 2024 年に自分が払った額です。受験料も為替も変わるので、必ず公式サイトで確認してください。' },

  // 7) 区切り線 → 場所の書き方（見出し + 写真 + 段落 + Google マップの URL）
  { id: 'd-divider', type: 'divider' },
  { id: 'd-h-place', type: 'heading', level: 2, text: 'いちばん通った自習場所' },
  // 実在の店名は置かない。無関係なランダム画像に実在の場所の断定が結び付いてしまうため
  { id: 'd-img-place', type: 'image', url: 'https://picsum.photos/seed/locore-editor-cafe/1200/800', caption: '朝 8 時に行くと、たいてい窓際が空いていました', alt: 'デモ用の写真（この欄には、目の見えない人に伝わるよう写真の中身を書きます）' },
  { id: 'd-p-place', type: 'paragraph', text: '大学の図書館は席の取り合いになるので、平日の午前は駅前のカフェにいました。電源とWi-Fiがあって、3 時間いても何も言われません。' },
  // リンクを貼る → 地図（書き手は URL を 1 本貼るだけ。link_card か embed かはサーバーが判定する）
  // preview は持たせない: resolveUrlBlock は gmap のプレビューを取らず、EmbedBlock が URL から
  // 場所名を組み立てる（gmapPlaceName → ?q= の値）。実際に貼ったときと同じ見た目にする
  {
    id: 'd-map',
    type: 'embed',
    url: 'https://www.google.com/maps?q=%E9%A7%85%E5%89%8D%E3%81%AE%E3%82%AB%E3%83%95%E3%82%A7',
    provider: 'gmap',
  },

  // 8) リンクを貼る → 外部サイトのカード（同じ操作から出てくるもう一方）
  // preview は持たせない: /demo/editor は未ログインで、resolveUrlBlock が canFetch=false のため
  // 外部プレビューを取りに行かない。カードは URL が見出しになる。デモ訪問者が同じ URL を貼っても
  // 同じ見た目になるように、到達できない見た目を初期データに置かない（docs/editor-v2.md §9）
  { id: 'd-link', type: 'link_card', url: 'https://www.mba.com/', kind: 'external' },

  // 9) 書きかけの行で終わる
  { id: 'd-tail', type: 'paragraph', text: 'この続きは、下の空いている行から書いてみてください。' },
  { id: 'd-empty', type: 'paragraph', text: '' },
];

/**
 * BlockEditor に渡す初期値。
 *
 * 型注釈を付けてあるのは、キーの欠落や食い違い（subTitle など）をコンパイラに検知させるため。
 * subtitle はエディタ側の `Initial` 型がまだ持っていないので、交差型で足して余剰プロパティ検査を
 * 通している（注釈ごと外すと、他のキーの検査まで一緒に失われる）。
 * TODO: BlockEditor の `Initial` に subtitle が入ったら、`& { subtitle: string }` を消す。
 * lead は新エディタで編集しないので渡さない（docs/editor-v2.md §3 の「保存する項目」）。
 */
const INITIAL: ComponentProps<typeof BlockEditor>['initial'] & { subtitle: string } = {
  id: '00000000-0000-4000-8000-000000000000',
  title: 'MBA出願、最初の1か月でやったこと',
  subtitle: '情報を集める前に、締め切りを 1 枚の紙に書き出す。遠回りした 4 週間の記録',
  topic: 'mba',
  coverImageUrl: 'https://picsum.photos/seed/locore-editor-cover/1600/1067',
  blocks: BLOCKS,
  status: 'draft',
  publishedAt: null,
  // 空にしてヘッダの「保存済み HH:MM」を出さない。デモは保存されないので時刻を出すと嘘になるし、
  // モジュール定数で new Date() を評価すると、プリレンダー時刻が固定で表示されてしまう
  updatedAt: '',
};

export default function WriterDemoPage() {
  return <BlockEditor demo initial={INITIAL} />;
}
