/**
 * カード / 詳細ページに並べる「対象者」小バッジ。
 *
 * audience が無い (古い投稿) や 'both' は何も表示せず、
 * traveler / resident のときだけ 短期 / 長期 のラベルを返す。
 */

import {
  AUDIENCE_SHORT_LABEL,
  type CommunityAudience,
} from '@/lib/community/constants';

export function AudienceBadge({
  audience,
  size = 'sm',
}: {
  audience: CommunityAudience | undefined | null;
  /** sm: list card / md: detail header */
  size?: 'sm' | 'md';
}) {
  if (!audience) return null;
  const text = AUDIENCE_SHORT_LABEL[audience];

  const sizeClass =
    size === 'md'
      ? 'px-2 py-0.5 text-[10px]'
      : 'px-2 py-0.5 text-[9px]';

  // 旅行者 / 駐在員 / 両方 で色を変える
  const colorClass =
    audience === 'traveler'
      ? 'bg-amber-500/15 text-amber-700'
      : audience === 'resident'
        ? 'bg-blue-500/10 text-blue-600'
        : 'bg-primary-500/10 text-primary-300';

  return (
    <span
      className={
        'rounded-full font-bold uppercase tracking-wider ' +
        sizeClass +
        ' ' +
        colorClass
      }
      title={
        audience === 'traveler'
          ? '旅行者向け (短期)'
          : audience === 'resident'
            ? '駐在員向け (長期)'
            : '旅行者・駐在員 両方'
      }
    >
      {text}
    </span>
  );
}
