export const metadata = {
  title: 'プライバシーポリシー — Locore',
  description:
    'Locore がお預かりする個人情報の取扱いについて。利用目的、第三者提供、開示請求の方法、Cookie の利用などをまとめています。',
};

/**
 * /legal/privacy — プライバシーポリシー。
 *
 * 日本の個人情報保護法 + EU GDPR (現地居住者向け) を意識した記載。
 * Supabase / Stripe / Resend / Anthropic 等の第三者サービスを実態に合わせて列挙。
 */
export default function PrivacyPage() {
  return (
    <article className="prose-legal max-w-prose">
      <Hero
        title="プライバシーポリシー"
        version="v0.9 (β 公開版)"
        updated="2026 年 5 月 19 日"
      />

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
          <li>Stripe Connect 連携時の銀行口座情報 (Stripe 経由で当社は直接保存しません)</li>
          <li>お問い合わせ・通報の内容</li>
        </ul>

        <h3>1.2 サービス利用に伴って自動取得する情報</h3>
        <ul>
          <li>記事閲覧・購入・お気に入り登録などの履歴</li>
          <li>コミュニティ投稿の作成・閲覧履歴</li>
          <li>IP アドレス、ブラウザ種別、デバイス種別 (Vercel Analytics 経由)</li>
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
            ファイルは Supabase Storage の暗号化バケットに保存され、運営チームの
            内 editor 権限を持つ者のみがアクセスできます。
          </li>
          <li>
            確認完了後、原則として <strong>30 日以内に自動削除</strong> されます (GDPR 配慮)。
            cron ジョブ <code>/api/cron/cleanup-verification-files</code> で日次に削除。
          </li>
          <li>確認結果 (承認 / 却下) のみがユーザーレコードに残ります。</li>
          <li>第三者には提供しません。</li>
        </ul>
      </Section>

      <Section n="4" title="第三者提供 (利用しているサービス)">
        <p>
          本サービスの運営にあたり、以下の第三者サービスにユーザー情報を
          提供することがあります。いずれも、各社のプライバシーポリシーに従って
          適切に取り扱われます。
        </p>
        <table className="my-4 w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 text-left font-semibold">サービス名</th>
              <th className="py-2 text-left font-semibold">目的</th>
              <th className="py-2 text-left font-semibold">提供データ</th>
            </tr>
          </thead>
          <tbody className="text-foreground/75">
            <Row name="Supabase" purpose="データベース・認証・ストレージ" data="登録情報全般" />
            <Row name="Vercel" purpose="Web ホスティング・配信" data="リクエスト IP / User-Agent" />
            <Row name="Stripe" purpose="決済処理・売上配分" data="メール / 決済情報 / 銀行口座" />
            <Row name="Resend" purpose="トランザクションメール送信" data="メールアドレス / 送信内容" />
            <Row name="Google" purpose="OAuth ログイン / Maps API" data="Google アカウント情報" />
            <Row name="Anthropic" purpose="掲示板の自動投稿生成 (Claude API)" data="個人情報なし (記事内容のみ)" />
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
          からご連絡ください。原則として 30 日以内にご対応します。
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
        <ul>
          <li>退会後の通常データ: 退会後 30 日以内に削除</li>
          <li>居住確認書類: 確認完了後 30 日以内に自動削除</li>
          <li>取引履歴 (税務上必要なもの): 7 年間保管</li>
          <li>ログ (IP、操作履歴): 90 日間</li>
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
