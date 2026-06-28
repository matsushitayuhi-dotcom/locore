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

  // 0046/0050 未適用環境では cityId/audience/coverImageUrl カラムが無く
  // SELECT に失敗するので、try/catch で段階的にフォールバック。
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
    coverImageUrl: string | null;
  };
  // 0058 体験詳細カラム。base クエリと分離して取得 (未適用なら空にフォールバック)。
  type DetailRow = {
    id: string;
    galleryImages: string[] | null;
    durationLabel: string | null;
    minParticipants: number | null;
    maxParticipants: number | null;
    languages: string[] | null;
    highlights: string[] | null;
    inclusions: string[] | null;
    meetingPointName: string | null;
    meetingPointLat: number | null;
    meetingPointLng: number | null;
    cancellationPolicy: string | null;
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
        coverImageUrl: schema.userServices.coverImageUrl,
      })
      .from(schema.userServices)
      .where(eq(schema.userServices.userId, user.id))
      .orderBy(asc(schema.userServices.position));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/does not exist/i.test(msg)) {
      console.warn(
        '[settings/services] user_services の拡張カラム (city_id/audience/cover_image_url) が未マイグレーション。' +
          ' Supabase Studio で 0046_user_services_city_audience.sql / 0050_user_services_cover_image.sql を実行してください。',
      );
      try {
        // cover_image_url のみ未適用なケース
        const stage2 = await db
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
        rows = stage2.map((r) => ({ ...r, coverImageUrl: null }));
      } catch {
        // 0046 ごと未適用な最古環境
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
        rows = fallback.map((r) => ({
          ...r,
          cityId: null,
          audience: null,
          coverImageUrl: null,
        }));
      }
    } else {
      throw err;
    }
  }

  // 0058 体験詳細カラムを別クエリで取得 (未適用環境では空 Map)。
  const detailById = new Map<string, DetailRow>();
  try {
    const detailRows = await db
      .select({
        id: schema.userServices.id,
        galleryImages: schema.userServices.galleryImages,
        durationLabel: schema.userServices.durationLabel,
        minParticipants: schema.userServices.minParticipants,
        maxParticipants: schema.userServices.maxParticipants,
        languages: schema.userServices.languages,
        highlights: schema.userServices.highlights,
        inclusions: schema.userServices.inclusions,
        meetingPointName: schema.userServices.meetingPointName,
        meetingPointLat: schema.userServices.meetingPointLat,
        meetingPointLng: schema.userServices.meetingPointLng,
        cancellationPolicy: schema.userServices.cancellationPolicy,
      })
      .from(schema.userServices)
      .where(eq(schema.userServices.userId, user.id));
    for (const d of detailRows) detailById.set(d.id, d as DetailRow);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/does not exist/i.test(msg)) {
      console.warn(
        '[settings/services] 体験詳細カラム未適用。manual/0058_user_services_detail.sql を適用してください。',
      );
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
        initial={rows.map((r) => {
          const d = detailById.get(r.id);
          return {
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
            coverImageUrl: r.coverImageUrl ?? '',
            cityId: r.cityId ?? '',
            audience:
              (r.audience as '' | 'traveler' | 'resident' | 'both' | null) ??
              '',
            galleryImages: d?.galleryImages ?? [],
            durationLabel: d?.durationLabel ?? '',
            minParticipants: d?.minParticipants ?? '',
            maxParticipants: d?.maxParticipants ?? '',
            languages: d?.languages ?? [],
            highlights: (d?.highlights ?? []).join('\n'),
            inclusions: (d?.inclusions ?? []).join('\n'),
            meetingPointName: d?.meetingPointName ?? '',
            meetingPointLat: d?.meetingPointLat ?? '',
            meetingPointLng: d?.meetingPointLng ?? '',
            cancellationPolicy: d?.cancellationPolicy ?? '',
          };
        })}
      />
    </div>
  );
}
