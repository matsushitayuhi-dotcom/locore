import { parseBlocks, legacyBodyToBlocks } from '@/lib/articles/blocks';
import type { getEditorialArticleRow } from '@/lib/articles/editorial';
import { EditorialArticle } from '@/app/articles/[id]/EditorialArticle';

/**
 * ブロック形式（body_style='blocks'）記事を「公開後と同じ見た目」で描くための薄いラッパ。
 *
 * ライターの公開前プレビュー（/writer/articles/[id]/preview）と共有マジックリンク
 * （/preview/[token]）の両方がここを通る。どちらも旧 ArticleRendererV2 を使っていたため
 * blocks 記事は本文が空で出ていた。公開後の見え方と 1 ピクセルも変えないために、記事ページ
 * （/articles/[id]）と同じ <EditorialArticle>（= 同じ <Prose>）をそのまま呼ぶ。
 *
 * blocks が空の旧記事は記事ページと同じく legacyBodyToBlocks で段落に開く（DB は書き換えない）。
 *
 * 置き場所: 2 つのルート（/writer/articles/[id]/preview と /preview/[token]）が共有するので、
 * どちらかの角括弧付きルートフォルダではなく components/articles/ に置く。
 *
 * TODO(次段階): app/articles/[id]/page.tsx も同じ引数組み立て（parseBlocks →
 * blocks.length > 0 ? blocks : legacyBodyToBlocks(body)、article の 8 フィールド）を
 * 自前で持っている。variant='public' を足してそこも通せば呼び出し側が 1 つになる。
 * app/articles/ は今回の担当外なので手を付けていない。
 */
export type EditorialRow = NonNullable<Awaited<ReturnType<typeof getEditorialArticleRow>>>;

export function EditorialArticleView({
  row,
  variant,
}: {
  row: EditorialRow;
  /** 'owner' = 本人・編集チームのプレビュー / 'shared' = token を知っている第三者 */
  variant: 'owner' | 'shared';
}) {
  const blocks = parseBlocks(row.blocks);
  return (
    <EditorialArticle
      article={{
        id: row.id,
        title: row.title,
        subtitle: row.subtitle,
        lead: row.lead,
        topic: row.topic,
        coverImageUrl: row.coverImageUrl,
        publishedAt: row.publishedAt,
        // 共有リンクの相手には EditorialArticle の
        // 「下書きのプレビュー（本人と編集チームだけが見られます）」は事実と食い違うので出さない。
        // 公開前であることは /preview/[token] 側の共有プレビュー注意書きが伝える。
        //
        // 注意: ここで渡している status は事実と違う（下書きでも 'published' と言っている）。
        // 今の EditorialArticle が status を下書きバナーの出し分けにしか使っていないから
        // 成立しているだけで、公開日表示・CTA・noindex などを status で分岐させ始めたら
        // 共有プレビューだけ静かに挙動が変わる。恒久策は EditorialArticle に
        // showDraftBanner を足すことだが、表示側は無改修の約束なので次段階で判断する。
        status: variant === 'shared' ? 'published' : row.status,
      }}
      blocks={blocks.length > 0 ? blocks : legacyBodyToBlocks(row.body)}
      writerId={row.writerId}
      countryNameJa={row.countryNameJa}
      // 「この記事を編集する」リンクは本人のプレビューにだけ出す
      isOwner={variant === 'owner'}
    />
  );
}
