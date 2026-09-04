'use client';

import type { ChangeEvent } from 'react';

/**
 * /experts の都市・料金セレクト（Client）。
 *
 * 国は円形の国カテゴリ（リンク）で選ぶので、このフォームには hidden で持ち回る。
 * 都市・料金は変更で即時送信（GET フォーム）。JS 無効時も「絞り込む」ボタンで送信できる。
 * 国が変わったときは前の国の city が残らないよう、サーバー側で選択肢に無い city を捨てる。
 */

export type SelectOption = { value: string; label: string };

const selCls =
  'appearance-none rounded-xl border border-border-strong bg-card bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2712%27%20height%3D%2712%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27%233f3f46%27%20stroke-width%3D%272.5%27%3E%3Cpath%20d%3D%27m6%209%206%206%206-6%27/%3E%3C/svg%3E")] bg-[length:12px_12px] bg-[position:right_12px_center] bg-no-repeat py-2.5 pl-3.5 pr-8 text-[13px] font-semibold text-foreground outline-none transition focus:border-foreground ';

export function CityPriceSelects({
  country,
  city,
  price,
  cityOptions,
  priceOptions,
}: {
  country: string;
  city: string;
  price: string;
  cityOptions: SelectOption[];
  priceOptions: SelectOption[];
}) {
  const submit = (e: ChangeEvent<HTMLSelectElement>) => {
    e.currentTarget.form?.requestSubmit();
  };
  return (
    <>
      {country ? <input type="hidden" name="country" value={country} /> : null}
      <select
        name="city"
        defaultValue={city}
        onChange={submit}
        aria-label="都市で絞り込む"
        disabled={cityOptions.length === 0}
        className={selCls + (city ? 'border-foreground' : '') + ' disabled:opacity-50'}
      >
        <option value="">{country ? 'すべての都市' : '都市（まず国を選ぶ）'}</option>
        {cityOptions.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <select
        name="price"
        defaultValue={price}
        onChange={submit}
        aria-label="料金で絞り込む"
        className={selCls + (price ? 'border-foreground' : '')}
      >
        <option value="">料金（30分〜）</option>
        {priceOptions.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
    </>
  );
}
