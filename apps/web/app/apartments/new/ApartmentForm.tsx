'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { createCommunityPost } from '@/lib/community/actions';
import { ContactEmailField } from '@/components/community/ContactEmailField';
import {
  APARTMENT_LISTING_TYPES,
  APARTMENT_LISTING_TYPE_LABEL,
  type ApartmentListingType,
} from '@/lib/community/constants';
import { ContactLeakWarning } from '@/components/community/CommunityDisclaimer';
import { PhotoUploader } from '@/components/community/PhotoUploader';

/**
 * 物件投稿フォーム（貸す側目線）。
 *
 * - 形態 / タイトル / 場所 / 価格 / スペック / 入居可能日 / 本文 / 写真 URL
 * - 差別禁止と詐欺対策アラートを常時表示
 * - 個人連絡先の本文埋め込みはサーバ側でガード（warning も上部に表示）
 */
export function ApartmentForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // --- 状態 ---
  const [listingType, setListingType] = useState<ApartmentListingType>('long_term');
  const [title, setTitle] = useState('');
  const [arrondissement, setArrondissement] = useState('');
  const [nearestStation, setNearestStation] = useState('');
  const [rentMonthly, setRentMonthly] = useState<string>('');
  const [chargesMonthly, setChargesMonthly] = useState<string>('');
  const [deposit, setDeposit] = useState<string>('');
  const [bedrooms, setBedrooms] = useState<string>('1');
  const [sizeSqm, setSizeSqm] = useState<string>('');
  const [furnished, setFurnished] = useState(false);
  const [utilitiesIncluded, setUtilitiesIncluded] = useState(false);
  const [petsOk, setPetsOk] = useState(false);
  const [smokingOk, setSmokingOk] = useState(false);
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableUntil, setAvailableUntil] = useState('');
  const [body, setBody] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [contactEmail, setContactEmail] = useState('');

  const numOrNull = (v: string): number | null => {
    if (!v.trim()) return null;
    const n = Number(v);
    if (!isFinite(n) || n < 0) return null;
    return Math.floor(n);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    const b = body.trim();
    if (t.length < 4) {
      toast.error('タイトルは 4 文字以上にしてください');
      return;
    }
    if (b.length < 20) {
      toast.error('本文は 20 文字以上にしてください');
      return;
    }

    // photos は PhotoUploader が Supabase Storage 経由でアップロード済の URL を持つ
    // URL 妥当性チェック（念のため）
    for (const url of photos) {
      try {
        new URL(url);
      } catch {
        toast.error(`写真 URL が不正です: ${url.slice(0, 40)}…`);
        return;
      }
    }

    const rent = numOrNull(rentMonthly);

    const metadata: Record<string, unknown> = {
      listing_type: listingType,
    };
    if (rent != null) metadata.rent_monthly = rent;
    const charges = numOrNull(chargesMonthly);
    if (charges != null) metadata.charges_monthly = charges;
    const dep = numOrNull(deposit);
    if (dep != null) metadata.deposit = dep;
    const bed = numOrNull(bedrooms);
    if (bed != null) metadata.bedrooms = bed;
    const size = numOrNull(sizeSqm);
    if (size != null) metadata.size_sqm = size;
    if (furnished) metadata.furnished = true;
    if (utilitiesIncluded) metadata.utilities_included = true;
    if (petsOk) metadata.pets_ok = true;
    if (smokingOk) metadata.smoking_ok = true;
    if (availableFrom) metadata.available_from = availableFrom;
    if (availableUntil) metadata.available_until = availableUntil;
    if (arrondissement.trim()) metadata.arrondissement = arrondissement.trim();
    if (nearestStation.trim()) metadata.nearest_station = nearestStation.trim();
    if (notes.trim()) metadata.notes = notes.trim();

    const locationText = [arrondissement.trim(), nearestStation.trim()]
      .filter(Boolean)
      .join(' / ') || null;

    startTransition(async () => {
      const res = await createCommunityPost({
        kind: 'apartment',
        title: t,
        body: b,
        locationText,
        priceAmount: rent ?? null,
        priceCurrency: 'EUR',
        priceUnit: 'monthly',
        photos,
        contactEmail: contactEmail.trim() || undefined,
        metadata,
      });
      if (res.ok && res.data) {
        toast.success('物件を公開しました', {
          description: '応募者からのメッセージは通知されます',
        });
        router.push(res.data.path);
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* 差別禁止 */}
      <aside
        role="note"
        className="rounded-lg border border-rose-500/30 bg-rose-50/70 p-4 text-[12px] leading-relaxed text-rose-900"
      >
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
          <div>
            <p className="font-bold">住宅差別は禁止されています</p>
            <p className="mt-1">
              国籍 / 出身 / 家族構成 / 年齢 / 性別 / 性的指向 / 宗教 / 障害 等を理由とした
              合理性のない入居拒否は、フランス法（Code pénal 225-1, 225-2）で禁止されています。
              在留資格の有無や保証人要件は、合理的範囲でのみ条件設定できます。
            </p>
          </div>
        </div>
      </aside>

      {/* 詐欺対策 */}
      <aside
        role="note"
        className="rounded-lg border border-amber-500/40 bg-amber-50/60 p-4 text-[12px] leading-relaxed text-amber-900"
      >
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <p className="font-bold">詐欺応募の典型パターン</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>「内見前に手付金を振り込みたい」と急かす</li>
              <li>「鍵は宅配で送る」「自分は今フランスにいない」</li>
              <li>賃料が相場より明らかに安い物件を装って前払いを求める（あなたが被害者の場合）</li>
            </ul>
            <p className="mt-1.5">
              不審な応募者を見かけたら
              <a href="/contact" className="underline">運営に通報</a>
              してください。
            </p>
          </div>
        </div>
      </aside>

      {/* 形態 */}
      <fieldset>
        <legend className="mb-2 text-[12px] font-bold text-foreground/75">
          形態 <span className="text-rose-600">*</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {APARTMENT_LISTING_TYPES.map((t) => {
            const on = listingType === t;
            return (
              <label
                key={t}
                className={
                  'cursor-pointer rounded-full px-3 py-1.5 text-[12px] font-semibold transition ' +
                  (on
                    ? 'bg-primary-500 text-neutral-950'
                    : 'border border-border bg-background text-foreground/75 hover:border-foreground/30')
                }
              >
                <input
                  type="radio"
                  name="listing_type"
                  value={t}
                  checked={on}
                  onChange={() => setListingType(t)}
                  className="sr-only"
                />
                {APARTMENT_LISTING_TYPE_LABEL[t]}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* タイトル */}
      <div>
        <label htmlFor="title" className="mb-1 block text-[12px] font-bold text-foreground/75">
          タイトル <span className="text-rose-600">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={140}
          placeholder='例: "11区 République 1LDK 家具付き 即入居可"'
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
        />
        <p className="mt-1 text-right text-[10px] text-foreground/45 tabular">
          {title.length} / 140
        </p>
      </div>

      {/* 場所 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="arr" className="mb-1 block text-[12px] font-bold text-foreground/75">
            区
          </label>
          <input
            id="arr"
            type="text"
            value={arrondissement}
            onChange={(e) => setArrondissement(e.target.value)}
            maxLength={20}
            placeholder="例: 11e"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="station"
            className="mb-1 block text-[12px] font-bold text-foreground/75"
          >
            最寄駅
          </label>
          <input
            id="station"
            type="text"
            value={nearestStation}
            onChange={(e) => setNearestStation(e.target.value)}
            maxLength={80}
            placeholder="例: M° République (徒歩 3 分)"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
          />
        </div>
      </div>

      {/* 価格 */}
      <fieldset>
        <legend className="mb-2 text-[12px] font-bold text-foreground/75">価格（€）</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <NumberField
            id="rent"
            label="家賃 / 月"
            value={rentMonthly}
            onChange={setRentMonthly}
            placeholder="1200"
          />
          <NumberField
            id="charges"
            label="管理費 / 月"
            value={chargesMonthly}
            onChange={setChargesMonthly}
            placeholder="80"
          />
          <NumberField
            id="deposit"
            label="敷金"
            value={deposit}
            onChange={setDeposit}
            placeholder="2400"
          />
        </div>
      </fieldset>

      {/* スペック */}
      <fieldset>
        <legend className="mb-2 text-[12px] font-bold text-foreground/75">スペック</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <label
              htmlFor="bedrooms"
              className="mb-1 block text-[11px] font-medium text-foreground/65"
            >
              寝室数（0 = スタジオ）
            </label>
            <select
              id="bedrooms"
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
            >
              <option value="">指定なし</option>
              <option value="0">0（スタジオ）</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5+</option>
            </select>
          </div>
          <NumberField
            id="size"
            label="広さ (m²)"
            value={sizeSqm}
            onChange={setSizeSqm}
            placeholder="35"
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <CheckboxField label="家具付き" checked={furnished} onChange={setFurnished} />
          <CheckboxField
            label="光熱費込み"
            checked={utilitiesIncluded}
            onChange={setUtilitiesIncluded}
          />
          <CheckboxField label="ペット可" checked={petsOk} onChange={setPetsOk} />
          <CheckboxField label="喫煙可" checked={smokingOk} onChange={setSmokingOk} />
        </div>
      </fieldset>

      {/* 入居可能日 */}
      <fieldset>
        <legend className="mb-2 text-[12px] font-bold text-foreground/75">期間</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="available_from"
              className="mb-1 block text-[11px] font-medium text-foreground/65"
            >
              入居可能日
            </label>
            <input
              id="available_from"
              type="date"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="available_until"
              className="mb-1 block text-[11px] font-medium text-foreground/65"
            >
              期限（短期 / サブレのみ）
            </label>
            <input
              id="available_until"
              type="date"
              value={availableUntil}
              onChange={(e) => setAvailableUntil(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
            />
          </div>
        </div>
      </fieldset>

      {/* 連絡先警告 */}
      <ContactLeakWarning />

      {/* 本文 */}
      <div>
        <label htmlFor="body" className="mb-1 block text-[12px] font-bold text-foreground/75">
          物件紹介文 <span className="text-rose-600">*</span>
          <span className="ml-2 text-[10px] font-normal text-foreground/45">
            Markdown 可
          </span>
        </label>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          maxLength={8000}
          placeholder={
            '物件の雰囲気、周辺環境、内装の特徴、想定する入居者像などを丁寧に。\n\n' +
            '## おすすめポイント\n- 静かな中庭に面した一室\n- 朝の光が美しい\n\n## 設備\n- IH コンロ、食洗機\n- 洗濯機（共用）'
          }
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] leading-relaxed focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
        />
        <p className="mt-1 text-right text-[10px] text-foreground/45 tabular">
          {body.length} / 8000
        </p>
      </div>

      {/* 補足メモ */}
      <div>
        <label htmlFor="notes" className="mb-1 block text-[12px] font-bold text-foreground/75">
          物件メモ（任意 / 短く）
        </label>
        <input
          id="notes"
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          placeholder="例: エレベーターなし、5 階。中庭側"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
        />
      </div>

      {/* 写真 */}
      <div>
        <label className="mb-2 block text-[12px] font-bold text-foreground/75">
          物件の写真
        </label>
        <PhotoUploader photos={photos} onChange={setPhotos} maxPhotos={12} />
      </div>

      <ContactEmailField value={contactEmail} onChange={setContactEmail} />

      {/* 送信 */}
      <div className="flex items-center justify-end gap-2 border-t border-border pt-5">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md px-3 py-2 text-[13px] font-medium text-foreground/65 hover:bg-muted"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-primary-500 px-5 py-2.5 text-[13px] font-bold text-neutral-950 transition hover:bg-primary-300 disabled:opacity-50"
        >
          {isPending ? '公開中…' : '物件を公開する'}
        </button>
      </div>
    </form>
  );
}

// =============================================================================
// 小物
// =============================================================================

function NumberField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-[11px] font-medium text-foreground/65"
      >
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-[14px] tabular focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
      />
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-[12px] font-medium text-foreground/75 transition hover:border-foreground/30">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-border accent-primary-500"
      />
      {label}
    </label>
  );
}
