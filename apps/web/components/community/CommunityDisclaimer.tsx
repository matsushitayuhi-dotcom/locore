import { AlertTriangle } from 'lucide-react';
import type { CommunityKind } from '@/lib/community/constants';

/**
 * コミュニティ系ページ上部に常時表示する注意書き。
 *
 * 立ち位置の整理:
 *   - Locore は住人どうしを「つなぐ場」を運営しています
 *   - 個別の契約や金銭のやり取りは当事者間の合意で進めていただきます
 *   - 規約違反・詐欺・差別的投稿は通報を受けて対応します
 *     （通報先: 各投稿の "..." メニュー / Contact フォーム）
 *
 * これまでの「場を提供しているだけ」という書き方は責任逃れに読めるので、
 * 「Locore は何をする / 何はあなた次第」を切り分けて書く形に変えた。
 */

const NOTICE_BY_KIND: Record<CommunityKind, string[]> = {
  job: [
    '雇用契約・労働条件・賃金支払いは募集側と応募者の当事者間で合意してください。Locore は採用結果や賃金未払いの保証はしません。',
    'ただし、差別的条件（国籍・性別・年齢など合理的理由のない制限）や違法投稿は、通報があれば運営が確認し削除・アカウント停止を行います。',
    '在留資格・労働許可の有無の確認はご自身で行ってください。',
  ],
  apartment: [
    '賃貸借契約・敷金・退去精算は貸主と借主の当事者間で進めてください。',
    '「内見前送金」「保証金の前払い要求」は詐欺の典型例です。怪しい投稿に気付いたら通報してください。運営が確認次第、削除・アカウント停止します。',
    '正規の賃貸借契約書（contrat de bail）を必ず取り交わしてください。',
  ],
  marketplace: [
    '代金の受け渡し方法は売主と買主の当事者間で合意してください。高額品は対面 + 現金 / 銀行振込を推奨します。',
    '「先払いのみ」「発送のみ」を強要する投稿は通報してください。確認次第対応します。',
    '車・電気製品・PC は実物確認を強く推奨します。',
  ],
  group: [
    '初対面の方とお会いになる際は、公共の場で日中の時間帯を選んでください。',
    '主催者が不明瞭・不安を感じる場合は参加を見送り、必要なら通報してください。',
  ],
  lesson: [
    'レッスン内容・料金・キャンセル規定は教える側と習う側の当事者間で合意してください。',
    '初回は体験レッスン（短時間 / カフェ等公共の場）から始めることを推奨します。前払いを強要されたら通報してください。',
  ],
  mutual_aid: [
    '助け合いは無償または小額のお礼が原則です。金銭・物品の事前要求があれば慎重に判断し、不審なら通報してください。',
    '個人宅への訪問は、メッセージで信頼関係を築いてから受けてください。',
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
