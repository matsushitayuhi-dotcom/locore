export const metadata = {
  title: 'プライバシーポリシー — Locore',
  description:
    'Locore がお預かりする個人情報の取扱いについて。利用目的、第三者提供、開示請求の方法、Cookie の利用などをまとめています。',
};

/**
 * /legal/privacy — プライバシーポリシー。
 *
 * 日本の個人情報保護法 + EU GDPR (現地居住者向け) を意識した記載。
 *
 * β 公開版では、利用している第三者サービスの実名・具体的な保管期間などは
 * 保守的に「カテゴリ表現」「必要な期間」に丸めている。詳細な提供事業者名は
 * ご請求に応じて遅滞なく開示する運用とし、本格運用開始に合わせて随時改定する。
 */
export default function PrivacyPage() {
  return (
    <article className="prose-legal max-w-prose">
      <Hero
        title="プライバシーポリシー"
        version="v0.9 (β 公開版)"
        updated="2026 年 5 月 19 日"
      />

      <Banner>
        本ポリシーは β 公開版です。サービスの本格運用開始に合わせて随時改定します。
        個別の事業者名・詳細な処理内容は、ご請求に応じて遅滞なく書面で開示します。
      </Banner>

      <p className="text-[13px] leading-[1.9] text-foreground/75">
        Locore Inc.（以下「当社」）は、本サービス「Locore」を通じてお預かりする
        個人情報を、本ポリシーに従って適切に取り扱います。
      </p>

      <Section n="1" title="取得する情報">
        <h3>1.1 ユーザーから直接ご提供いただく情報</h3>
        <ul>
          <li>メールアドレス、表示名、プロフィール写真、自己紹介文</li>
          <li>居住国・居住都市・滞在年数・職業・家族構成 (任意)</li>
          <li>クリエイター申請時の居住確認書類 (本人確認書類、居住地証明書)</li>
          <li>決済代行サービスを通じてご提供いただく決済関連情報 (カード番号等のセンシティブ情報は当社では直接保存しません)</li>
          <li>お問い合わせ・通報の内容</li>
        </ul>

        <h3>1.2 サービス利用に伴って自動取得する情報</h3>
        <ul>
          <li>記事閲覧・購入・お気に入り登録などの履歴</li>
          <li>コミュニティ投稿の作成・閲覧履歴</li>
          <li>IP アドレス、ブラウザ種別、デバイス種別等のアクセスログ</li>
          <li>Cookie 識別子 (詳細は <a href="/legal/cookies" className="text-primary-300 hover:underline">Cookie ポリシー</a> 参照)</li>
        </ul>
      </Section>

      <Section n="2" title="利用目的">
        <p>取得した情報は以下の目的で利用します。</p>
        <ol>
          <li>本サービスの提供 (記事配信、購入処理、コミュニティ機能、メッセージ送受信)</li>
          <li>クリエイターの居住確認、記事品質管理</li>
          <li>不正利用の検知・防止</li>
          <li>サービス改善のための統計分析 (個人を特定しない形に集計)</li>
          <li>当社からのお知らせ送信 (重要なものに限る、マーケティングは別途同意)</li>
          <li>法令に基づく開示請求への対応</li>
        </ol>
      </Section>

      <Section n="3" title="居住確認書類の取り扱い (重要)">
        <p>
          クリエイター申請時に提出いただく居住確認書類は、特に厳重に取り扱います。
        </p>
        <ul>
          <li>
            ファイルは暗号化された安全な領域に保存され、運営チームのうち
            権限を持つ者のみがアクセスできます。
          </li>
          <li>
            確認完了後、原則として<strong>確認の目的の達成に必要な期間内で
            速やかに削除</strong>されます (GDPR 配慮)。
          </li>
          <li>確認結果 (承認 / 却下) のみがユーザーレコードに残ります。</li>
          <li>第三者には提供しません。</li>
        </ul>
      </Section>

      <Section n="4" title="第三者提供 (利用しているサービス)">
        <p>
          本サービスの運営にあたり、当社は信頼できる第三者サービスを利用しています。
          具体的には、ホスティング・データベース・決済処理・メール配信・認証・
          地図表示等のサービスです。すべての提供事業者は、業界標準のセキュリティと
          プライバシー保護基準を満たしています。
        </p>
        <p className="mt-2">
          いずれのサービスも、各社のプライバシーポリシーに従って適切に取り扱われます。
          利用している事業者の個別の名称については、
          <a href="/contact" className="text-primary-300 hover:underline">お問い合わせフォーム</a>
          よりご請求があれば遅滞なく開示します。
        </p>
        <table className="my-4 w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 text-left font-semibold">サービス区分</th>
              <th className="py-2 text-left font-semibold">目的</th>
              <th className="py-2 text-left font-semibold">提供データ</th>
            </tr>
          </thead>
          <tbody className="text-foreground/75">
            <Row name="ホスティング・配信" purpose="Web サイトの配信" data="リクエスト IP / User-Agent" />
            <Row name="データベース・ストレージ・認証" purpose="アカウント管理・データ保存" data="登録情報全般" />
            <Row name="決済処理" purpose="購入決済・売上配分" data="メール / 決済関連情報" />
            <Row name="メール配信" purpose="トランザクションメール送信" data="メールアドレス / 送信内容" />
            <Row name="外部 ID 連携" purpose="ソーシャルログイン" data="連携元アカウントの公開プロフィール" />
            <Row name="AI コンテンツ生成" purpose="掲示板向けの公開情報の自動整形" data="個人情報を含まない公開情報のみ" />
          </tbody>
        </table>
      </Section>

      <Section n="5" title="EU 居住者の権利 (GDPR)">
        <p>
          EU 居住者の方は、以下の権利を有します。
        </p>
        <ul>
          <li>自身の個人情報の<strong>開示請求</strong>権</li>
          <li>不正確な情報の<strong>訂正</strong>請求権</li>
          <li><strong>削除</strong>請求権 (忘れられる権利)</li>
          <li><strong>処理の制限</strong>請求権</li>
          <li><strong>データポータビリティ</strong>権 (機械可読形式での提供)</li>
          <li>処理への<strong>異議</strong>申立権</li>
        </ul>
        <p>
          これらの請求は <a href="/contact" className="text-primary-300 hover:underline">お問い合わせフォーム</a>
          からご連絡ください。法令に従い、合理的な期間内にご対応します。
        </p>
      </Section>

      <Section n="6" title="日本居住者の権利 (個人情報保護法)">
        <p>
          日本居住者の方は、個人情報保護法に基づき、自身の個人情報について
          開示・訂正・削除・利用停止を請求できます。
          <a href="/contact" className="text-primary-300 hover:underline">お問い合わせ</a> よりご連絡ください。
        </p>
      </Section>

      <Section n="7" title="保管期間">
        <p>
          取得した個人情報は、<strong>法令およびサービスの提供上必要な期間</strong>
          に限り保管します。
        </p>
        <ul>
          <li>退会後の通常データ: 利用目的を達成した後、合理的な期間内に削除</li>
          <li>居住確認書類: 確認目的の達成後、速やかに削除</li>
          <li>取引履歴: 関係法令で定められた期間にわたり保管</li>
          <li>ログ等の運用情報: サービスの安定運用に必要な期間に限り保管</li>
        </ul>
      </Section>

      <Section n="8" title="お子様の個人情報">
        <p>
          本サービスは原則として 18 歳以上の方を対象としています。
          18 歳未満の方の個人情報については、保護者の同意を得たうえで
          取得・利用します。
        </p>
      </Section>

      <Section n="9" title="ポリシーの改定">
        <p>
          本ポリシーは、法令の変更やサービス内容の変化に応じて改定することがあります。
          重要な変更がある場合は、本サービス上でお知らせします。
        </p>
      </Section>

      <Section n="10" title="お問い合わせ窓口">
        <p>
          個人情報の取り扱いに関するご質問・ご請求は、以下の窓口までお願いします。
        </p>
        <ul>
          <li>窓口: <a href="/contact" className="text-primary-300 hover:underline">Locore お問い合わせフォーム</a></li>
          <li>事業者名: Locore Inc.</li>
          <li>個人情報保護管理責任者: 運営チーム (代表)</li>
        </ul>
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
        <span className="mr-2 text-foreground/55">§{n}</span>
        {title}
      </h2>
      <div className="space-y-3 text-[13px] leading-[1.9] text-foreground/75 [&_h3]:mt-4 [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:my-1 [&_ul_li]:ml-5 [&_ul_li]:list-disc [&_ol_li]:ml-5 [&_ol_li]:list-decimal [&_th]:px-2 [&_td]:px-2 [&_td]:py-1.5 [&_tr]:border-b [&_tr]:border-border [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[11px]">
        {children}
      </div>
    </section>
  );
}

function Row({
  name,
  purpose,
  data,
}: {
  name: string;
  purpose: string;
  data: string;
}) {
  return (
    <tr>
      <td className="font-semibold">{name}</td>
      <td>{purpose}</td>
      <td>{data}</td>
    </tr>
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
