import { notFound } from 'next/navigation';
import { getSampleTrip, getSpotsByIds } from '@/lib/trips/db';
import { TripView } from '../../../components/TripView';

export const dynamic = 'force-dynamic';

export default async function TripDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const trip = await getSampleTrip(params.id);
  if (!trip) return notFound();

  // 旅程内の全 spotId を集めて DB から解決
  const spotIds = Array.from(
    new Set(
      trip.days.flatMap((d) =>
        d.items.map((i) => i.spotId).filter(Boolean) as string[],
      ),
    ),
  );
  const spotsById = await getSpotsByIds(spotIds);

  return <TripView trip={trip} spotsById={spotsById} />;
}
