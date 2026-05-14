'use client';

/**
 * コミュニティ投稿フォーム共通の「メール連絡先（任意）」入力欄。
 *
 * - これを ON にすると、応募者が「メールで問い合わせる」ボタンから
 *   mailto: で直接連絡できるようになる
 * - 必須ではない（Locore メッセージ機能のみで運用してもよい）
 * - 公開されるアドレスなのでスパム流入リスクは UI で警告する
 */

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export function ContactEmailField({ value, onChange }: Props) {
  return (
    <div>
      <label
        htmlFor="contact-email"
        className="block text-[12px] font-bold text-foreground"
      >
        メールでの連絡先（任意）
      </label>
      <p className="mt-0.5 text-[11px] text-foreground/55">
        入力すると、応募者が「メールで問い合わせる」ボタンから直接
        mailto: で連絡できるようになります。空欄なら Locore のメッセージ機能のみで受け付けます。
      </p>
      <input
        id="contact-email"
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="例: hello@example.com"
        maxLength={254}
        className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-[13px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
      />
      <p className="mt-1 text-[10px] text-foreground/45">
        ※ 公開されるアドレスです。スパム対策として使い捨てや別アドレスを推奨します。
      </p>
    </div>
  );
}
