export const metadata = {
  title: 'Cookie ポリシー — Locore',
  description:
    'Locore で利用している Cookie の種類と目的、無効化の方法について説明します。',
};

/**
 * /legal/cookies — Cookie ポリシー。
 *
 * EU Cookie Directive と日本電気通信事業法 (改正、外部送信規律) を意識。
 * 詳細はプライバシーポリシー §4 の第三者提供と整合させる。
 */
export default function CookiesPage() {
  return (
    <article className="prose-legal max-w-prose">
      <Hero
        title="Cookie ポリシー"
        version="v0.9 (β 公開版)"
        updated="2026 年 5 月 19 日"
      />

      <Banner>
        本ポリシーは β 公開版です。サービスの本格運用開始に合わせて随時改定します。
        利用している事業者の個別名称等の詳細は、ご請求に応じて遅滞なく開示します。
      </Banner>

      <p className="text-[13px] leading-[1.9] text-foreground/75">
        Locore（以下「本サービス」）では、ユーザーの利便性向上とサービス品質の改善のため、
        Cookie および類似技術 (ローカルストレージ等) を利用します。本ポリシーは、その種類と
        目的を分かりやすくご説明するためのものです。
      </p>

      <Section n="1" title="Cookie とは">
        <p>
          Cookie は、ウェブサイトがユーザーの端末に保存する小さなテキストファイルです。
          ログイン状態の維持、設定の記憶、利用状況の分析などに使われます。
        </p>
      </Section>

      <Section n="2" title="本サービスが利用する Cookie の種類">
        <h3>2.1 必須 Cookie (Strictly Necessary)</h3>
        <p>
          サービスの基本的な動作に必要不可欠で、無効にすると正常にご利用いただけません。
          ユーザーの明示的な同意なしに利用します。
        </p>
        <ul>
          <li>
            <strong>セッション Cookie</strong>: ログイン状態の維持
          </li>
          <li>
            <strong>CSRF トークン</strong>: 不正リクエストの防止
          </li>
          <li>
            <strong>モード選択</strong>: 旅行者 / 駐在員のモード設定
          </li>
        </ul>

        <h3>2.2 機能 Cookie (Functional)</h3>
        <p>
          利便性向上のための設定を覚えるものです。
        </p>
        <ul>
          <li>言語設定 (日本語 / 英語 / フランス語)</li>
          <li>テーマ設定 (将来のダークモード等)</li>
          <li>表示の好み (リスト / グリッド等)</li>
        </ul>

        <h3>2.3 分析 Cookie (Analytics)</h3>
        <p>
          利用状況を匿名で集計し、サービス改善に活用するものです。
          個人を特定する情報は含みません。
        </p>
        <ul>
          <li>ページビュー、参照元、デバイス種別等の匿名統計情報</li>
        </ul>

        <h3>2.4 第三者 Cookie</h3>
        <p>
          本サービスは以下のカテゴリの第三者サービスを利用しており、それぞれの Cookie が
          設定される場合があります。各社のプライバシーポリシーに従って取り扱われます。
        </p>
        <ul>
          <li>
            <strong>決済代行サービス</strong>: 決済時の不正検知
          </li>
          <li>
            <strong>地図表示サービス</strong>: 地図の表示
          </li>
          <li>
            <strong>認証サービス</strong>: 外部アカウントでのログイン
          </li>
        </ul>
        <p className="mt-2 text-[12px] text-foreground/65">
          ※ 個別のサービス事業者名は、ご請求に応じて
          <a href="/contact" className="text-primary-300 hover:underline">お問い合わせフォーム</a>
          より遅滞なく開示します。
        </p>
      </Section>

      <Section n="3" title="Cookie の管理・無効化">
        <p>
          ご利用のブラウザの設定から、Cookie の保存を制限したり、過去の Cookie を
          削除したりできます。
        </p>
        <ul>
          <li>
            <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary-300 hover:underline">
              Google Chrome
            </a>
          </li>
          <li>
            <a href="https://support.apple.com/ja-jp/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary-300 hover:underline">
              Safari
            </a>
          </li>
          <li>
            <a href="https://support.mozilla.org/ja/kb/clear-cookies-and-site-data-firefox" target="_blank" rel="noopener noreferrer" className="text-primary-300 hover:underline">
              Firefox
            </a>
          </li>
          <li>
            <a href="https://support.microsoft.com/ja-jp/microsoft-edge/" target="_blank" rel="noopener noreferrer" className="text-primary-300 hover:underline">
              Microsoft Edge
            </a>
          </li>
        </ul>
        <p className="mt-3 text-[12px] text-foreground/65">
          ※ 必須 Cookie を無効にすると、ログイン・記事購入などの主要機能が利用できなくなります。
        </p>
      </Section>

      <Section n="4" title="保管期間">
        <ul>
          <li><strong>セッション Cookie</strong>: ブラウザを閉じると削除されます</li>
          <li><strong>持続的 Cookie</strong>: 各 Cookie の用途に必要な期間に限り保管されます</li>
          <li><strong>第三者 Cookie</strong>: 各社のポリシーに従います</li>
        </ul>
      </Section>

      <Section n="5" title="改定">
        <p>
          本ポリシーは、サービスの変更・法令の改正等に応じて改定する場合があります。
          重要な変更がある場合は本サービス上でお知らせします。
        </p>
      </Section>

      <Section n="6" title="お問い合わせ">
        <p>
          Cookie に関するご質問は、
          <a href="/contact" className="text-primary-300 hover:underline">お問い合わせフォーム</a>
          までお願いします。
        </p>
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
        <span className="mr-2 text-foreground/55">§{n}</span>
        {title}
      </h2>
      <div className="space-y-3 text-[13px] leading-[1.9] text-foreground/75 [&_h3]:mt-4 [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:my-1 [&_ul_li]:ml-5 [&_ul_li]:list-disc">
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
