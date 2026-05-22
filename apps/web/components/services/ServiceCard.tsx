import Link from 'next/link';
import { MapPin, ImageIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@locore/ui';
import type { FeaturedService } from '@/lib/services/featured';

/**
 * グリッド一覧用のサービスカード。
 *
 * - /services ブラウズページのグリッド (sm 2 / md 3 / lg 4 列) で使う想定
 * - /services/[id] 「同じ provider の他サービス」セクションでも再利用
 * - ServiceCarousel.tsx と意匠は揃えるが、こちらは「縦に積む / 高さ揃え」に最適化
 */

const CATEGORY_LABEL: Record<string, string> = {
  tourism: '観光・現地アテンド',
  consulting: 'コンサル・相談',
  study_abroad: '留学サポート',
  translation: '翻訳・通訳',
  attend: '同行・代行',
  other: 'その他',
};

const CATEGORY_PLACEHOLDER_BG: Record<string, string> = {
  tourism: 'bg-amber-500/15',
  consulting: 'bg-blue-500/15',
  study_abroad: 'bg-emerald-500/15',
  translation: 'bg-purple-500/15',
  attend: 'bg-primary-500/15',
  other: 'bg-foreground/10',
};

type Props = {
  service: FeaturedService;
  href?: string;
};

export function ServiceCard({ service: s, href }: Props) {
  const link = href ?? `/services/${s.id}`;
  return (
    <Link
      href={link}
      aria-label={`${s.title} の詳細を見る`}
      className="flex h-full flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border transition hover:ring-primary-300"
    >
      <div
        className={
          'relative aspect-[3/2] w-full overflow-hidden ' +
          (s.coverImageUrl
            ? 'bg-muted'
            : CATEGORY_PLACEHOLDER_BG[s.category ?? 'other'] ??
              'bg-foreground/10')
        }
      >
        {s.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={s.coverImageUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-foreground/35">
            <ImageIcon className="h-8 w-8" aria-hidden />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-start gap-2">
          {s.category ? (
            <span className="rounded-full bg-primary-500/10 px-2 py-0.5 text-[10px] font-semibold text-primary-300">
              {CATEGORY_LABEL[s.category] ?? s.category}
            </span>
          ) : null}
          {s.priceJpy != null ? (
            <span className="ml-auto text-[14px] font-bold tabular text-primary-300">
              ¥{s.priceJpy.toLocaleString('ja-JP')}
              {s.priceUnit ? (
                <span className="ml-0.5 text-[10px] font-medium text-foreground/60">
                  / {s.priceUnit}
                </span>
              ) : null}
            </span>
          ) : (
            <span className="ml-auto text-[12px] font-medium text-foreground/50">
              応相談
            </span>
          )}
        </div>

        <h3 className="mt-2 line-clamp-2 text-[14px] font-semibold leading-snug">
          {s.title}
        </h3>
        {s.description ? (
          <p className="mt-2 line-clamp-2 whitespace-pre-line text-[12px] leading-relaxed text-foreground/65">
            {s.description}
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar size="sm" className="h-7 w-7 shrink-0">
              {s.ownerAvatarUrl ? (
                <AvatarImage src={s.ownerAvatarUrl} alt="" />
              ) : null}
              <AvatarFallback>
                {s.ownerDisplayName[0]?.toUpperCase() ?? '?'}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-[11px] font-medium text-foreground/75">
              {s.ownerDisplayName}
            </span>
          </div>
          {s.cityNameJa ? (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground/60">
              <MapPin className="h-2.5 w-2.5" />
              {s.cityNameJa}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
