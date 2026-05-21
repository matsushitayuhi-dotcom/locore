import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Sparkles, MapPin, Calendar, ArrowLeft, ExternalLink } from 'lucide-react';
import { getBoardPost } from '@/lib/board/db';
import { markdownToHtml } from '@/lib/markdown/toHtml';

export const revalidate = 60;

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props) {
  const post = await getBoardPost(params.id);
  if (!post) return { title: '新着ニュース' };
  return {
    title: post.title,
    description:
      post.body.length > 140 ? post.body.slice(0, 137) + '…' : post.body,
  };
}

export default async function BoardDetailPage({ params }: Props) {
  const post = await getBoardPost(params.id);
  if (!post) notFound();

  const bodyHtml = markdownToHtml(post.body);

  return (
    <main className="mx-auto max-w-screen-md px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/board"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        新着ニュースに戻る
      </Link>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          {post.autoCollected ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-500">
              <Sparkles className="h-3 w-3" />
              AI 自動収集
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-300">
              編集部
            </span>
          )}
          <span className="text-[11px] text-foreground/50">
            {formatPublishedAt(post.publishedAt)}
          </span>
        </div>

        <h1
          className="mt-3 text-[28px] font-bold leading-tight tracking-tight text-foreground"
        >
          {post.title}
        </h1>

        {post.eventStartDate || post.eventDate || post.eventLocation ? (
          <dl className="mt-4 grid grid-cols-1 gap-2 rounded-lg bg-primary-500/10 p-3 text-[12px] sm:grid-cols-2">
            {(() => {
              const start = post.eventStartDate ?? post.eventDate;
              const end = post.eventEndDate ?? post.eventDate;
              if (!start) return null;
              const isRange = !!end && start !== end;
              return (
                <div className="flex items-start gap-2">
                  <Calendar className="mt-0.5 h-3.5 w-3.5 text-primary-300" />
                  <div>
                    <dt className="font-semibold text-foreground/60">
                      {isRange ? '開催期間' : '開催日'}
                    </dt>
                    <dd className="mt-0.5 font-bold tabular text-primary-300">
                      {isRange
                        ? `${formatEventDate(start)} 〜 ${formatEventDate(end!)}`
                        : formatEventDate(start)}
                    </dd>
                  </div>
                </div>
              );
            })()}
            {post.eventLocation ? (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 text-primary-300" />
                <div>
                  <dt className="font-semibold text-foreground/60">場所</dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {post.eventLocation}
                  </dd>
                </div>
              </div>
            ) : null}
          </dl>
        ) : null}
      </header>

      <article
        className="prose-locore mt-8"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />

      {post.sourceUrls && post.sourceUrls.length > 0 ? (
        <footer className="mt-8 border-t border-border pt-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/50">
            参照元
          </p>
          <ul className="mt-2 space-y-1">
            {post.sourceUrls.map((s, i) => (
              <li key={i}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[12px] text-primary-300 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
        </footer>
      ) : null}

      {post.autoCollected ? (
        <p className="mt-8 rounded-md bg-primary-500/10 px-3 py-2 text-[11px] leading-relaxed text-foreground/60">
          この投稿は AI が公開情報をもとに自動で要約したものです。詳細は参照元をご確認のうえ、最新情報は現地公式情報を優先してください。
        </p>
      ) : null}
    </main>
  );
}

function formatEventDate(d: string) {
  const date = new Date(d.length === 10 ? d + 'T00:00:00Z' : d);
  if (isNaN(date.getTime())) return d;
  const wd = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}(${wd})`;
}

function formatPublishedAt(d: string) {
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const h = Math.floor(diffMs / (1000 * 60 * 60));
  if (h < 1) return 'たった今';
  if (h < 24) return `${h}時間前`;
  const day = Math.floor(h / 24);
  return `${day}日前`;
}
