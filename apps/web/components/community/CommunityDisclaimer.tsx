import { AlertTriangle } from 'lucide-react';
import type { CommunityKind } from '@/lib/community/constants';

/**
 * コミュニティ系ページ上部に常時表示する注意書き。
 *
 * 立ち位置:
 *   - Locore は「書き込みの場の提供」のみ
 *   - 投稿内容のチェック、契約・受け渡し・支払いには関与しない
 *   - 「仲介」という言葉は積極的な責任を示唆するので使わない
 *   - 困ったときの問い合わせは「メニュー下部の Contact フォーム」に集約
 *     （「運営に通報したら何かしてもらえる」という期待を生まないため）
 */

const NOTICE_BY_KIND: Record<CommunityKind, string[]> = {
  job: [
    'Locore はこの掲示板の場を提供しているだけで、雇用契約・労働条件・賃金支払いには関与しません。',
    '差別的な条件設定（国籍・性別・年齢など合理的理由なき制限）はフランス法・日本法ともに禁止です。',
    '在留資格・労働許可の有無を必ず確認してください。',
  ],
  apartment: [
    'Locore はこの掲示板の場を提供しているだけで、賃貸借契約・敷金・退去時のやり取りには関与しません。',
    '内見せず契約しない、「契約前送金」「保証金前払い」は詐欺の典型例です。',
    '正規の賃貸借契約書（contrat de bail）を必ず締結してください。',
  ],
  marketplace: [
    'Locore はこの掲示板の場を提供しているだけで、売買代金・物品受け渡しには関与しません。',
    '高額品は対面 + 現金 / 銀行振込を推奨。事前送金は詐欺リスクが高いです。',
    '車・電気製品・PC は実物確認を強く推奨します。',
  ],
  group: [
    '初対面の方とお会いになる際は、公共の場で日中の時間帯を選んでください。',
    '主催者の情報を確認し、不安に感じたら参加を見送ってください。',
  ],
  lesson: [
    'Locore はこの掲示板の場を提供しているだけで、レッスン内容・料金・キャンセル規定には関与しません。',
    '初回は体験レッスン（短時間 / カフェ等公共の場）から始めることを推奨します。',
    '前払いを求められた場合は慎重に判断してください。',
  ],
  mutual_aid: [
    '助け合いは無償または小額のお礼が原則。金銭・物品の事前要求があれば慎重に。',
    '個人宅への訪問は、信頼関係を築いてから受けてください。',
  ],
};

const KIND_TITLE: Record<CommunityKind, string> = {
  job: '求人投稿・応募の前に',
  apartment: 'アパート掲載・問い合わせの前に',
  marketplace: '売買の前に',
  group: 'グループ参加の前に',
  lesson: 'レッスン申し込みの前に',
  mutual_aid: '依頼・申し出の前に',
};

export function CommunityDisclaimer({ kind }: { kind: CommunityKind }) {
  const notices = NOTICE_BY_KIND[kind];
  return (
    <aside
      role="note"
      aria-label="ご利用上の注意"
      className="rounded-lg border border-amber-500/40 bg-amber-50/60 p-4 text-[12px] leading-relaxed text-amber-900"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <div>
          <p className="font-bold text-amber-900">{KIND_TITLE[kind]}</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            {notices.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}

/** 投稿フォーム内に表示する「個人連絡先を本文に書かないで」注意 */
export function ContactLeakWarning() {
  return (
    <aside
      role="note"
      className="rounded-md border border-blue-500/30 bg-blue-50 p-3 text-[11px] leading-relaxed text-blue-900"
    >
      <p className="font-bold">連絡は Locore メッセージで</p>
      <p className="mt-0.5">
        本文に電話番号・メールアドレス・LINE / WhatsApp 等の ID を書かないでください。
        やり取りを通して相手を確認した後で、ご自身の判断で個人連絡先を共有してください。
      </p>
    </aside>
  );
}
