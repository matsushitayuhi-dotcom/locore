'use client';

/**
 * 投稿フォーム共通の「対象者」セレクタ。
 *
 * 旅行者向け (短期滞在) / 駐在員向け (長期滞在) / 両方 の 3 択。
 * すべての new フォームで同じ UI を使うために抽出。
 */

import {
  COMMUNITY_AUDIENCES,
  AUDIENCE_LABEL,
  type CommunityAudience,
} from '@/lib/community/constants';

const AUDIENCE_HELP: Record<CommunityAudience, string> = {
  resident: '長期',
  traveler: '短期',
  both: '両方',
};

export function AudienceField({
  value,
  onChange,
  helpText,
}: {
  value: CommunityAudience;
  onChange: (v: CommunityAudience) => void;
  helpText?: string;
}) {
  return (
    <fieldset>
      <legend className="text-[12px] font-bold text-foreground">
        対象者 <span className="text-danger-500">*</span>
      </legend>
      {helpText ? (
        <p className="mt-0.5 text-[11px] text-foreground/55">{helpText}</p>
      ) : null}
      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        {COMMUNITY_AUDIENCES.map((a) => {
          const on = value === a;
          return (
            <label
              key={a}
              className={
                'flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border px-2.5 py-2 text-[12px] font-medium transition ' +
                (on
                  ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                  : 'border-border bg-card text-foreground/70 hover:border-foreground/30')
              }
            >
              <input
                type="radio"
                name="audience"
                value={a}
                checked={on}
                onChange={() => onChange(a)}
                className="sr-only"
              />
              <span>{AUDIENCE_LABEL[a]}</span>
              <span className="text-[9px] font-normal text-foreground/45">
                {a === 'resident'
                  ? '長期滞在'
                  : a === 'traveler'
                    ? '短期滞在'
                    : AUDIENCE_HELP[a]}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
