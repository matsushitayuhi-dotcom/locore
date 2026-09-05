import Link from 'next/link';
import { MessageCircle, Repeat, Video } from 'lucide-react';
import type { ResidentPlanCard } from '@/lib/residents/byId';

/**
 * /experts/[id] の継続プラン（伴走・月額）カード。0083。
 *
 * 単発メニュー（ConsultMenuCard）と同じ Intro 型の枠線カードだが、
 * タブを「継続プラン」の黒地＋Repeat アイコンにし、月額と「月 N 回 × M 分」を
 * 大きく見せる。申込導線は /experts/[id]/subscribe?service=<plan.id>（枠選択なし）。
 * viewer が本人のときは申込ボタンを出さない（subscribe 側でも弾かれる）。
 */
export function PlanCard({
  plan,
  expertId,
  isOwner = false,
}: {
  plan: ResidentPlanCard;
  expertId: string;
  isOwner?: boolean;
}) {
  const perMonth =
    plan.sessionsPerMonth != null && plan.durationMinutes != null
      ? `月 ${plan.sessionsPerMonth} 回 × ${plan.durationMinutes} 分`
      : plan.sessionsPerMonth != null
        ? `月 ${plan.sessionsPerMonth} 回`
        : null;

  return (
    <div className="relative rounded-[6px] border border-neutral-900 bg-neutral-900 px-4 pb-[18px] pt-[26px] text-white">
      <span className="absolute -left-px -top-[14px] inline-flex items-center gap-1.5 rounded-[4px_4px_4px_0] bg-primary-500 px-3 py-1 text-[12.5px] font-bold text-neutral-950">
        <Repeat className="h-3.5 w-3.5" aria-hidden />
        継続プラン
      </span>

      {/* 見出しのグローバル色に負けないよう白を明示（黒地カード） */}
      <h3 className="mt-1 text-[19px] font-semibold leading-[1.35] text-white">{plan.title}</h3>
      {plan.description ? (
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-neutral-300">
          {plan.description}
        </p>
      ) : null}

      <div className="mt-4 flex items-baseline gap-2">
        {plan.monthlyPriceJpy != null ? (
          <>
            <b className="text-[24px] font-semibold tabular-nums">
              ¥{plan.monthlyPriceJpy.toLocaleString()}
            </b>
            <span className="text-[12.5px] text-neutral-400">/ 月・税込</span>
          </>
        ) : (
          <b className="text-[18px] font-semibold text-neutral-300">応相談</b>
        )}
      </div>
      {perMonth ? (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-neutral-300">
          <li className="inline-flex items-center gap-1.5">
            <Video className="h-3.5 w-3.5 text-primary-500" aria-hidden />
            {perMonth}のセッション
          </li>
          <li className="inline-flex items-center gap-1.5">
            <MessageCircle className="h-3.5 w-3.5 text-primary-500" aria-hidden />
            期間中のチャット質問
          </li>
        </ul>
      ) : null}

      {!isOwner ? (
        <Link
          href={`/experts/${expertId}/subscribe?service=${plan.id}`}
          className="mt-4 grid h-[50px] place-items-center rounded-[8px] border border-white/80 text-[15px] font-bold transition hover:bg-white hover:text-neutral-900"
        >
          このプランに申し込む
        </Link>
      ) : null}
      <p className="mt-2.5 text-[11.5px] leading-relaxed text-neutral-400">
        申し込み後、エキスパートの承諾で開始。セッションはプラン内の空き枠から予約します。
      </p>
    </div>
  );
}
