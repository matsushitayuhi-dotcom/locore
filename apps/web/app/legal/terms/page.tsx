export const metadata = {
  title: '利用規約 — Locore',
  description:
    'Locore（以下「本サービス」）の利用規約。会員登録、有料記事の購入、コミュニティ投稿、ユーザーサービスの提供などについて定めています。',
};

/**
 * /legal/terms — 利用規約。
 *
 * MOC 用テンプレート。note / Substack / Mercari の構成を参考に、Locore 固有の
 * 「有料記事の販売」「居住確認」「コミュニティ投稿」「ユーザーサービス」を
 * 明示している。正式版では弁護士確認の上で内容を確定する。
 */
export default function TermsPage() {
  return (
    <article className="prose-legal max-w-prose">
      <Hero
        title="利用規約"
        version="v0.9 (β 公開版)"
        updated="2026 年 5 月 19 日"
      />

      <Banner>
        本規約は β 公開版です。サービスの本格運用開始に伴い、改定する場合があります。
        改定の際は本ページにて 7 日以上前に告知します。
      </Banner>

      <Section n="第1条" title="適用">
        <p>
          本規約は、Locore Inc.（以下「当社」）が提供する「Locore」（以下「本サービス」）の利用条件を定めるものです。
          本サービスを利用するすべての方（以下「ユーザー」）は、本規約に同意のうえご利用ください。
        </p>
      </Section>

      <Section n="第2条" title="定義">
        <ol>
          <li>
            <strong>クリエイター</strong>: 本サービスにおいて記事・コンテンツを投稿・販売するユーザーをいいます。
          </li>
          <li>
            <strong>読者</strong>: 本サービスにおいて記事を閲覧・購入するユーザーをいいます。
          </li>
          <li>
            <strong>有料コンテンツ</strong>: 当社が定める価格設定 (¥500 〜 ¥3,000 程度) で
            クリエイターが販売するデジタルコンテンツをいいます。
          </li>
          <li>
            <strong>コミュニティ投稿</strong>: 求人 / アパート / 売買 / グループ / レッスン /
            助け合い の 6 カテゴリでユーザーが投稿する情報をいいます。
          </li>
          <li>
            <strong>ユーザーサービス</strong>: 現地ガイド・通訳・コンサルなど、
            クリエイターが第三者向けに提供するサービスをいいます。
          </li>
        </ol>
      </Section>

      <Section n="第3条" title="会員登録">
        <ol>
          <li>
            本サービスの会員登録は、当社が定める方法によりメールアドレスまたは
            Google アカウントで行います。
          </li>
          <li>
            登録時に虚偽の情報を申告した場合、当社は登録を取り消すことができます。
          </li>
          <li>
            18 歳未満の方は、保護者の同意を得たうえでご利用ください。
          </li>
        </ol>
      </Section>

      <Section n="第4条" title="クリエイター申請と居住確認">
        <ol>
          <li>
            記事を投稿・販売するためには、クリエイター申請を行う必要があります。
          </li>
          <li>
            申請時に「居住確認 (Residency Verification)」をご提出いただきます。
            本人確認書類および居住地証明書 (公共料金請求書、住民登録票など)
            の写しを安全な経路でアップロードしてください。
          </li>
          <li>
            提出された書類は、原則として確認完了後 30 日以内に当社管理下から
            自動削除されます (GDPR 配慮)。詳細はプライバシーポリシーをご覧ください。
          </li>
        </ol>
      </Section>

      <Section n="第5条" title="記事の販売と購入">
        <ol>
          <li>
            記事の販売価格はクリエイターが指定し、当社所定の価格帯から選択します。
          </li>
          <li>
            購入は Stripe を通じたクレジットカード決済で行われます。
          </li>
          <li>
            購入完了後、購入者は永続的に該当記事を閲覧できます。
            ただし、クリエイターが記事を非公開・削除した場合の挙動は
            <strong>「購入済みユーザーには引き続き閲覧可能」</strong>とします。
          </li>
          <li>
            記事の品質に著しい問題がある場合、購入から 14 日以内に運営にお問い合わせいただければ
            個別に返金対応します。
          </li>
        </ol>
      </Section>

      <Section n="第6条" title="売上配分">
        <ol>
          <li>
            有料記事の売上は、Stripe 手数料を差し引いた金額の <strong>80%</strong> を
            クリエイターに、<strong>20%</strong> を運営手数料として当社が受領します。
          </li>
          <li>
            Founders 50 枠のクリエイターは、立ち上げ期 1 年間の手数料を
            <strong>10%</strong> に優遇します。
          </li>
          <li>
            クリエイターへの支払いは Stripe Connect を通じて月次で行います。
          </li>
        </ol>
      </Section>

      <Section n="第7条" title="禁止事項">
        <p>本サービスのご利用に際し、以下の行為を禁止します。</p>
        <ul>
          <li>法令または公序良俗に違反する行為</li>
          <li>当社、他のユーザー、その他第三者の権利を侵害する行為</li>
          <li>
            事実と異なる情報の投稿、現地に住んでいないにもかかわらず居住者を
            装う行為
          </li>
          <li>第三者に著作権・肖像権がある写真の無断利用</li>
          <li>本サービスの運営を妨げる行為、不正アクセス</li>
          <li>営利目的の宣伝行為 (クリエイター活動および承認済みのサービス提供を除く)</li>
          <li>差別的・侮辱的・脅迫的な表現</li>
          <li>その他、当社が不適切と判断する行為</li>
        </ul>
      </Section>

      <Section n="第8条" title="コンテンツの権利">
        <ol>
          <li>
            ユーザーが投稿したコンテンツの著作権は、原則として投稿したユーザーに帰属します。
          </li>
          <li>
            ユーザーは、当社に対し、本サービスの提供・改善・宣伝の目的で、
            コンテンツを無償・非独占的に複製・公衆送信・翻案する権利を許諾します。
          </li>
          <li>
            本サービスが将来終了した場合、ユーザーは合理的な期間内に
            自身のコンテンツをエクスポートできます。
          </li>
        </ol>
      </Section>

      <Section n="第9条" title="モデレーションと削除">
        <ol>
          <li>
            当社は、本規約または Locore コミュニティガイドラインに違反すると
            判断したコンテンツについて、事前通告なく非公開化または削除することがあります。
          </li>
          <li>
            通報を受けたコンテンツは、運営チームが 24 〜 72 時間以内に確認します。
          </li>
        </ol>
      </Section>

      <Section n="第10条" title="サービスの中断・終了">
        <ol>
          <li>
            天災、システム障害、その他やむを得ない事情がある場合、
            当社は本サービスを一時中断することがあります。
          </li>
          <li>
            本サービスを終了する場合、当社は少なくとも 90 日前に
            ユーザーに通知します。
          </li>
        </ol>
      </Section>

      <Section n="第11条" title="免責">
        <ol>
          <li>
            当社は、本サービスを通じて掲載される情報の正確性・最新性について
            合理的な努力を払いますが、現地の最新状況 (営業時間、価格、定休日など)
            は変動する場合があります。
          </li>
          <li>
            ユーザー間のトラブル (コミュニティ投稿の取引、ユーザーサービスの提供等) は、
            原則として当事者間で解決していただきます。
            当社は調停の責任を負いません。
          </li>
        </ol>
      </Section>

      <Section n="第12条" title="準拠法・裁判管轄">
        <ol>
          <li>本規約の解釈および適用には、日本法が適用されます。</li>
          <li>
            本サービスに関連して生じた紛争については、東京地方裁判所を
            第一審の専属的合意管轄裁判所とします。
          </li>
        </ol>
      </Section>

      <Footer updated="2026 年 5 月 19 日" version="v0.9 (β 公開版)" />
    </article>
  );
}

function Hero({
  title,
  version,
  updated,
}: {
  title: string;
  version: string;
  updated: string;
}) {
  return (
    <header className="mb-8 border-b border-border pb-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
        Locore Legal
      </p>
      <h1
        className="mt-2 text-[28px] font-bold tracking-tight sm:text-[32px]"
        style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
      >
        {title}
      </h1>
      <p className="mt-2 text-[12px] tabular text-foreground/55">
        最終更新: {updated} ｜ バージョン: {version}
      </p>
    </header>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <aside className="my-6 rounded-md border border-warning-500/30 bg-warning-50/50 px-4 py-3 text-[12px] leading-relaxed text-foreground/75">
      <strong className="text-warning-700">お知らせ:</strong> {children}
    </aside>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[16px] font-bold tracking-tight">
        <span className="mr-2 text-foreground/55">{n}</span>
        {title}
      </h2>
      <div className="space-y-3 text-[13px] leading-[1.9] text-foreground/75 [&_li]:ml-5 [&_li]:list-disc [&_li]:my-1 [&_ol_li]:list-decimal">
        {children}
      </div>
    </section>
  );
}

function Footer({ updated, version }: { updated: string; version: string }) {
  return (
    <footer className="mt-12 border-t border-border pt-6 text-[12px] text-foreground/55">
      <p>制定: {updated}（{version}）</p>
      <p className="mt-1">Locore Inc.</p>
    </footer>
  );
}
