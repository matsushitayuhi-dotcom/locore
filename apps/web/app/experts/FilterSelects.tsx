'use client';

import type { ChangeEvent } from 'react';

/**
 * /experts の国・都市セレクト（Client）。
 *
 * 国→都市の連動: 国を変えると (1) 前の国の都市選択をクリアし (2) GET フォームを
 * 即時送信する。サーバーが選んだ国の都市だけを選択肢に再レンダリングするので、
 * ユーザーは常に「選んだ国の都市」しか選べない。都市変更も即時送信（体感を統一）。
 * JS 無効時も通常の GET フォームとして動く（絞り込むボタンで送信）。
 */

export type SelectOption = { value: string; label: string };

const baseCls =
  'appearance-none rounded-full border bg-card px-4 py-2 pr-8 text-[13.5px] font-bold text-foreground outline-none focus:border-primary-500 ';

export function CountryCitySelects({
  country,
  city,
  countryOptions,
  cityOptions,
}: {
  country: string;
  city: string;
  countryOptions: SelectOption[];
  cityOptions: SelectOption[];
}) {
  const onCountryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const form = e.currentTarget.form;
    if (!form) return;
    // 前の国の都市が残ると AND されて原因不明の 0 件になるためクリアして送信
    const citySelect = form.elements.namedItem('city');
    if (citySelect instanceof HTMLSelectElement) citySelect.value = '';
    form.requestSubmit();
  };

  const onCityChange = (e: ChangeEvent<HTMLSelectElement>) => {
    e.currentTarget.form?.requestSubmit();
  };

  return (
    <>
      {/* 国ファースト: 移住検討者の頭の中は「国」が先、「都市」は後 */}
      <select
        name="country"
        defaultValue={country}
        onChange={onCountryChange}
        aria-label="国で絞り込む"
        className={
          baseCls +
          (country
            ? 'border-primary-500 ring-[3px] ring-primary-50'
            : 'border-border-strong')
        }
      >
        <option value="">🌍 すべての国</option>
        {countryOptions.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <select
        name="city"
        defaultValue={city}
        onChange={onCityChange}
        aria-label="都市で絞り込む"
        className={baseCls + 'border-border-strong'}
      >
        <option value="">すべての都市</option>
        {cityOptions.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
    </>
  );
}
