import Link from 'next/link';
import { Plus, Sparkles } from '@locore/ui/icons';
import { createArticleDraft } from '../actions';
import { duplicateArticle, listDuplicateCandidates } from './actions';

export const metadata = {
  title: '新規記事',
};

export const dynamic = 'force-dynamic';

/**
 * 新規記事作成のエントリ。
 *
 * 2026-05 改修 (#15): 「ゼロから書く」「過去の記事から複製」の 2 択を表示する。
 *
 *  - `/writer/articles/new` (デフォルト) → 選択画面
 *  - `/writer/articles/new?mode=blank` → 旧挙動。即座に空の下書きを作成して
 *    ウィザードへリダイレクト（過去記事 0 件のときの「最初の記事」ボタン経路も兼ねる）
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

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
          新規記事
        </p>
        <h1
          className="text-[22px] font-bold tracking-tight"
          style={{
            fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
          }}
        >
          どこから書きはじめますか？
        </h1>
        <p className="text-[12px] text-foreground/65">
          ゼロから書くか、過去の記事の構成や写真をそのまま流用するかを選べます。
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* ゼロから書く */}
        <form action={createArticleDraftAction}>
          <button
            type="submit"
            className="group flex h-full w-full flex-col items-start gap-2 rounded-md border border-border bg-card p-5 text-left transition hover:border-primary-500 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-500/15 text-primary-300">
              <Plus className="h-5 w-5" />
            </span>
            <span className="text-[15px] font-bold text-foreground">
              ゼロから書く
            </span>
            <span className="text-[12px] text-foreground/65">
              白紙の下書きを作って、ウィザードに従って書き進めます。
            </span>
          </button>
        </form>

        {/* 過去の記事から複製 */}
        <div className="flex h-full flex-col gap-2 rounded-md border border-border bg-card p-5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-500/15 text-primary-300">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="text-[15px] font-bold text-foreground">
            過去の記事から複製
          </span>
          <span className="text-[12px] text-foreground/65">
            タイトルだけ空にして、本文・写真・スポット選定・タグなどを引き継ぎます。
          </span>
          {candidates.length === 0 ? (
            <p className="mt-2 rounded-md bg-muted px-3 py-2 text-[11px] text-foreground/55">
              複製できる過去の記事がまだありません。
            </p>
          ) : null}
        </div>
      </div>

      {/* 複製候補リスト */}
      {candidates.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold tracking-tight">
            複製元の記事を選ぶ
            <span className="ml-2 text-[11px] font-normal text-foreground/55">
              ({candidates.length} 件)
            </span>
          </h2>
          <ul className="grid gap-2">
            {candidates.map((c) => (
              <li key={c.id}>
                <form action={duplicateArticleAction}>
                  <input type="hidden" name="sourceId" value={c.id} />
                  <button
                    type="submit"
                    className="group flex w-full items-center gap-3 rounded-md border border-border bg-card p-3 text-left transition hover:border-primary-500 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  >
                    <div className="h-14 w-20 shrink-0 overflow-hidden rounded-sm bg-muted">
                      {c.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.coverImageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-foreground">
                        {c.title || '（無題）'}
                      </p>
                      <p className="mt-0.5 text-[11px] text-foreground/55">
                        {statusLabel(c.status)} ・ 更新{' '}
                        {c.updatedAt.toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <span className="text-[12px] font-semibold text-primary-300 group-hover:underline">
                      この記事を複製 →
                    </span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-foreground/55">
            ※ 複製では本文・写真・タグ・価格・都市を引き継ぎます。タイトルとスポット (地図上のピン) は引き継がれません。
          </p>
        </section>
      ) : null}

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

function statusLabel(s: string): string {
  switch (s) {
    case 'published':
      return '公開中';
    case 'draft':
      return '下書き';
    case 'archived':
      return 'アーカイブ';
    case 'pending_review':
      return '審査中';
    default:
      return s;
  }
}

// ----- form actions (inline server actions) -----

async function createArticleDraftAction() {
  'use server';
  await createArticleDraft({});
}

async function duplicateArticleAction(formData: FormData) {
  'use server';
  const sourceId = formData.get('sourceId');
  if (typeof sourceId !== 'string') return;
  await duplicateArticle({ sourceId });
}
