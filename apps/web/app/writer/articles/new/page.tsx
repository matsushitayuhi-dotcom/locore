import Link from 'next/link';
import { createArticleDraft } from '../actions';
import { listDuplicateCandidates } from './actions';
import { NewArticleEntry } from './NewArticleEntry';

export const metadata = {
  title: '新規記事',
};

export const dynamic = 'force-dynamic';

/**
 * 新規記事作成のエントリ。
 *
 * 2026-05 改修 (#1): メインの動線は「新規記事を書く」プライマリボタン。
 * その横の「過去の記事から複製」セカンダリボタンを押したときだけ、
 * 過去記事リストがドロワーで開く。`?mode=duplicate` で開いた状態の URL を
 * 共有可能。戻るで閉じる。
 *
 *  - `/writer/articles/new` (デフォルト)        → 選択画面
 *  - `/writer/articles/new?mode=duplicate`     → 同上 + 複製ドロワーが開いた状態
 *  - `/writer/articles/new?mode=blank`         → 旧経路: 即新規下書きを作成
 */
export default async function NewArticlePage({
  searchParams,
}: {
  searchParams?: { mode?: string };
}) {
  // 旧経路互換: ?mode=blank → 即生成
  if (searchParams?.mode === 'blank') {
    await createArticleDraft({});
    // redirect 済み
    return null;
  }

  const candidates = await listDuplicateCandidates();
  const initialDuplicateOpen = searchParams?.mode === 'duplicate';

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
          新規記事
        </p>
        <h1
          className="text-[22px] font-bold tracking-tight"
        >
          どこから書きはじめますか？
        </h1>
        <p className="text-[12px] text-foreground/65">
          ゼロから書くか、過去の記事の構成や写真を流用するかを選べます。
        </p>
      </header>

      <NewArticleEntry
        candidates={candidates}
        initialDuplicateOpen={initialDuplicateOpen}
      />

      <div className="border-t border-border pt-4">
        <Link
          href="/writer/articles"
          className="text-[12px] text-foreground/60 underline-offset-4 hover:underline"
        >
          ← 記事一覧に戻る
        </Link>
      </div>
    </div>
  );
}
