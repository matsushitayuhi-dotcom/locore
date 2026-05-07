'use client';

import { SpotList, type SpotRow } from '@/components/writer/SpotList';

type Props = {
  articleId: string;
  initial: SpotRow[];
  googleMapsApiKey?: string;
};

export function SpotsSection({ articleId, initial, googleMapsApiKey }: Props) {
  return (
    <section className="space-y-4 rounded-md border border-border bg-card p-5 sm:p-6" aria-labelledby="spots-section-title">
      <div>
        <h3 id="spots-section-title" className="text-[15px] font-medium tracking-tight">
          スポット
        </h3>
        <p className="mt-1 text-[11px] text-foreground/50">
          Google で店舗を検索すると、住所・座標・place_id が自動入力されます。手動入力も可能です。
        </p>
      </div>
      <SpotList articleId={articleId} initial={initial} googleMapsApiKey={googleMapsApiKey} />
    </section>
  );
}
