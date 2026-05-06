'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ArticleCard } from '@locore/ui';
import type { Article } from '../lib/mock';
import { getWriter } from '../lib/mock';
import { Bookmarks, TripAdds } from '../lib/storage/local';

interface ArticleGridProps {
  articles: Article[];
  hideAuthor?: boolean;
}

function toCardModel(article: Article) {
  const writer = getWriter(article.writerId);
  return {
    id: article.id,
    title: article.title,
    coverImageUrl: article.coverImageUrl,
    area: `パリ・${article.area.replace(/^パリ・?/, '')}`,
    author: {
      name: writer?.name ?? '匿名',
      tier: (writer?.tier ?? 'A') as 'S' | 'A' | 'B',
      residencyYears: writer?.residencyYears,
      avatarUrl: writer?.avatarUrl,
    },
    localScore: article.localScoreAverage,
    satisfactionStars: article.satisfactionAverage,
    reviewCount: article.reviewCount,
    priceJpy: article.priceJpy,
    durationType: article.durationType,
    spotsCount: article.spotIds.length,
  };
}

export function ArticleGrid({ articles, hideAuthor }: ArticleGridProps) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState<string[]>([]);

  useEffect(() => {
    setBookmarked(Bookmarks.list());
  }, []);

  if (articles.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-foreground/60">
        条件に合う記事がまだありません。
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <ArticleCard
          key={article.id}
          article={toCardModel(article)}
          hideAuthor={hideAuthor}
          bookmarked={bookmarked.includes(article.id)}
          onClick={() => router.push(`/articles/${article.id}`)}
          onBookmark={() => {
            const isOn = Bookmarks.toggle(article.id);
            setBookmarked(Bookmarks.list());
            toast(isOn ? 'ブックマークしました' : 'ブックマークを外しました');
          }}
          onAddToTrip={() => {
            TripAdds.add(article.id);
            toast.success('旅程に追加しました', {
              description: '「旅程」ページから確認できます',
            });
          }}
        />
      ))}
    </div>
  );
}
