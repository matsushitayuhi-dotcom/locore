import { eq } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/auth/current-user';
import { getPublishedDbArticles } from '@/lib/articles/published';
import { getSpotsForArticles } from '@/lib/spots/db';
import { MapView } from '../../components/MapView';

export const metadata = {
  title: 'マップ — Locore',
};

export const revalidate = 300;

export default async function MapPage() {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // DB から公開記事 + スポットを引く（mock は廃止）
  const articles = await getPublishedDbArticles(100);
  const spots = await getSpotsForArticles(articles.map((a) => a.id));

  // ログイン中なら購入済み記事 ID + 自分が書いた記事 ID を取得
  const me = await getCurrentUser();
  let purchasedArticleIds: string[] = [];
  let myArticleIds: string[] = [];
  if (me) {
    try {
      const db = getDb();
      const rows = await db
        .select({ articleId: schema.purchases.articleId })
        .from(schema.purchases)
        .where(eq(schema.purchases.buyerId, me.id));
      purchasedArticleIds = rows.map((r) => r.articleId);
    } catch {
      purchasedArticleIds = [];
    }
    // 自分のクリエイター記事 ID（マップで別色表示する用）
    myArticleIds = articles.filter((a) => a.writerId === me.id).map((a) => a.id);
  }

  return (
    <main className="bg-background">
      <MapView
        articles={articles}
        spots={spots}
        googleMapsApiKey={googleMapsApiKey}
        purchasedArticleIds={purchasedArticleIds}
        myArticleIds={myArticleIds}
      />
    </main>
  );
}
