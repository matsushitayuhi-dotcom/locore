export const metadata = {
  title: '特定商取引法に基づく表記 — Locore',
  description:
    'Locore における有料コンテンツ販売およびユーザーサービス提供に関する、特定商取引法に基づく表記です。',
};

/**
 * /legal/commercial — 特定商取引法に基づく表記。
 *
 * 日本の特商法に基づき、有料記事販売事業者として開示が義務付けられる
 * 事項を網羅。MOC 用に運営者情報はプレースホルダ、正式版で確定。
 */
export default function CommercialPage() {
  return (
    <article className="prose-legal max-w-prose">
      <Hero
        title="特定商取引法に基づく表記"
        version="v0.9 (β 公開版)"
        updated="2026 年 5 月 19 日"
      />

      <p className="text-[13px] leading-[1.9] text-foreground/75">
        特定商取引に関する法律 第 11 条に基づき、Locore における有料コンテンツの
        販売、およびユーザーサービスの提供に関する事項を以下のとおり表示します。
      </p>

      <dl className="mt-8 grid grid-cols-1 gap-y-5 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-x-6 sm:gap-y-4">
        <Row label="販売事業者">Locore Inc.</Row>
        <Row label="運営責任者">代表取締役（正式版で表示）</Row>
        <Row label="所在地">
          〒XXX-XXXX 東京都（正式版で番地まで表示）
          <Note>※ ご請求があれば遅滞なく書面で開示いたします</Note>
        </Row>
        <Row label="電話番号">
          ご請求により遅滞なく開示
          <Note>
            ※ お問い合わせは原則として <a href="/contact" className="text-primary-300 hover:underline">お問い合わせフォーム</a> をご利用ください
          </Note>
        </Row>
        <Row label="メールアドレス">
          ご請求により遅滞なく開示
          <Note>※ お問い合わせフォームからご連絡ください</Note>
        </Row>
        <Row label="ホームページ URL">https://www.locore.app</Row>
        <Row label="販売価格">
          各記事・サービスのページに表示
          <Note>
            有料記事は ¥500〜¥3,000 程度を想定。
            ユーザーサービスは各クリエイターが設定。
            消費税および決済手数料込みの価格を表示します。
          </Note>
        </Row>
        <Row label="商品代金以外の必要料金">
          通信料はお客様のご負担となります。
          代金の決済方法によっては、決済代行会社の手数料が別途必要となる場合があります。
        </Row>
        <Row label="支払方法">
          クレジットカード決済 (Visa / Mastercard / American Express / JCB / Diners)
          <Note>
            ※ 決済は Stripe Inc. を通じて行われます。当社はカード番号を直接保持しません。
          </Note>
        </Row>
        <Row label="支払時期">商品購入の確定操作時に即時決済</Row>
        <Row label="商品の引渡時期">
          決済完了後、即時にコンテンツへのアクセス権が付与されます
        </Row>
        <Row label="商品の引渡方法">
          本サービスのウェブサイト上で、購入者のアカウントから閲覧可能となります
        </Row>
        <Row label="返品・キャンセル">
          <p>
            デジタルコンテンツの性質上、購入完了後の返品・キャンセルは
            原則としてお受けできません。
          </p>
          <p className="mt-2">
            ただし、以下のいずれかに該当する場合は個別にご対応します。
            お問い合わせフォームよりご連絡ください。
          </p>
          <ul className="mt-2 list-disc pl-5 text-[12px]">
            <li>記事の品質が著しく低い、明らかな事実誤認が含まれる</li>
            <li>購入後にクリエイターが該当記事を削除した</li>
            <li>システム障害により正常にコンテンツが表示されない</li>
            <li>その他、当社が合理的に判断する事由</li>
          </ul>
          <p className="mt-2 text-[12px] text-foreground/65">
            ※ 申請は購入から <strong>14 日以内</strong>に限ります
          </p>
        </Row>
        <Row label="動作環境">
          <ul className="list-disc pl-5 text-[12px]">
            <li>対応ブラウザ: Google Chrome / Safari / Firefox / Microsoft Edge の最新版</li>
            <li>OS: Windows 10 以降、macOS 11 以降、iOS 15 以降、Android 10 以降</li>
            <li>JavaScript および Cookie が有効である必要があります</li>
            <li>安定したインターネット接続環境 (画像読み込みに 5 Mbps 以上を推奨)</li>
          </ul>
        </Row>
        <Row label="クリエイターへの売上配分">
          <p>
            有料記事の売上は、Stripe 手数料を差し引いた金額の <strong>80%</strong> を
            クリエイターに、<strong>20%</strong> を当社が運営手数料として受領します。
            支払いは Stripe Connect を通じて月次で行います。
          </p>
          <p className="mt-2 text-[12px] text-foreground/65">
            ※ Founders 50 枠は、立ち上げ期 1 年間の手数料を <strong>10%</strong> に優遇します
          </p>
        </Row>
      </dl>

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

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <dt className="text-[12px] font-semibold uppercase tracking-wider text-foreground/55 sm:pt-1">
        {label}
      </dt>
      <dd className="text-[13px] leading-[1.85] text-foreground/85">
        {children}
      </dd>
    </>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 text-[11px] text-foreground/55">{children}</p>
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
