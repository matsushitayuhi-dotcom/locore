import Link from 'next/link';
import { MapPin, ImageIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@locore/ui';
import type { FeaturedService } from '@/lib/services/featured';
import { TAG_LABEL } from '@/lib/services/tagLabels';

/**
 * グリッド一覧用のサービスカード。
 *
 * - /services ブラウズページのグリッド (sm 2 / md 3 / lg 4 列) で使う想定
 * - /services/[id] 「同じ provider の他サービス」セクションでも再利用
 * - ServiceCarousel.tsx と意匠は揃えるが、こちらは「縦に積む / 高さ揃え」に最適化
 *
 * タグ表示方針 (0055):
 *   - 旧: category (単一) チップ
 *   - 新: tags 先頭 2 個をチップ、残りは "+N" にまとめる
 *   - tags が空のレガシーレコードは category にフォールバック
 */

/** 主カテゴリ系タグの日本語ラベル (UI 表示用)。それ以外のフリー文字列はそのまま出す。 */
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

/** 先頭 2 個を chip 表示、残りは +N にまとめる。
 *  tags が空ならレガシー category 1 個にフォールバック。空なら何も返さない。 */
function pickDisplayTags(s: FeaturedService): { shown: string[]; rest: number } {
  const all = s.tags && s.tags.length > 0 ? s.tags : s.category ? [s.category] : [];
  const shown = all.slice(0, 2);
  const rest = Math.max(0, all.length - shown.length);
  return { shown, rest };
}

export function ServiceCard({ service: s, href }: Props) {
  const link = href ?? `/services/${s.id}`;
  const { shown, rest } = pickDisplayTags(s);
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
          {shown.map((t) => (
            <span
              key={t}
              className="rounded-full bg-primary-500/10 px-2 py-0.5 text-[10px] font-semibold text-primary-300"
            >
              {TAG_LABEL[t] ?? t}
            </span>
          ))}
          {rest > 0 ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground/55">
              +{rest}
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
                {s.ownerDisplayName?.[0]?.toUpperCase() ?? '?'}
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
