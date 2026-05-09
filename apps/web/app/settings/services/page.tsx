import { eq, asc } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { ServicesEditor } from '@/components/settings/ServicesEditor';

export const metadata = {
  title: '提供サービス編集',
};

export const dynamic = 'force-dynamic';

export default async function ServicesSettingsPage() {
  const user = await requireUser('/settings/services');
  const db = getDb();

  const rows = await db
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

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-[20px] font-semibold tracking-tight">提供サービス</h2>
        <p className="mt-1 text-[12px] text-foreground/60">
          現地ガイド・翻訳・コンサルなど、あなたの強みを公開できます。
        </p>
      </header>

      <ServicesEditor
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
        }))}
      />
    </div>
  );
}
