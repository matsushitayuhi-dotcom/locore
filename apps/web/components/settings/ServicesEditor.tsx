'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button, Input } from '@locore/ui';
import { Trash2, Plus } from 'lucide-react';
import {
  upsertUserService,
  deleteUserService,
} from '@/lib/services/actions';

/**
 * 自分のサービス一覧 編集 UI。
 * 1 行 = 1 サービス。インラインで編集 / 削除する。
 */

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'tourism', label: '観光・現地アテンド' },
  { value: 'consulting', label: 'コンサル・相談' },
  { value: 'study_abroad', label: '留学サポート' },
  { value: 'translation', label: '翻訳・通訳' },
  { value: 'attend', label: '同行・代行' },
  { value: 'other', label: 'その他' },
];

const PRICE_UNITS = ['1時間あたり', '1日', '1件', '応相談'] as const;

type Service = {
  id?: string;
  title: string;
  description: string;
  category: string;
  priceJpy: number | '';
  priceUnit: string;
  contactMethod: 'chat' | 'external_url';
  externalUrl: string;
  isActive: boolean;
};

const empty = (): Service => ({
  title: '',
  description: '',
  category: '',
  priceJpy: '',
  priceUnit: '1時間あたり',
  contactMethod: 'chat',
  externalUrl: '',
  isActive: true,
});

type Props = {
  initial: Service[];
};

export function ServicesEditor({ initial }: Props) {
  const [rows, setRows] = useState<Service[]>(initial);
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState<Service>(empty());
  const [isPending, startTransition] = useTransition();

  const update = <K extends keyof Service>(
    idx: number,
    key: K,
    value: Service[K],
  ) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)),
    );
  };

  const onSave = (idx: number) => {
    const r = rows[idx];
    if (!r) return;
    if (!r.title.trim()) {
      toast.error('タイトルを入力してください');
      return;
    }
    startTransition(async () => {
      const res = await upsertUserService({
        id: r.id,
        title: r.title.trim(),
        description: r.description.trim() || undefined,
        category: r.category || undefined,
        priceJpy: r.priceJpy === '' ? null : Number(r.priceJpy),
        priceUnit: r.priceUnit || undefined,
        contactMethod: r.contactMethod,
        externalUrl: r.externalUrl.trim() || undefined,
        isActive: r.isActive,
        position: idx,
      });
      if (res.ok && res.data) {
        toast.success('サービスを保存しました');
        update(idx, 'id', res.data.id);
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  };

  const onDelete = (idx: number) => {
    const r = rows[idx];
    if (!r) return;
    if (!confirm('このサービスを削除しますか？')) return;
    if (!r.id) {
      // ローカル only
      setRows((prev) => prev.filter((_, i) => i !== idx));
      return;
    }
    startTransition(async () => {
      const res = await deleteUserService({ id: r.id! });
      if (res.ok) {
        toast.success('削除しました');
        setRows((prev) => prev.filter((_, i) => i !== idx));
      } else {
        toast.error(res.error);
      }
    });
  };

  const onAddDraft = () => {
    if (!draft.title.trim()) {
      toast.error('タイトルを入力してください');
      return;
    }
    startTransition(async () => {
      const res = await upsertUserService({
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
        category: draft.category || undefined,
        priceJpy: draft.priceJpy === '' ? null : Number(draft.priceJpy),
        priceUnit: draft.priceUnit || undefined,
        contactMethod: draft.contactMethod,
        externalUrl: draft.externalUrl.trim() || undefined,
        isActive: draft.isActive,
        position: rows.length,
      });
      if (res.ok && res.data) {
        toast.success('サービスを追加しました');
        setRows((prev) => [...prev, { ...draft, id: res.data!.id }]);
        setDraft(empty());
        setDrafting(false);
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  };

  return (
    <section className="space-y-4 rounded-md bg-card p-5 ring-1 ring-border sm:p-6">
      <header>
        <h3 className="text-[16px] font-semibold tracking-tight">提供サービス</h3>
        <p className="mt-1 text-[12px] text-foreground/60">
          現地でのコンサル・アテンド・翻訳など、あなたの強みを公開できます。
          公開するとプロフィールにカードが表示され、訪問者から問い合わせを受けられます。
        </p>
      </header>

      {rows.length === 0 && !drafting ? (
        <p className="text-[12px] text-foreground/50">まだサービスはありません。</p>
      ) : null}

      <ul className="space-y-3">
        {rows.map((r, idx) => (
          <li
            key={r.id ?? `draft-${idx}`}
            className="space-y-3 rounded-md bg-card p-4 ring-1 ring-border"
          >
            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-foreground/70">
                  タイトル
                </label>
                <Input
                  value={r.title}
                  onChange={(e) => update(idx, 'title', e.target.value)}
                  placeholder="例: マレ地区の朝の路地裏アテンド"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-foreground/70">
                  カテゴリ
                </label>
                <select
                  value={r.category}
                  onChange={(e) => update(idx, 'category', e.target.value)}
                  className="flex h-10 w-full rounded-sm border border-border bg-card px-3 text-body-md focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
                >
                  <option value="">未設定</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-foreground/70">
                内容
              </label>
              <textarea
                value={r.description}
                onChange={(e) => update(idx, 'description', e.target.value)}
                rows={3}
                maxLength={2000}
                className="flex w-full rounded-sm border border-border bg-card px-3 py-2 text-body-md focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-[140px_140px_1fr]">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-foreground/70">
                  単価（¥）
                </label>
                <Input
                  type="number"
                  value={r.priceJpy}
                  onChange={(e) =>
                    update(
                      idx,
                      'priceJpy',
                      e.target.value === '' ? '' : Number(e.target.value),
                    )
                  }
                  placeholder="5000"
                  min={0}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-foreground/70">
                  単位
                </label>
                <select
                  value={r.priceUnit}
                  onChange={(e) => update(idx, 'priceUnit', e.target.value)}
                  className="flex h-10 w-full rounded-sm border border-border bg-card px-3 text-body-md focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
                >
                  {PRICE_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-foreground/70">
                  問い合わせ方法
                </label>
                <select
                  value={r.contactMethod}
                  onChange={(e) =>
                    update(idx, 'contactMethod', e.target.value as Service['contactMethod'])
                  }
                  className="flex h-10 w-full rounded-sm border border-border bg-card px-3 text-body-md focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
                >
                  <option value="chat">Locore チャット（推奨）</option>
                  <option value="external_url">外部 URL に飛ばす</option>
                </select>
              </div>
            </div>

            {r.contactMethod === 'external_url' ? (
              <div>
                <label className="mb-1 block text-[11px] font-medium text-foreground/70">
                  外部 URL
                </label>
                <Input
                  type="url"
                  value={r.externalUrl}
                  onChange={(e) => update(idx, 'externalUrl', e.target.value)}
                  placeholder="https://…"
                />
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <label className="inline-flex items-center gap-2 text-[12px] text-foreground/70">
                <input
                  type="checkbox"
                  checked={r.isActive}
                  onChange={(e) => update(idx, 'isActive', e.target.checked)}
                  className="h-4 w-4 accent-primary-700"
                />
                公開する
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(idx)}
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4" />
                  削除
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => onSave(idx)}
                  disabled={isPending}
                >
                  保存
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {drafting ? (
        <div className="space-y-3 rounded-md bg-primary-500/10 p-4 ring-1 ring-border">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
            新しいサービス
          </p>
          <Input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="例: マレ地区の朝の路地裏アテンド"
            maxLength={100}
          />
          <textarea
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            rows={3}
            maxLength={2000}
            placeholder="サービスの内容、対象、所要時間など"
            className="flex w-full rounded-sm border border-border bg-card px-3 py-2 text-body-md"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              className="h-10 rounded-sm border border-border bg-card px-3 text-body-md"
            >
              <option value="">カテゴリ</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <Input
              type="number"
              value={draft.priceJpy}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  priceJpy: e.target.value === '' ? '' : Number(e.target.value),
                })
              }
              placeholder="単価 (¥)"
              min={0}
            />
            <select
              value={draft.priceUnit}
              onChange={(e) => setDraft({ ...draft, priceUnit: e.target.value })}
              className="h-10 rounded-sm border border-border bg-card px-3 text-body-md"
            >
              {PRICE_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setDrafting(false);
                setDraft(empty());
              }}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onAddDraft}
              disabled={isPending}
            >
              追加する
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDrafting(true)}
        >
          <Plus className="h-4 w-4" />
          サービスを追加
        </Button>
      )}
    </section>
  );
}
