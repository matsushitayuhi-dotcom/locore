import { articles, spots } from '../../lib/mock';
import { MapView } from '../../components/MapView';

export const metadata = {
  title: 'マップ — Locore',
};

export default function MapPage() {
  // Google Maps API キーは NEXT_PUBLIC_ なのでクライアントにも露出される
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <main className="bg-background">
      <MapView
        articles={articles}
        spots={spots}
        googleMapsApiKey={googleMapsApiKey}
      />
    </main>
  );
}
