'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button, Input } from '@locore/ui';
import { Upload, X, FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { createUserQualification, deleteUserQualification } from './actions';
import { uploadVerificationDoc } from '@/lib/storage/uploadVerificationDoc';
import type { QualificationMasterRow } from '@/lib/experts/qualifications';

/**
 * 資格・試験スコアの登録フォーム（Client）。0086。
 *
 * マスタから種類を選び、スコア / 級（種類による）と取得年、合格証明（1〜3 枚）を添えて申請。
 * 申請は pending で保存され、運営の目視確認後に公開プロフィールへ「確認済み」で出る。
 */

type UploadedFile = { path: string; name: string; size: number };

const CATEGORY_LABEL: Record<string, string> = {
  language_test: '語学試験',
  admission_test: '出願用テスト',
  professional: '職業資格',
  other: 'その他',
};

export function QualificationForm({ master }: { master: QualificationMasterRow[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [qualificationId, setQualificationId] = useState<string>(master[0]?.id ?? '');
  const [customName, setCustomName] = useState('');
  const [score, setScore] = useState('');
  const [acquiredYear, setAcquiredYear] = useState<string>('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [userNote, setUserNote] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, startSubmit] = useTransition();

  const selected = useMemo(
    () => master.find((m) => m.id === qualificationId) ?? null,
    [master, qualificationId],
  );
  const grouped = useMemo(() => {
    const g = new Map<string, QualificationMasterRow[]>();
    for (const m of master) g.set(m.category, [...(g.get(m.category) ?? []), m]);
    return Array.from(g.entries());
  }, [master]);

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: thisYear + 1 - 1990 + 1 }, (_, i) => thisYear + 1 - i);

  const onFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (picked.length === 0) return;
    const remaining = 3 - files.length;
    if (remaining <= 0) {
      toast.error('証明書は最大 3 枚までです');
      return;
    }
    setIsUploading(true);
    const uploaded: UploadedFile[] = [];
    for (const f of picked.slice(0, remaining)) {
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

  const needsCustom = selected?.code === 'other';
  const canSubmit =
    !!selected &&
    files.length > 0 &&
    (!needsCustom || customName.trim().length > 0) &&
    !isUploading &&
    !isSubmitting;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !selected) return;
    startSubmit(async () => {
      const res = await createUserQualification({
        qualificationId: selected.id,
        customName: needsCustom ? customName.trim() : undefined,
        score: score.trim() || undefined,
        acquiredYear: acquiredYear ? Number(acquiredYear) : undefined,
        proofPaths: files.map((f) => f.path),
        userNote: userNote.trim() || undefined,
      });
      if (res.ok) {
        toast.success('資格の確認申請を受け付けました', {
          description: '運営の確認後、公開プロフィールに「確認済み」で表示されます',
        });
        setFiles([]);
        setScore('');
        setCustomName('');
        setAcquiredYear('');
        setUserNote('');
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  if (master.length === 0) {
    return (
      <p className="text-[12px] text-foreground/55">
        資格マスタが読み込めません（マイグレーション 0086 が未適用の可能性）。
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-card px-4 py-2 text-[13px] font-semibold transition hover:border-foreground"
      >
        <Plus className="h-4 w-4" aria-hidden />
        資格・スコアを追加
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-md border border-border bg-background/40 p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_140px_120px]">
        <div>
          <label className="mb-1 block text-[12px] font-medium text-foreground/70">
            資格・試験 <span className="text-danger-500">*</span>
          </label>
          <select
            value={qualificationId}
            onChange={(e) => setQualificationId(e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-2 text-[13px] focus:border-2 focus:border-primary-500 focus:outline-none"
          >
            {grouped.map(([cat, rows]) => (
              <optgroup key={cat} label={CATEGORY_LABEL[cat] ?? cat}>
                {rows.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nameJa}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-medium text-foreground/70">
            {selected?.hasScore ? 'スコア・級' : 'スコア・級（任意）'}
          </label>
          <Input
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder={selected?.scoreHint ?? '—'}
            maxLength={40}
            disabled={!selected?.hasScore && selected?.code !== 'other'}
          />
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-medium text-foreground/70">取得年</label>
          <select
            value={acquiredYear}
            onChange={(e) => setAcquiredYear(e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-2 text-[13px] tabular-nums focus:border-2 focus:border-primary-500 focus:outline-none"
          >
            <option value="">—</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {needsCustom ? (
        <div>
          <label className="mb-1 block text-[12px] font-medium text-foreground/70">
            資格名 <span className="text-danger-500">*</span>
          </label>
          <Input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="例: 日商簿記 1 級 / Google Data Analytics"
            maxLength={80}
          />
        </div>
      ) : null}

      <div>
        <label className="mb-2 block text-[12px] font-medium text-foreground/70">
          合格証明 <span className="text-danger-500">*</span>
          <span className="ml-1 text-[10px] font-normal text-foreground/50">
            （スコアレポート・合格証・認定証。1〜3 枚、各 15MB まで）
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
              <li key={i} className="flex items-center gap-2 rounded-md bg-card px-3 py-2 ring-1 ring-border">
                <FileText className="h-4 w-4 shrink-0 text-foreground/55" />
                <span className="min-w-0 flex-1 truncate text-[12px]">{f.name}</span>
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
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || files.length >= 3}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-background py-4 text-[13px] font-medium text-foreground/65 transition hover:border-primary-300 hover:text-primary-700 disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> アップロード中…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              {files.length === 0 ? '証明書を選択' : `さらに追加（残り ${3 - files.length} 枚）`}
            </>
          )}
        </button>
      </div>

      <div>
        <label className="mb-1 block text-[12px] font-medium text-foreground/70">補足（任意）</label>
        <Input
          value={userNote}
          onChange={(e) => setUserNote(e.target.value)}
          placeholder="例: スコアレポートは旧姓です"
          maxLength={300}
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full px-4 py-2 text-[13px] font-medium text-foreground/60 hover:text-foreground"
        >
          キャンセル
        </button>
        <Button type="submit" variant="primary" disabled={!canSubmit}>
          {isSubmitting ? '送信中…' : '確認を申請する'}
        </Button>
      </div>
    </form>
  );
}

/** 本人による取り下げボタン（pending / rejected 用） */
export function QualificationDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm('この資格の申請を取り下げますか？')) return;
        start(async () => {
          const res = await deleteUserQualification({ id });
          if (res.ok) {
            toast.success('取り下げました');
            router.refresh();
          } else toast.error(res.error);
        });
      }}
      aria-label="取り下げる"
      className="rounded-sm p-1.5 text-foreground/40 transition hover:bg-muted hover:text-danger-500 disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
