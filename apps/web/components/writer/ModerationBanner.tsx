import { Badge } from '@locore/ui';

type Props = {
  finalScore: number | null;
  warned: boolean;
  status: 'draft' | 'published' | 'archived' | 'pending_review';
};

/**
 * 直近のモデレーション結果を記事編集画面に表示するバナー。
 * - warned: 公開はされるが「観光客度合い高め」の警告フラグ
 * - それ未満: バナーは出さない
 *
 * （編集者ホールド機能は撤廃。pending_review status は使わない方針）
 */
export function ModerationBanner({ finalScore, warned, status }: Props) {
  // pending_review は撤廃したが、過去データ互換のため簡易表示
  if (status === 'pending_review') {
    return (
      <div className="rounded-md border border-warning-500 bg-warning-50 p-4 text-warning-700">
        <p className="text-[13px] font-medium">公開保留中の記事です</p>
        <p className="mt-1 text-[12px] leading-relaxed">
          status を published に手動更新するか、再公開すれば公開状態になります。
        </p>
      </div>
    );
  }

  if (warned) {
    return (
      <div className="rounded-md border border-warning-500 bg-warning-50 p-4 text-warning-700">
        <p className="text-[13px] font-medium">
          観光客度合いが高い可能性があります
          {finalScore != null ? (
            <Badge variant="warning" className="ml-2">
              スコア {finalScore}
            </Badge>
          ) : null}
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-warning-700/90">
          有名観光地・バズワードの含有が多めです。Locore は
          「観光ガイドにない、もう一段深い視点」を求めています。
          記事の独自性を見直してみてください。
        </p>
      </div>
    );
  }

  return null;
}
