import { notFound } from 'next/navigation';
import { getTrip, trips } from '../../../lib/mock';
import { TripView } from '../../../components/TripView';

export function generateStaticParams() {
  return trips.map((t) => ({ id: t.id }));
}

export default function TripDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const trip = getTrip(params.id);
  if (!trip) return notFound();
  return <TripView trip={trip} />;
}
