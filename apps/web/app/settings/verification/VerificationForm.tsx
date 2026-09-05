'use client';

import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button, Input } from '@locore/ui';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { createResidencyVerification } from './actions';
import { uploadVerificationDoc } from '@/lib/storage/uploadVerificationDoc';

/**
 * 在籍確認の申請フォーム（Client Component）。留学特化。
 *
 * 確認したい事実は「その学校に在学している / 卒業した」こと。
 * 必須:
 *   - 書類タイプ（入学証明書・在籍証明書 / 学生証 / 卒業証書・学位記 / その他）+ ファイル 1〜3 枚
 *   - 学校名（プロフィールの学歴から選べる。書類と同じ表記）
 *   - 氏名（日本語 or 英語。書類と同じ表記）
 * 任意: 補足メモ
 *
 * 旧「本人確認」の住所・電話などは聞かない（在籍の確認に不要）。
 */

export const ENROLLMENT_DOCS = [
  {
    value: 'enrollment_certificate',
    label: '入学証明書・在籍証明書',
    hint: '大学が発行する Enrollment / Admission Letter、在籍証明書。氏名・学校名・年度が読めるもの',
  },
  {
    value: 'student_id',
    label: '学生証',
    hint: '有効期限内のもの。氏名・学校名・写真面。学籍番号はマスクして構いません',
  },
  {
    value: 'diploma',
    label: '卒業証書・学位記（アルムナイ）',
    hint: '卒業した方向け。Diploma / Degree Certificate。氏名・学校名・学位・年月が読めるもの',
  },
  {
    value: 'other',
    label: 'その他',
    hint: '成績証明書・合格通知など。補足欄に書類名を明記してください',
  },
] as const;

type DocType = (typeof ENROLLMENT_DOCS)[number]['value'];

type UploadedFile = { path: string; name: string; size: number };

export function VerificationForm({
  schools = [],
  defaultAlumni = false,
}: {
  /** プロフィールの学歴（学校名）。学校名の候補に出す */
  schools?: string[];
  /** 学歴が「卒業」のみのときは卒業証書を初期選択に */
  defaultAlumni?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<DocType>(
    defaultAlumni ? 'diploma' : 'enrollment_certificate',
  );
  const [schoolName, setSchoolName] = useState<string>(schools[0] ?? '');
  const [legalNameNative, setLegalNameNative] = useState('');
  const [legalNameRoman, setLegalNameRoman] = useState('');
  const [userNote, setUserNote] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, startSubmit] = useTransition();

  const onPickFiles = () => fileInputRef.current?.click();

  const onFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (picked.length === 0) return;
    const remaining = 3 - files.length;
    if (remaining <= 0) {
      toast.error('書類は最大 3 枚までです');
      return;
    }
    const toUpload = picked.slice(0, remaining);
    if (picked.length > remaining) toast.warning(`最初の ${remaining} 枚だけアップロードします`);
    setIsUploading(true);
    const uploaded: UploadedFile[] = [];
    for (const f of toUpload) {
      const fd = new FormData();
      fd.set('file', f);
      try {
        const res = await uploadVerificationDoc(fd);
        if (res.ok) uploaded.push({ path: res.path, name: f.name, size: f.size });
        else toast.error(res.error);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'アップロード失敗');
      }
    }
    setFiles((prev) => [...prev, ...uploaded]);
    setIsUploading(false);
  };

  const hasName = legalNameNative.trim().length > 0 || legalNameRoman.trim().length > 0;
  const canSubmit =
    !isSubmitting && !isUploading && files.length > 0 && hasName && schoolName.trim() && agreed;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    startSubmit(async () => {
      try {
        const res = await createResidencyVerification({
          documentType: docType,
          documentPaths: files.map((f) => f.path),
          schoolName: schoolName.trim(),
          legalNameNative: legalNameNative.trim() || undefined,
          legalNameRoman: legalNameRoman.trim() || undefined,
          userNote: userNote.trim() || undefined,
        });
        if (res.ok) {
          toast.success('在籍確認の申請を受け付けました', {
            description: '3〜5 営業日以内に運営から結果をお知らせします',
          });
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

  const hint = ENROLLMENT_DOCS.find((d) => d.value === docType)?.hint;

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-md bg-card p-5 ring-1 ring-border sm:p-6">
      {/* 1. 書類タイプ（カード選択） */}
      <div>
        <p className="mb-2 text-[12px] font-medium text-foreground/70">
          提出する書類 <span className="text-danger-500">*</span>
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {ENROLLMENT_DOCS.map((d) => {
            const on = docType === d.value;
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => setDocType(d.value)}
                aria-pressed={on}
                className={
                  'rounded-md border px-3.5 py-2.5 text-left text-[13px] transition ' +
                  (on
                    ? 'border-neutral-900 bg-neutral-900 font-bold text-white'
                    : 'border-border bg-background text-foreground/80 hover:border-foreground')
                }
              >
                {d.label}
              </button>
            );
          })}
        </div>
        {hint ? <p className="mt-2 text-[11.5px] text-foreground/55">{hint}</p> : null}
      </div>

      {/* 2. 学校名 */}
      <div>
        <label className="mb-1 block text-[12px] font-medium text-foreground/70">
          学校名 <span className="text-danger-500">*</span>
        </label>
        <Input
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          placeholder="例: Harvard Business School / ハーバード・ビジネス・スクール"
          maxLength={160}
          list={schools.length > 0 ? 'enrollment-school-options' : undefined}
        />
        {schools.length > 0 ? (
          <datalist id="enrollment-school-options">
            {schools.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        ) : null}
        <p className="mt-1 text-[11px] text-foreground/55">
          書類に書かれている表記で。プロフィールの学歴に登録した学校が候補に出ます。
        </p>
      </div>

      {/* 3. 氏名 */}
      <div>
        <p className="mb-2 text-[12px] font-medium text-foreground/70">
          氏名 <span className="text-danger-500">*</span>
          <span className="ml-1 text-[10px] font-normal text-foreground/50">
            （書類と同じ表記。日本語か英語のどちらか）
          </span>
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            value={legalNameNative}
            onChange={(e) => setLegalNameNative(e.target.value)}
            placeholder="高村 里奈"
            maxLength={140}
            aria-label="氏名 (日本語)"
          />
          <Input
            value={legalNameRoman}
            onChange={(e) => setLegalNameRoman(e.target.value)}
            placeholder="TAKAMURA Rina"
            maxLength={140}
            aria-label="氏名 (英語)"
          />
        </div>
      </div>

      {/* 4. ファイル */}
      <div>
        <label className="mb-2 block text-[12px] font-medium text-foreground/70">
          書類ファイル <span className="text-danger-500">*</span>
          <span className="ml-1 text-[10px] font-normal text-foreground/50">
            （1〜3 枚、各 15MB まで、JPEG/PNG/HEIC/PDF）
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
                <span className="min-w-0 flex-1 truncate text-[12px]">{f.name}</span>
                <span className="shrink-0 text-[10px] tabular-nums text-foreground/55">
                  {(f.size / 1024).toFixed(0)} KB
                </span>
                <button
                  type="button"
                  aria-label="削除"
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}
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
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-background py-5 text-[13px] font-medium text-foreground/65 transition hover:border-primary-300 hover:bg-primary-500/5 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
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
              {files.length === 0 ? '書類を選択' : `さらに追加（残り ${3 - files.length} 枚）`}
            </>
          )}
        </button>
        <p className="mt-1.5 text-[11px] text-foreground/50">
          氏名・学校名・年度が読めれば OK。学籍番号・住所など不要な部分は黒塗りで構いません。
        </p>
      </div>

      {/* 5. 補足 */}
      <div>
        <label className="mb-1 block text-[12px] font-medium text-foreground/70">補足（任意）</label>
        <textarea
          value={userNote}
          onChange={(e) => setUserNote(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="例: 学生証は現在の姓、学位記は旧姓です"
          className="flex w-full rounded-sm border border-border bg-card px-3 py-2 text-[13px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
        />
      </div>

      {/* 6. 同意 */}
      <label className="flex cursor-pointer items-start gap-3 rounded-md bg-muted p-3 ring-1 ring-border">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4"
        />
        <span className="text-[12px] leading-relaxed text-foreground/75">
          書類は本人のものであること、運営の目視確認後 <strong>30 日以内に物理削除</strong>
          されること（確認結果のフラグだけが残る）に同意します。
        </span>
      </label>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={!canSubmit}>
          {isSubmitting ? '送信中…' : '在籍確認を申請する'}
        </Button>
      </div>
    </form>
  );
}
