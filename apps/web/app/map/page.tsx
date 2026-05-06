import { articles, spots } from '../../lib/mock';
import { MapView } from '../../components/MapView';

export const metadata = {
  title: 'マップ — Locore',
};

export default function MapPage() {
  return (
    <main className="bg-background">
      <MapView articles={articles} spots={spots} />
    </main>
  );
}
