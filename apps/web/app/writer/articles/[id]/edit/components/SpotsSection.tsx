'use client';

import { SpotList, type SpotRow } from '@/components/writer/SpotList';

type Props = {
  articleId: string;
  initial: SpotRow[];
  googleMapsApiKey?: string;
  /** 親（EditorShell）が旅程ブロックのドロップダウン候補に使う最新のスポット一覧を受け取る */
  onSpotsChange?: (rows: SpotRow[]) => void;
};

export function SpotsSection({
  articleId,
  initial,
  googleMapsApiKey,
  onSpotsChange,
}: Props) {
  return (
    <section
      className="space-y-4 rounded-md bg-card p-5 ring-1 ring-primary-100 sm:p-6"
      aria-labelledby="spots-section-title"
    >
      <div>
        <h3
          id="spots-section-title"
          className="text-[15px] font-semibold tracking-tight"
        >
          スポット
        </h3>
        <p className="mt-1 text-[12px] text-foreground/60">
          Google で店舗を検索すると、住所・座標・営業時間・電話・WEB が自動入力されます。
          追加したスポットはここに累積表示され、旅程プランの場所候補としても使えます。
        </p>
      </div>
      <SpotList
        articleId={articleId}
        initial={initial}
        googleMapsApiKey={googleMapsApiKey}
        onRowsChange={onSpotsChange}
      />
    </section>
  );
}
