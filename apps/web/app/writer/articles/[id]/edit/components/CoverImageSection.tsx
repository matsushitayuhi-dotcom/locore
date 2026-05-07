'use client';

import { ImageUploader } from '@/components/writer/ImageUploader';

type Props = {
  value: string;
  onChange: (next: string) => void;
  isPublished: boolean;
};

export function CoverImageSection({ value, onChange, isPublished }: Props) {
  return (
    <section
      className="space-y-3 rounded-md border border-border bg-card p-5 sm:p-6"
      aria-labelledby="cover-section-title"
    >
      <div>
        <h3 id="cover-section-title" className="text-[15px] font-medium tracking-tight">
          カバー画像
        </h3>
        <p className="mt-1 text-[11px] text-foreground/50">3:2 を推奨。一覧カードや記事ヘッダーに表示されます。</p>
      </div>
      <ImageUploader
        value={value}
        onChange={onChange}
        aspect="3 / 2"
        placeholder="https://picsum.photos/seed/locore/960/640"
        isPublished={isPublished}
      />
    </section>
  );
}
