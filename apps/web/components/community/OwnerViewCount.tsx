import { Eye } from 'lucide-react';
import type { CurrentUser } from '@/lib/auth/current-user';

/**
 * 投稿の閲覧数バッジ。
 *
 * 閲覧数は一般読者に見せると「人気で釣りたい / 釣られたくない」両方向の
 * インセンティブを生み、Locore のトーンと合わないので、表示は次の 2 ケースに限る。
 *
 *   1. viewer が投稿者本人 (`viewer.id === ownerId`)
 *   2. viewer が editor ロール (`viewer.role === 'editor'`)
 *
 * 上記いずれにも該当しない場合は何も描画しない (`null`)。
 * /admin/* 系は editor がアクセスする想定で、別途独自に閲覧数を出している。
 *
 * 表示はアイコン + 数字 (例: 👁 234) と、補足の "views" ラベルを小さく添える。
 * 数値は `toLocaleString` 整形。
 */
export function OwnerViewCount({
  viewer,
  ownerId,
  count,
  className,
}: {
  viewer: CurrentUser | null;
  ownerId: string | null;
  count: number;
  className?: string;
}) {
  if (!viewer) return null;
  const isOwner = !!ownerId && viewer.id === ownerId;
  const isEditor = viewer.role === 'editor';
  if (!isOwner && !isEditor) return null;
  return (
    <span
      className={
        'inline-flex items-center gap-1 text-[11px] text-foreground/45 ' +
        (className ?? '')
      }
      aria-label={`閲覧数 ${count}`}
      title={isEditor && !isOwner ? 'editor のみに表示' : '投稿者にのみ表示'}
    >
      <Eye className="h-3 w-3" />
      <span className="tabular">{count.toLocaleString()}</span>
      <span className="text-[10px] text-foreground/35">views</span>
    </span>
  );
}
