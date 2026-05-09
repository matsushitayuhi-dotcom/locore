import { eq } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/auth/current-user';
import { articles, spots } from '../../lib/mock';
import { MapView } from '../../components/MapView';

export const metadata = {
  title: 'マップ — Locore',
};

export const dynamic = 'force-dynamic';

export default async function MapPage() {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // ログイン中なら購入済み記事 ID を取得（マップ上のスポットアンロック判定に使う）
  const me = await getCurrentUser();
  let purchasedArticleIds: string[] = [];
  if (me) {
    try {
      const db = getDb();
      const rows = await db
        .select({ articleId: schema.purchases.articleId })
        .from(schema.purchases)
        .where(eq(schema.purchases.buyerId, me.id));
      purchasedArticleIds = rows.map((r) => r.articleId);
    } catch {
      // DB 未接続でもマップはモックで動かしたいので無視
      purchasedArticleIds = [];
    }
  }

  return (
    <main className="bg-background">
      <MapView
        articles={articles}
        spots={spots}
        googleMapsApiKey={googleMapsApiKey}
        purchasedArticleIds={purchasedArticleIds}
      />
    </main>
  );
}
