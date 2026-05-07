'use client';

import { VideoEmbedEditor, type VideoRow } from '@/components/writer/VideoEmbedEditor';

type Props = {
  articleId: string;
  initial: VideoRow[];
};

export function VideosSection({ articleId, initial }: Props) {
  return (
    <section className="space-y-3 rounded-md border border-border bg-card p-5 sm:p-6" aria-labelledby="videos-section-title">
      <div>
        <h3 id="videos-section-title" className="text-[15px] font-medium tracking-tight">
          SNS 動画埋め込み
        </h3>
        <p className="mt-1 text-[11px] text-foreground/50">
          TikTok / Instagram / YouTube / X の動画 URL を貼り付けると、記事内に埋め込まれます。
        </p>
      </div>
      <VideoEmbedEditor articleId={articleId} initial={initial} />
    </section>
  );
}
