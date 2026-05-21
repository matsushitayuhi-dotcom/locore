import { Badge } from '@locore/ui';
import { Sparkles, Check } from '@locore/ui/icons';
import { FoundersForm } from '../../components/FoundersForm';

export const metadata = {
  title: 'Founders 枠 — Locore',
};

const PERKS = [
  {
    title: '取り分の優遇（永久）',
    body: '通常の Tier S 取り分（70%）に加え、Founders 限定の +5% を永久に保証します。',
  },
  {
    title: '永久 Founding バッジ',
    body: '記事と著者プロフィールに、編集が認証する Founding マークが残り続けます。',
  },
  {
    title: '編集チームへの提案権',
    body: '月次のオンライン MTG で、クリエイター目線でのフィードバックを直接運営に届けられます。',
  },
  {
    title: '記事の優先配信',
    body: '同じ街・同じテーマのフィードで、Founders の記事が初週に優先表示されます。',
  },
  {
    title: '都市拡大時の優先指名',
    body: '新都市オープン時、その街の Tier S 候補としてまず声をかけます。',
  },
];

const REVENUE_EXAMPLES = [
  { price: 600, sales: 50, label: '月50本売れた場合' },
  { price: 800, sales: 100, label: '月100本売れた場合' },
  { price: 1200, sales: 200, label: '月200本売れた場合' },
];

export default function FoundersPage() {
  return (
    <main className="bg-background">
      <section className="border-b border-border bg-secondary-50/30">
        <div className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 sm:py-20">
          <Badge variant="accent" className="text-[10px] uppercase tracking-[0.18em]">
            <Sparkles className="mr-1 h-3 w-3" /> Founders 枠
          </Badge>
          <h1
            className="mt-3 text-[36px] font-semibold leading-[1.15] tracking-tight sm:text-[52px]"
          >
            先着50人
            <br className="hidden sm:block" />
            Locore を街と一緒に育てる人へ
          </h1>
          <p className="mt-5 max-w-2xl text-[16px] leading-[1.95] text-foreground/70">
            フォロワー数ではなく、「どれだけその街を歩いたか」「どれだけ自分の言葉で書けるか」を最優先に選びます。
            Phase 1 はパリ。NYC・ロンドンは Phase 2 で募集を開始します。
          </p>

          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-border bg-card px-5 py-3 shadow-xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary-500 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-secondary-500" />
            </span>
            <span className="text-[14px] font-medium">
              現在の残席：<span className="tabular text-secondary-700">23名</span>
              <span className="ml-1 text-foreground/50 tabular">/ 50</span>
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-screen-xl px-4 py-14 sm:px-6">
        <h2
          className="text-[24px] font-semibold tracking-tight"
        >
          Founders に贈る、5つの特典
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PERKS.map((p) => (
            <div
              key={p.title}
              className="rounded-md border border-border bg-card p-5"
            >
              <Check className="h-4 w-4 text-accent-500" />
              <p
                className="mt-2 text-[16px] font-semibold tracking-tight"
              >
                {p.title}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-foreground/70">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-screen-xl px-4 py-14 sm:px-6">
          <h2
            className="text-[24px] font-semibold tracking-tight"
          >
            収益例（あくまで仮計算）
          </h2>
          <p className="mt-2 text-[13px] text-foreground/60">
            Founders 枠は通常 70% に +5% の優遇あり（合計 75% 取り分の想定）。
          </p>
          <div className="mt-6 overflow-x-auto rounded-md border border-border">
            <table className="w-full text-[14px]">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-foreground/70">
                    シナリオ
                  </th>
                  <th className="px-4 py-3 text-right font-semibold tabular">
                    1本価格
                  </th>
                  <th className="px-4 py-3 text-right font-semibold tabular">
                    月販売数
                  </th>
                  <th className="px-4 py-3 text-right font-semibold tabular">
                    Gross
                  </th>
                  <th className="px-4 py-3 text-right font-semibold tabular text-secondary-700">
                    クリエイター取り分（75%）
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {REVENUE_EXAMPLES.map((r) => {
                  const gross = r.price * r.sales;
                  const writer = Math.floor(gross * 0.75);
                  return (
                    <tr key={r.label}>
                      <td className="px-4 py-3 text-foreground/80">{r.label}</td>
                      <td className="px-4 py-3 text-right tabular">
                        ¥{r.price.toLocaleString('ja-JP')}
                      </td>
                      <td className="px-4 py-3 text-right tabular">
                        {r.sales}本
                      </td>
                      <td className="px-4 py-3 text-right tabular">
                        ¥{gross.toLocaleString('ja-JP')}
                      </td>
                      <td className="px-4 py-3 text-right tabular font-semibold text-secondary-700">
                        ¥{writer.toLocaleString('ja-JP')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-foreground/40">
            ※ 決済手数料・税は別。実質的な手取りは記事カテゴリ・市場により変動します。
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-screen-md px-4 py-14 sm:px-6">
        <h2
          className="text-[24px] font-semibold tracking-tight"
        >
          応募する
        </h2>
        <p className="mt-2 mb-6 text-[13px] text-foreground/60">
          フォームを送ると、編集チームから5営業日以内にご連絡します。
        </p>
        <FoundersForm />
      </section>
    </main>
  );
}
