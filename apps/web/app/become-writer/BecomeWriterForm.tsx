'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@locore/ui';
import { becomeWriter } from './actions';
import { UniversityAutocomplete } from '@/components/settings/UniversityAutocomplete';

/**
 * エキスパート登録フォーム（留学特化・簡素版）。
 * 在学中/卒業の2択 ＋ 大学オートコンプリート1個 ＋ 規約同意のみ。
 * 選択した大学の QID・国コードは hidden で becomeWriter に渡す。
 */
export function BecomeWriterForm() {
  const [universityName, setUniversityName] = useState('');
  const [wikidataId, setWikidataId] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [schoolNameEn, setSchoolNameEn] = useState<string | null>(null);

  return (
    <form
      action={becomeWriter}
      className="space-y-6 rounded-xl bg-card p-6 ring-1 ring-border"
    >
      {/* 在学状況（2択） */}
      <fieldset className="space-y-2">
        <legend className="mb-2 block text-[12px] font-bold uppercase tracking-[0.16em] text-foreground/55">
          いまの状況 <span className="text-danger-500">*</span>
        </legend>
        <div className="grid gap-2">
          <EnrollmentOption
            value="current"
            title="在学中"
            description="いま海外の大学・大学院に通っている。プロフィールに「在学中」と表示されます。"
            defaultChecked
          />
          <EnrollmentOption
            value="alumni"
            title="卒業（アルムナイ）"
            description="海外の大学・大学院を卒業した。卒業年はあとでプロフィールに追加できます。"
          />
        </div>
      </fieldset>

      {/* 大学（オートコンプリート） */}
      <div className="space-y-1.5">
        <label className="block text-[12px] font-bold uppercase tracking-[0.16em] text-foreground/55">
          大学・大学院 <span className="text-danger-500">*</span>
        </label>
        <UniversityAutocomplete
          value={universityName}
          onChange={(name, qid, hit) => {
            setUniversityName(name);
            setWikidataId(qid);
            setCountryCode(hit?.countryCode ?? null);
            setSchoolNameEn(hit?.nameEn ?? null);
          }}
          placeholder="例: ハーバード大学 / Harvard"
        />
        <p className="text-[10.5px] text-foreground/55">
          リストに無い学校は、そのまま入力して構いません。学位・専攻・年はあとで追加できます。
        </p>
        {/* becomeWriter に渡す値。name は state と同期させる */}
        <input type="hidden" name="universityName" value={universityName} />
        <input type="hidden" name="universityWikidataId" value={wikidataId ?? ''} />
        <input type="hidden" name="universityCountryCode" value={countryCode ?? ''} />
        <input type="hidden" name="schoolNameEn" value={schoolNameEn ?? ''} />
      </div>

      <label className="flex items-start gap-2 text-[12px] leading-relaxed text-foreground/75">
        <input
          type="checkbox"
          name="agreeTerms"
          required
          className="mt-0.5 size-4 accent-primary-500"
        />
        <span>
          <Link
            href="/legal#terms"
            className="text-primary-300 underline-offset-4 hover:underline"
          >
            利用規約
          </Link>{' '}
          および エキスパート規約（オリジナル性、ステマ禁止、禁止コンテンツ）に同意します。
        </span>
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <Button asChild variant="outline" size="md">
          <Link href="/">キャンセル</Link>
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={universityName.trim() === ''}
        >
          エキスパートとして登録する
        </Button>
      </div>

      <p className="text-[11px] text-foreground/55">
        ※ 登録した時点ではプロフィールは<b>非公開（下書き）</b>です。
        自己紹介・得意分野・相談メニューを揃えて「公開する」を押すと、
        エキスパート一覧に掲載されます。
      </p>
    </form>
  );
}

function EnrollmentOption({
  value,
  title,
  description,
  defaultChecked,
}: {
  value: string;
  title: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="group flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background px-3 py-3 transition has-[:checked]:border-primary-500 has-[:checked]:bg-primary-500/10">
      <input
        type="radio"
        name="enrollmentStatus"
        value={value}
        required
        defaultChecked={defaultChecked}
        className="mt-1 size-4 accent-primary-500"
      />
      <span className="flex-1">
        <span className="text-[13px] font-bold text-foreground">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-foreground/65">
          {description}
        </span>
      </span>
    </label>
  );
}
