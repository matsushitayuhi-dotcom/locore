import { BlockEditor } from '@/app/writer/articles/[id]/write/BlockEditor';
import type { ArticleBlock } from '@/lib/articles/blocks';

/**
 * /demo/editor — ログインなしで触れる記事エディタのデモ（保存されない）。
 * 実物（/writer/articles/[id]/write）と同じコンポーネント。初期値は高村さんの記事の部品一式。
 */
export const metadata = { title: '記事エディタのデモ' };

const BLOCKS: ArticleBlock[] = [
  { id: 'd-take', type: 'takeaways', items: ['日本人が MBA エッセイで最初にやりがちな 3 つの書き方', '直す順番と、直す前後の実例', '出願スケジュールと費用の目安'] },
  { id: 'd-h1', type: 'heading', level: 2, text: '罠 1 — 実績の列挙' },
  { id: 'd-p1', type: 'paragraph', text: '日本の職務経歴書の感覚でプロジェクトを並べると、審査側には何も残りません。エッセイで見られているのは実績の大きさではなく、**意思決定の理由と、そこからの変化**です。' },
  { id: 'd-l1', type: 'list', style: 'bullet', items: ['「何をしたか」ではなく「なぜそう決めたか」を先に書く', '数字は 1 段落に 1 つまで。多いほど印象が薄まる', '失敗した判断を 1 つ入れると、残りの実績が立体的になる'] },
  { id: 'd-q1', type: 'quote', text: 'あなたが主語の文章を読みたい。', cite: '添削してくれた HBS 2 年生。この一言で第 1 稿の半分を捨てました' },
  { id: 'd-empty', type: 'paragraph', text: '' },
  { id: 'd-h2', type: 'heading', level: 2, text: '罠 2 — 謙遜' },
  { id: 'd-p2', type: 'paragraph', text: '文化的にどうしても「チームのおかげ」と書きたくなりますが、adcom が知りたいのはあなた個人が何を判断し、何を動かしたか。' },
  { id: 'd-a1', type: 'aside', kind: 'point', label: 'やること', text: '「私たちは」で始まる段落を数えて、半分以下にする。残りは「私は」に書き換えるか、削る。' },
  { id: 'd-memo', type: 'aside', kind: 'memo', text: '第 1 稿は 3 週間で書いて、その後 12 回直しました。' },
  { id: 'd-tl', type: 'timeline', items: [{ date: '2024.05', text: '推薦者に打診。GMAT の勉強を再開' }, { date: '2024.08', text: 'エッセイ第 1 稿。在校生 2 人に壁打ち' }, { date: '2024.09', text: 'Round 1 で HBS・Wharton に提出' }] },
  { id: 'd-t1', type: 'table', rows: [['時期', 'やること', '費用の目安'], ['5〜7 月', 'GMAT / GRE、推薦者に打診', '¥120,000'], ['8〜9 月', 'エッセイ第 1〜3 稿、在校生に壁打ち', '¥30,000']] },
  { id: 'd-emb', type: 'embed', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', provider: 'youtube', videoId: 'dQw4w9WgXcQ', preview: { title: '（デモ）YouTube の埋め込み', description: null, imageUrl: null, siteName: 'YouTube' } },
  { id: 'd-p3', type: 'paragraph', text: '' },
];

export default function WriterDemoPage() {
  return (
    <BlockEditor
      demo
      initial={{
        id: '00000000-0000-4000-8000-000000000000',
        title: 'MBAエッセイ、日本人がいちばん最初につまずく3つの罠',
        subtitle: '実績の列挙、謙遜、浅い Why this school。2024 年出願で HBS と Wharton に受かるまでに、直した順番で書きます。',
        lead: 'MBA 出願のエッセイで、日本人受験者が最初につまずくポイントはだいたい共通しています。私自身が 2024 年の出願でハマりかけ、合格者仲間と答え合わせをして見えてきた「3 つの罠」を、直した順番で書きます。',
        topic: 'mba',
        coverImageUrl: '',
        blocks: BLOCKS,
        status: 'draft',
        publishedAt: null,
        updatedAt: new Date().toISOString(),
      }}
    />
  );
}
