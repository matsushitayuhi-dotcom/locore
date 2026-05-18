import { eq, asc } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { ServicesEditor } from '@/components/settings/ServicesEditor';
import { getActiveCitiesForPicker } from '@/lib/geo/countries';

export const metadata = {
  title: '提供サービス編集',
};

export const dynamic = 'force-dynamic';

export default async function ServicesSettingsPage() {
  const user = await requireUser('/settings/services');
  const db = getDb();

  // 0046 未適用環境では cityId/audience カラムが無く SELECT に失敗するので、
  // try/catch でフォールバック (両カラムを null として扱う)。
  type Row = {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    priceJpy: number | null;
    priceUnit: string | null;
    contactMethod: string;
    externalUrl: string | null;
    isActive: boolean;
    cityId: string | null;
    audience: string | null;
  };
  let rows: Row[] = [];
  try {
    rows = await db
      .select({
        id: schema.userServices.id,
        title: schema.userServices.title,
        description: schema.userServices.description,
        category: schema.userServices.category,
        priceJpy: schema.userServices.priceJpy,
        priceUnit: schema.userServices.priceUnit,
        contactMethod: schema.userServices.contactMethod,
        externalUrl: schema.userServices.externalUrl,
        isActive: schema.userServices.isActive,
        cityId: schema.userServices.cityId,
        audience: schema.userServices.audience,
      })
      .from(schema.userServices)
      .where(eq(schema.userServices.userId, user.id))
      .orderBy(asc(schema.userServices.position));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/does not exist/i.test(msg)) {
      console.warn(
        '[settings/services] user_services.city_id/audience missing — fallback. ' +
          'Supabase Studio で 0046_user_services_city_audience.sql を実行してください。',
      );
      const fallback = await db
        .select({
          id: schema.userServices.id,
          title: schema.userServices.title,
          description: schema.userServices.description,
          category: schema.userServices.category,
          priceJpy: schema.userServices.priceJpy,
          priceUnit: schema.userServices.priceUnit,
          contactMethod: schema.userServices.contactMethod,
          externalUrl: schema.userServices.externalUrl,
          isActive: schema.userServices.isActive,
        })
        .from(schema.userServices)
        .where(eq(schema.userServices.userId, user.id))
        .orderBy(asc(schema.userServices.position));
      rows = fallback.map((r) => ({ ...r, cityId: null, audience: null }));
    } else {
      throw err;
    }
  }

  const cityOptions = await getActiveCitiesForPicker();

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-[20px] font-semibold tracking-tight">提供サービス</h2>
        <p className="mt-1 text-[12px] text-foreground/60">
          現地ガイド・翻訳・コンサルなど、あなたの強みを公開できます。
        </p>
      </header>

      <ServicesEditor
        cityOptions={cityOptions}
        initial={rows.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description ?? '',
          category: r.category ?? '',
          priceJpy: r.priceJpy ?? '',
          priceUnit: r.priceUnit ?? '1時間あたり',
          contactMethod:
            (r.contactMethod as 'chat' | 'external_url') ?? 'chat',
          externalUrl: r.externalUrl ?? '',
          isActive: r.isActive,
          cityId: r.cityId ?? '',
          audience:
            (r.audience as '' | 'traveler' | 'resident' | 'both' | null) ?? '',
        }))}
      />
    </div>
  );
}
