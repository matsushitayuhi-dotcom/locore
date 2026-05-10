'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button, Input } from '@locore/ui';
import { submitContact } from '@/app/contact/actions';

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'bug', label: 'バグ報告' },
  { value: 'feature', label: '機能要望' },
  { value: 'terms', label: '利用規約・コンテンツについて' },
  { value: 'payment', label: '支払い・決済について' },
  {
    value: 'takedown',
    label: '送信防止措置申出（プロバイダ責任制限法）',
  },
  { value: 'other', label: 'その他' },
];

const RIGHT_TYPES: { value: string; label: string }[] = [
  { value: 'copyright', label: '著作権侵害' },
  { value: 'defamation', label: '名誉毀損 / 信用毀損' },
  { value: 'privacy', label: 'プライバシー侵害' },
  { value: 'portrait', label: '肖像権侵害' },
  { value: 'trademark', label: '商標権侵害' },
  { value: 'other_legal', label: 'その他法令違反' },
];

type Props = {
  initialName?: string;
  initialEmail?: string;
  initialCategory?: string;
};

export function ContactForm({
  initialName = '',
  initialEmail = '',
  initialCategory = 'bug',
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [category, setCategory] = useState(initialCategory);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  // プロ責法フォーム用
  const [legalFullName, setLegalFullName] = useState('');
  const [legalAddress, setLegalAddress] = useState('');
  const [legalPhone, setLegalPhone] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [legalRightType, setLegalRightType] = useState('copyright');
  const [pending, startTransition] = useTransition();

  const isTakedown = category === 'takedown';

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await submitContact({
        name: name.trim() || undefined,
        email: email.trim(),
        category,
        subject: subject.trim(),
        body: body.trim(),
        ...(isTakedown
          ? {
              legalFullName: legalFullName.trim(),
              legalAddress: legalAddress.trim(),
              legalPhone: legalPhone.trim() || undefined,
              targetUrl: targetUrl.trim(),
              legalRightType: legalRightType as
                | 'copyright'
                | 'defamation'
                | 'privacy'
                | 'portrait'
                | 'trademark'
                | 'other_legal',
            }
          : {}),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success('お問い合わせを受け付けました');
      router.push(`/contact/thanks?code=${encodeURIComponent(res.receiptCode)}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field label="お名前（任意）">
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="山田 太郎"
          maxLength={50}
        />
      </Field>

      <Field label="メールアドレス" required>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
      </Field>

      <Field label="カテゴリ" required>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="flex h-11 w-full rounded-sm border border-neutral-200 bg-neutral-0 px-3 text-body-md text-neutral-900 focus:border-2 focus:border-primary-700 focus:outline-none focus:px-[11px]"
          required
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>

      {isTakedown ? (
        <div className="space-y-4 rounded-md border border-warning-500 bg-warning-50/50 p-4">
          <p className="text-[12px] font-bold text-warning-700">
            プロバイダ責任制限法に基づく送信防止措置申出
          </p>
          <p className="text-[11px] leading-relaxed text-warning-700/90">
            権利侵害を受けたコンテンツの削除をご依頼の場合、申立人ご本人を特定するための情報が必要です。虚偽の申告は法令により処罰の対象となる場合があります。
          </p>
          <Field label="申立人氏名（実名）" required>
            <Input
              type="text"
              value={legalFullName}
              onChange={(e) => setLegalFullName(e.target.value)}
              placeholder="山田 太郎"
              required={isTakedown}
              maxLength={120}
            />
          </Field>
          <Field label="申立人住所" required>
            <Input
              type="text"
              value={legalAddress}
              onChange={(e) => setLegalAddress(e.target.value)}
              placeholder="東京都渋谷区..."
              required={isTakedown}
              maxLength={300}
            />
          </Field>
          <Field label="申立人電話番号">
            <Input
              type="tel"
              value={legalPhone}
              onChange={(e) => setLegalPhone(e.target.value)}
              placeholder="03-0000-0000"
              maxLength={40}
            />
          </Field>
          <Field label="削除依頼対象 URL" required>
            <Input
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://locore.app/articles/..."
              required={isTakedown}
              maxLength={2048}
            />
          </Field>
          <Field label="侵害された権利の種類" required>
            <select
              value={legalRightType}
              onChange={(e) => setLegalRightType(e.target.value)}
              className="flex h-11 w-full rounded-sm border border-neutral-200 bg-neutral-0 px-3 text-body-md text-neutral-900 focus:border-2 focus:border-primary-700 focus:outline-none focus:px-[11px]"
              required={isTakedown}
            >
              {RIGHT_TYPES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      ) : null}

      <Field label="件名" required>
        <Input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="お問い合わせの件名"
          required
          maxLength={100}
        />
        <CharCount value={subject} max={100} min={1} />
      </Field>

      <Field label="本文" required>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          required
          minLength={10}
          maxLength={4000}
          placeholder={
            isTakedown
              ? '侵害される権利の根拠（著作物の表題・URL、事実関係など）を具体的にご記入ください。'
              : 'お問い合わせ内容を 10 〜 4000 文字でご記入ください。'
          }
          className="flex w-full rounded-sm border border-neutral-200 bg-neutral-0 px-3 py-2 text-body-md text-neutral-900 focus:border-2 focus:border-primary-700 focus:outline-none focus:px-[11px] focus:py-[7px]"
        />
        <CharCount value={body} max={4000} min={10} />
      </Field>

      <div className="rounded-md border border-border bg-card p-4 text-[12px] leading-relaxed text-foreground/70">
        運営チームは <strong className="text-foreground">72 時間以内</strong>{' '}
        に一次返信します（プロバイダ責任制限法 / PRD §10.2）。
        個人情報はお問い合わせ対応の目的でのみ使用します。
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={pending}
      >
        {pending ? '送信中…' : '送信する'}
      </Button>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-medium text-foreground/70">
        {label}
        {required ? <span className="ml-1 text-danger-500">*</span> : null}
      </label>
      {children}
    </div>
  );
}

function CharCount({
  value,
  max,
  min,
}: {
  value: string;
  max: number;
  min?: number;
}) {
  const len = value.length;
  const tooShort = min !== undefined && len > 0 && len < min;
  const overflow = len > max;
  return (
    <p
      className={`mt-1 text-right text-[11px] ${
        overflow || tooShort ? 'text-danger-500' : 'text-foreground/50'
      }`}
    >
      {len} / {max}
      {tooShort ? `（最小 ${min} 文字）` : ''}
    </p>
  );
}
