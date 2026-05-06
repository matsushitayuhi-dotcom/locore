import { Button, Input } from '@locore/ui';
import Link from 'next/link';
import { createArticleDraft } from '../actions';

export const metadata = {
  title: '新しい記事を作成',
};

export const dynamic = 'force-dynamic';

export default function NewArticlePage() {
  async function action(formData: FormData) {
    'use server';
    const title = formData.get('title');
    await createArticleDraft({ title });
  }

  return (
    <div className="max-w-xl">
      <h2
        className="text-[20px] font-semibold tracking-tight"
        style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
      >
        新しい記事を作成
      </h2>
      <p className="mt-1 text-[12px] text-foreground/60">
        まずタイトルだけ決めて、続きは編集画面で書き進めましょう。
      </p>

      <form action={action} className="mt-6 space-y-5 rounded-md border border-border bg-card p-5 sm:p-6">
        <div>
          <label htmlFor="article-title" className="mb-1 block text-[12px] font-medium text-foreground/70">
            タイトル <span className="text-danger-500">*</span>
          </label>
          <Input
            id="article-title"
            type="text"
            name="title"
            required
            maxLength={200}
            placeholder="例：マレ地区で観光客が来ない、地元のおじさんが集う朝のビストロ3軒"
          />
          <p className="mt-1 text-[11px] text-foreground/50">
            あとからいつでも変更できます（最大 200 文字）。
          </p>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button asChild variant="ghost">
            <Link href="/writer/articles">キャンセル</Link>
          </Button>
          <Button type="submit" variant="primary">
            下書きを作成
          </Button>
        </div>
      </form>
    </div>
  );
}
