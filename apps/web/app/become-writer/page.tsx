import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/require-user';
import { BecomeWriterForm } from './BecomeWriterForm';

export const metadata = {
  title: 'エキスパートとして参加',
};

export const dynamic = 'force-dynamic';

/**
 * /become-writer — エキスパート登録（留学特化・0084 で簡素化）。
 * 在学中/卒業の2択 ＋ 大学オートコンプリート ＋ 規約同意のみ。
 * 登録時に education[0] が自動作成され、/settings（公開ステータス）へ進む。
 */
export default async function BecomeWriterPage() {
  const user = await requireUser('/become-writer');

  if (user.role === 'resident_writer' || user.role === 'editor') {
    // 既にエキスパート → 公開ステータスへ
    redirect('/settings');
  }

  return (
    <main className="bg-background">
      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/50">
            Become an expert
          </p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight sm:text-[36px]">
            海外の大学で学ぶあなた・学んだあなたへ
          </h1>
          <p className="mt-3 text-[14px] leading-[1.9] text-foreground/70">
            出願で悩んだあの時間が、後輩の30分になります。エッセイ・出願・現地生活の
            経験を、30分からのオンライン相談として提供できます。
            大学と現在の状況だけで登録できます（1分）。
          </p>
        </header>

        {/* 登録後の流れ */}
        <div className="mb-8 rounded-xl bg-card p-5 ring-1 ring-border">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
            登録後の流れ
          </p>
          <ol className="mt-2 space-y-1.5 text-[13px] text-foreground/70">
            <li>
              <b className="text-foreground/85">1. プロフィールを整える</b> —
              自己紹介・得意分野・相談メニュー（30分/60分）を登録します。
              チェックリストで進み具合が見えます。
            </li>
            <li>
              <b className="text-foreground/85">2. 公開する</b> —
              最低要件が揃うと「公開する」ボタンが押せるようになり、
              エキスパート一覧（/experts）に掲載されます。それまでは下書き（非公開）です。
            </li>
            <li>
              <b className="text-foreground/85">3. 相談を受ける</b> —
              相談リクエストは Locore 内のチャットに届きます。
              居住認証（在学・勤務の書類確認）を申請すると認証バッジが付き、信頼が上がります。
            </li>
          </ol>
        </div>

        <BecomeWriterForm />
      </section>
    </main>
  );
}
