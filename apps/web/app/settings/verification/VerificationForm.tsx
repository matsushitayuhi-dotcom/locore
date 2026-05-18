'use client';

import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button, Input } from '@locore/ui';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { createResidencyVerification } from './actions';
import { uploadVerificationDoc } from '@/lib/storage/uploadVerificationDoc';
import { RESIDENCE_COUNTRIES } from '@/lib/resident/masters';

/**
 * 本人確認の申請フォーム (Client Component)。
 *
 * 「居住確認」から「本人確認」へ方針転換。日本ユーザーも海外駐在者も
 * 同じフローで本人確認を行い、信頼バッジを得る。
 *
 * 必須:
 *   - 氏名 (日本語 or 英語、最低どちらか)
 *   - 書類タイプ + ファイル 1〜3 枚
 *
 * 任意:
 *   - 居住国 / 居住都市 (海外駐在者がアピールしたい場合用)
 *   - 住所 / 郵便番号 / 電話 (書類との照合補助。空欄でも OK)
 *
 * 送信時:
 *   1. すべてのファイルが path として揃っているか確認
 *   2. createResidencyVerification を呼ぶ
 *   3. 成功 → トースト + ページ自動 revalidate
 */

const DOC_TYPES = [
  { value: 'passport', label: 'パスポート', hint: '顔写真ページ。日本・海外どちらも可' },
  {
    value: 'my_number_card',
    label: 'マイナンバーカード (顔写真面)',
    hint: '番号面は提出不可。顔写真側のみ',
  },
  { value: 'driver_license', label: '運転免許証', hint: '顔写真付き。日本・海外いずれも可' },
  {
    value: 'residence_card',
    label: '在留カード / 永住者証明書',
    hint: '日本在住の外国籍の方、または海外の Titre de séjour 等',
  },
  { value: 'visa', label: 'VISA (滞在許可)', hint: '駐在者の方向け' },
  {
    value: 'utility_bill',
    label: '公的支払い情報 (光熱費・水道など)',
    hint: '駐在者の現地居住を補強したい場合',
  },
  { value: 'tax_certificate', label: '住民税・所得税の証明', hint: '住所証明として' },
  { value: 'other', label: 'その他', hint: '賃貸契約書など。補足欄で書類名を明記してください' },
] as const;

type DocType = (typeof DOC_TYPES)[number]['value'];

type UploadedFile = {
  path: string;
  name: string;
  size: number;
};

export function VerificationForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<DocType>('passport');
  const [country, setCountry] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [legalNameRoman, setLegalNameRoman] = useState<string>('');
  const [legalNameNative, setLegalNameNative] = useState<string>('');
  const [addressLine, setAddressLine] = useState<string>('');
  const [postalCode, setPostalCode] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [userNote, setUserNote] = useState<string>('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, startSubmit] = useTransition();

  const onPickFiles = () => fileInputRef.current?.click();

  const onFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = ''; // 同じファイル再選択可
    if (picked.length === 0) return;

    const remaining = 3 - files.length;
    if (remaining <= 0) {
      toast.error('書類は最大 3 枚までです');
      return;
    }
    const toUpload = picked.slice(0, remaining);
    if (picked.length > remaining) {
      toast.warning(`最初の ${remaining} 枚だけアップロードします`);
    }

    setIsUploading(true);
    const uploaded: UploadedFile[] = [];
    for (const f of toUpload) {
      const fd = new FormData();
      fd.set('file', f);
      try {
        const res = await uploadVerificationDoc(fd);
        if (res.ok) {
          uploaded.push({ path: res.path, name: f.name, size: f.size });
        } else {
          toast.error(res.error);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'アップロード失敗');
      }
    }
    setFiles((prev) => [...prev, ...uploaded]);
    setIsUploading(false);
  };

  const removeFile = (idx: number) => {
    setFiles(files.filter((_, i) => i !== idx));
  };

  // 氏名は英語 or 日本語のどちらか必須
  const hasName = legalNameRoman.trim().length > 0 || legalNameNative.trim().length > 0;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      toast.error('書類を 1 枚以上アップロードしてください');
      return;
    }
    if (!hasName) {
      toast.error('氏名 (英語または日本語) を入力してください');
      return;
    }
    if (!agreed) {
      toast.error('確認事項にチェックを入れてください');
      return;
    }
    startSubmit(async () => {
      try {
        const res = await createResidencyVerification({
          documentType: docType,
          documentPaths: files.map((f) => f.path),
          country: country.trim() || undefined,
          city: city.trim() || undefined,
          legalNameRoman: legalNameRoman.trim() || undefined,
          legalNameNative: legalNameNative.trim() || undefined,
          addressLine: addressLine.trim() || undefined,
          postalCode: postalCode.trim() || undefined,
          phoneNumber: phoneNumber.trim() || undefined,
          userNote: userNote.trim() || undefined,
        });
        if (res.ok) {
          toast.success('本人確認の申請を受け付けました', {
            description: '3〜5 営業日以内に編集チームから結果をお知らせします',
          });
          // form リセット (ステータスカードは Server Component の revalidate で出る)
          setFiles([]);
          setUserNote('');
          setAgreed(false);
        } else {
          toast.error(res.error);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '送信失敗');
      }
    });
  };

  const selectedDocHint = DOC_TYPES.find((t) => t.value === docType)?.hint;

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-md bg-card p-5 ring-1 ring-border sm:p-6"
    >
      {/* 氏名 (どちらか必須) */}
      <div>
        <p className="mb-2 text-[12px] font-medium text-foreground/70">
          氏名 <span className="text-danger-500">*</span>
          <span className="ml-1 text-[10px] font-normal text-foreground/50">
            (英語または日本語、どちらか一方は必須)
          </span>
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Input
              value={legalNameNative}
              onChange={(e) => setLegalNameNative(e.target.value)}
              placeholder="田中 みゆき"
              maxLength={140}
              aria-label="氏名 (日本語)"
            />
            <p className="mt-1 text-[11px] text-foreground/55">
              漢字・かな表記。書類と同じ表記でお願いします
            </p>
          </div>
          <div>
            <Input
              value={legalNameRoman}
              onChange={(e) => setLegalNameRoman(e.target.value)}
              placeholder="TANAKA Miyuki"
              maxLength={140}
              aria-label="氏名 (英語)"
            />
            <p className="mt-1 text-[11px] text-foreground/55">
              パスポート・在留カードの英字表記
            </p>
          </div>
        </div>
      </div>

      {/* 書類タイプ */}
      <div>
        <label className="mb-1 block text-[12px] font-medium text-foreground/70">
          書類タイプ <span className="text-danger-500">*</span>
        </label>
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value as DocType)}
          className="h-10 w-full rounded-md border border-border bg-background px-2 text-[13px]"
        >
          {DOC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {selectedDocHint ? (
          <p className="mt-1 text-[11px] text-foreground/55">{selectedDocHint}</p>
        ) : null}
        <p className="mt-1 text-[11px] text-foreground/50">
          氏名と顔写真が読める書類をご提出ください。マイナンバー番号面・口座番号・
          給与額など、本人確認に不要な部分は黒塗りでマスクして頂いて構いません。
        </p>
      </div>

      {/* ファイルアップロード */}
      <div>
        <label className="mb-2 block text-[12px] font-medium text-foreground/70">
          書類ファイル <span className="text-danger-500">*</span>
          <span className="ml-1 text-[10px] font-normal text-foreground/50">
            (1〜3 枚、各 15MB まで、JPEG/PNG/HEIC/PDF)
          </span>
        </label>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif,application/pdf,.pdf"
          hidden
          onChange={onFilesChange}
        />
        {files.length > 0 ? (
          <ul className="mb-2 space-y-1.5">
            {files.map((f, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-md bg-background/40 px-3 py-2 ring-1 ring-border"
              >
                <FileText className="h-4 w-4 shrink-0 text-foreground/55" />
                <span className="min-w-0 flex-1 truncate text-[12px]">
                  {f.name}
                </span>
                <span className="shrink-0 text-[10px] tabular text-foreground/55">
                  {(f.size / 1024).toFixed(0)} KB
                </span>
                <button
                  type="button"
                  aria-label="削除"
                  onClick={() => removeFile(i)}
                  className="rounded-sm p-1 text-foreground/40 hover:bg-muted hover:text-danger-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <button
          type="button"
          onClick={onPickFiles}
          disabled={isUploading || files.length >= 3}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-background py-5 text-[13px] font-medium text-foreground/65 transition hover:border-primary-300 hover:bg-primary-500/5 hover:text-primary-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              アップロード中…
            </>
          ) : files.length >= 3 ? (
            <>最大 3 枚です</>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              {files.length === 0
                ? '書類を選択'
                : `さらに追加 (残り ${3 - files.length} 枚)`}
            </>
          )}
        </button>
      </div>

      {/* 任意項目セクション */}
      <details className="rounded-md border border-dashed border-border bg-background/40 p-4">
        <summary className="cursor-pointer text-[12px] font-medium text-foreground/70">
          任意項目 (居住地・住所・電話)
          <span className="ml-2 text-[10px] text-foreground/50">
            駐在者の方や、現地拠点をプロフィールに表示したい方は記入を推奨
          </span>
        </summary>
        <div className="mt-4 space-y-4">
          {/* 居住地 */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-foreground/65">
                居住国 (任意)
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-2 text-[13px] focus:border-2 focus:border-primary-500 focus:outline-none"
              >
                <option value="">(指定なし)</option>
                {RESIDENCE_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-foreground/65">
                居住都市 (任意)
              </label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="例: 東京 / パリ / シンガポール"
                maxLength={80}
              />
            </div>
          </div>

          {/* 住所 */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-foreground/65">
              住所 (任意)
            </label>
            <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
              <Input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="郵便番号"
                maxLength={20}
              />
              <Input
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="番地・通り名・市区町村"
                maxLength={300}
              />
            </div>
          </div>

          {/* 電話 */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-foreground/65">
              電話番号 (任意)
            </label>
            <Input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+81 90 1234 5678 / +33 6 12 34 56 78"
              maxLength={30}
            />
            <p className="mt-1 text-[10px] text-foreground/50">
              書類との照合補助。記入は任意です
            </p>
          </div>
        </div>
      </details>

      {/* 補足メモ */}
      <div>
        <label className="mb-1 block text-[12px] font-medium text-foreground/70">
          補足 (任意)
        </label>
        <textarea
          value={userNote}
          onChange={(e) => setUserNote(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="例: 書類の氏名表記が旧姓のため、別書類で照合をお願いします"
          className="flex w-full rounded-sm border border-border bg-card px-3 py-2 text-[13px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
        />
        <p className="mt-1 text-[11px] text-foreground/50">
          {userNote.length} / 500
        </p>
      </div>

      {/* 同意 */}
      <label className="flex cursor-pointer items-start gap-3 rounded-md bg-primary-500/5 p-3 ring-1 ring-border">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4"
        />
        <span className="text-[12px] leading-relaxed text-foreground/75">
          書類は本人提出であることと、編集チームの目視レビュー後{' '}
          <strong>30 日以内に物理削除</strong> されることに同意します
          (確認結果のフラグだけが残ります)。
        </span>
      </label>

      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          disabled={
            isSubmitting ||
            isUploading ||
            files.length === 0 ||
            !agreed ||
            !hasName
          }
        >
          {isSubmitting ? '送信中…' : '申請を送信する'}
        </Button>
      </div>
    </form>
  );
}
