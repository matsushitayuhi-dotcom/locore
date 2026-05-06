import { Badge } from '@locore/ui';

type Props = {
  finalScore: number | null;
  warned: boolean;
  status: 'draft' | 'published' | 'archived' | 'pending_review';
};

/**
 * 直近のモデレーション結果を記事編集画面に表示するバナー。
 * - score >= 85: held（編集者ホールド／pending_review）
 * - score >= 70: warned（公開はされるが警告フラグ）
 * - それ未満: pass（バナーは出さない）
 */
export function ModerationBanner({ finalScore, warned, status }: Props) {
  if (status === 'pending_review') {
    return (
      <div className="rounded-md border border-warning-700 bg-warning-50 p-4 text-warning-700">
        <p className="text-[13px] font-medium">編集者の審査待ち</p>
        <p className="mt-1 text-[12px] leading-relaxed text-warning-700/90">
          AI 判定により、この記事は編集者ホールドキューに入りました
          {finalScore != null ? `（最終スコア ${finalScore}）` : ''}。
          編集者が確認後に公開／差し戻しのいずれかが行われます。
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
