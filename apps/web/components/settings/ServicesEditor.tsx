'use client';

import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button, Input } from '@locore/ui';
import { Trash2, Plus, ImagePlus, X as XIcon, GripVertical } from 'lucide-react';
import {
  upsertUserService,
  deleteUserService,
} from '@/lib/services/actions';
import { uploadImage } from '@/lib/storage/uploadImage';

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


type CityOption = {
  id: string;
  slug: string;
  nameJa: string;
  countryNameJa: string | null;
};

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
  /** cities.id (uuid)。'' = 指定なし */
  cityId: string;
  /** '' = 指定なし */
  audience: '' | 'traveler' | 'resident' | 'both';
  /** カバー画像 URL ('' = 未設定) */
  coverImageUrl: string;
  /** ===== 0058 体験詳細フィールド ===== */
  /** 追加ギャラリー画像 URL (cover とは別) */
  galleryImages: string[];
  durationLabel: string;
  minParticipants: number | '';
  maxParticipants: number | '';
  /** 言語タグ配列 */
  languages: string[];
  /** 特徴: 編集中は改行区切りテキスト → 保存時に配列化 */
  highlights: string;
  /** 含まれるもの: 改行区切りテキスト → 保存時に配列化 */
  inclusions: string;
  meetingPointName: string;
  meetingPointLat: number | '';
  meetingPointLng: number | '';
  cancellationPolicy: string;
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
  cityId: '',
  audience: '',
  coverImageUrl: '',
  galleryImages: [],
  durationLabel: '',
  minParticipants: '',
  maxParticipants: '',
  languages: [],
  highlights: '',
  inclusions: '',
  meetingPointName: '',
  meetingPointLat: '',
  meetingPointLng: '',
  cancellationPolicy: '',
});

/** 改行区切りテキスト → トリム済み配列 (空行は除去) */
function linesToArr(s: string): string[] {
  return s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

type Props = {
  initial: Service[];
  cityOptions: CityOption[];
};

export function ServicesEditor({ initial, cityOptions }: Props) {
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

  /** Service (フォーム state) → Server Action ペイロード。共通化。 */
  const toPayload = (r: Service, position: number) => ({
    id: r.id,
    title: r.title.trim(),
    description: r.description.trim() || undefined,
    category: r.category || undefined,
    priceJpy: r.priceJpy === '' ? null : Number(r.priceJpy),
    priceUnit: r.priceUnit || undefined,
    contactMethod: r.contactMethod,
    externalUrl: r.externalUrl.trim() || undefined,
    isActive: r.isActive,
    position,
    cityId: r.cityId || null,
    audience: r.audience || null,
    coverImageUrl: r.coverImageUrl.trim() || null,
    // 0058 体験詳細
    galleryImages: r.galleryImages,
    durationLabel: r.durationLabel.trim() || null,
    minParticipants: r.minParticipants === '' ? null : Number(r.minParticipants),
    maxParticipants: r.maxParticipants === '' ? null : Number(r.maxParticipants),
    languages: r.languages,
    highlights: linesToArr(r.highlights),
    inclusions: linesToArr(r.inclusions),
    meetingPointName: r.meetingPointName.trim() || null,
    meetingPointLat: r.meetingPointLat === '' ? null : Number(r.meetingPointLat),
    meetingPointLng: r.meetingPointLng === '' ? null : Number(r.meetingPointLng),
    cancellationPolicy: r.cancellationPolicy.trim() || null,
  });

  const onSave = (idx: number) => {
    const r = rows[idx];
    if (!r) return;
    if (!r.title.trim()) {
      toast.error('タイトルを入力してください');
      return;
    }
    startTransition(async () => {
      const res = await upsertUserService(toPayload(r, idx));
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
      const res = await upsertUserService(toPayload(draft, rows.length));
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
            <CoverImageField
              value={r.coverImageUrl}
              onChange={(url) => update(idx, 'coverImageUrl', url)}
            />
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

            {/* 提供エリア + 対象オーディエンス */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-foreground/70">
                  提供エリア
                </label>
                <select
                  value={r.cityId}
                  onChange={(e) => update(idx, 'cityId', e.target.value)}
                  className="flex h-10 w-full rounded-sm border border-border bg-card px-3 text-body-md focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
                >
                  <option value="">指定なし</option>
                  {cityOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.countryNameJa ? `${c.countryNameJa}・` : ''}
                      {c.nameJa}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DetailFields
              value={r}
              onPatch={(patch) =>
                setRows((prev) =>
                  prev.map((row, i) =>
                    i === idx ? { ...row, ...patch } : row,
                  ),
                )
              }
            />

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
          <CoverImageField
            value={draft.coverImageUrl}
            onChange={(url) => setDraft({ ...draft, coverImageUrl: url })}
          />
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
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={draft.cityId}
              onChange={(e) => setDraft({ ...draft, cityId: e.target.value })}
              className="h-10 rounded-sm border border-border bg-card px-3 text-body-md"
            >
              <option value="">提供エリア（指定なし）</option>
              {cityOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.countryNameJa ? `${c.countryNameJa}・` : ''}
                  {c.nameJa}
                </option>
              ))}
            </select>
            <select
              value={draft.contactMethod}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  contactMethod: e.target.value as Service['contactMethod'],
                })
              }
              className="h-10 rounded-sm border border-border bg-card px-3 text-body-md"
            >
              <option value="chat">Locore チャット（推奨）</option>
              <option value="external_url">外部 URL に飛ばす</option>
            </select>
          </div>
          {draft.contactMethod === 'external_url' ? (
            <Input
              type="url"
              value={draft.externalUrl}
              onChange={(e) =>
                setDraft({ ...draft, externalUrl: e.target.value })
              }
              placeholder="外部 URL https://…"
            />
          ) : null}

          <DetailFields
            value={draft}
            onPatch={(patch) => setDraft((d) => ({ ...d, ...patch }))}
          />

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

/**
 * カバー画像のアップロード UI。
 *
 * - 既存の `uploadImage` (article-images バケット) を再利用してアップロード
 *   → 新しい RLS / バケットを追加せずに済む
 * - 設定済みのときはプレビューと「画像を外す」「差し替える」を出す
 * - 未設定のときはドラッグ&ドロップ + クリック (ペーストは UAT 指摘により非対応)
 */
function CoverImageField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, startUpload] = useTransition();

  const handleFiles = (files: FileList | File[] | null) => {
    if (!files) return;
    const arr = Array.from(files);
    const file = arr[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('画像ファイルを選択してください');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    startUpload(async () => {
      const res = await uploadImage(fd);
      if (res.ok) {
        onChange(res.url);
        toast.success('カバー画像をアップロードしました。「保存」を押して反映してください');
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-foreground/70">
        カバー画像
      </label>
      {value ? (
        <div className="flex flex-wrap items-start gap-3">
          <div className="relative h-24 w-40 overflow-hidden rounded-md ring-1 ring-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? 'アップロード中…' : '差し替える'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange('')}
              disabled={isUploading}
            >
              <XIcon className="h-3.5 w-3.5" />
              画像を外す
            </Button>
          </div>
        </div>
      ) : (
        <div
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border bg-card px-4 py-5 text-center text-[12px] outline-none transition hover:border-primary-300 hover:bg-primary-500/10 focus:border-primary-500"
        >
          <ImagePlus className="h-5 w-5 text-foreground/45" />
          <p className="font-medium text-foreground/75">
            {isUploading
              ? 'アップロード中…'
              : '画像をドラッグ & ドロップ、またはクリック'}
          </p>
          <p className="text-[11px] text-foreground/45">
            JPEG / PNG / WebP / GIF・横長 (3:2 推奨)
          </p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
    </div>
  );
}

const fieldLabel = 'mb-1 block text-[11px] font-medium text-foreground/70';
const textInput =
  'flex w-full rounded-sm border border-border bg-card px-3 py-2 text-body-md focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none';

/**
 * 0058 体験詳細の入力群。詳細ページの見た目を「ここで」登録する。
 * row 編集 / draft 追加の両方で共有。onPatch は部分更新。
 */
function DetailFields({
  value,
  onPatch,
}: {
  value: Service;
  onPatch: (patch: Partial<Service>) => void;
}) {
  return (
    <div className="space-y-3 rounded-md bg-background/60 p-3 ring-1 ring-border">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
        体験詳細（詳細ページに表示）
      </p>

      {/* ギャラリー画像 (複数) */}
      <GalleryField
        value={value.galleryImages}
        onChange={(arr) => onPatch({ galleryImages: arr })}
      />

      {/* 所要時間 / 人数 */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={fieldLabel}>所要時間</label>
          <Input
            value={value.durationLabel}
            onChange={(e) => onPatch({ durationLabel: e.target.value })}
            placeholder="例: 約2時間"
            maxLength={60}
          />
        </div>
        <div>
          <label className={fieldLabel}>最少人数</label>
          <Input
            type="number"
            value={value.minParticipants}
            onChange={(e) =>
              onPatch({
                minParticipants:
                  e.target.value === '' ? '' : Number(e.target.value),
              })
            }
            placeholder="1"
            min={0}
          />
        </div>
        <div>
          <label className={fieldLabel}>最多人数</label>
          <Input
            type="number"
            value={value.maxParticipants}
            onChange={(e) =>
              onPatch({
                maxParticipants:
                  e.target.value === '' ? '' : Number(e.target.value),
              })
            }
            placeholder="4"
            min={0}
          />
        </div>
      </div>

      {/* 言語 (タグ入力) */}
      <LanguagesField
        value={value.languages}
        onChange={(arr) => onPatch({ languages: arr })}
      />

      {/* 特徴 (1行1項目) */}
      <div>
        <label className={fieldLabel}>この体験の特徴（1行に1つ）</label>
        <textarea
          value={value.highlights}
          onChange={(e) => onPatch({ highlights: e.target.value })}
          rows={3}
          placeholder={'地元目線の裏道ルート\n朝のカフェに立ち寄り\n写真スポット案内'}
          className={textInput}
        />
      </div>

      {/* 含まれるもの (1行1項目) */}
      <div>
        <label className={fieldLabel}>含まれるもの（1行に1つ）</label>
        <textarea
          value={value.inclusions}
          onChange={(e) => onPatch({ inclusions: e.target.value })}
          rows={3}
          placeholder={'レンタル自転車\nヘルメット・保険\nカフェ1杯'}
          className={textInput}
        />
      </div>

      {/* 集合場所 */}
      <div>
        <label className={fieldLabel}>集合場所名</label>
        <Input
          value={value.meetingPointName}
          onChange={(e) => onPatch({ meetingPointName: e.target.value })}
          placeholder="例: Place Bellecour の噴水前"
          maxLength={120}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={fieldLabel}>緯度 (lat・任意)</label>
          <Input
            type="number"
            value={value.meetingPointLat}
            onChange={(e) =>
              onPatch({
                meetingPointLat:
                  e.target.value === '' ? '' : Number(e.target.value),
              })
            }
            placeholder="45.7578"
            step="any"
          />
        </div>
        <div>
          <label className={fieldLabel}>経度 (lng・任意)</label>
          <Input
            type="number"
            value={value.meetingPointLng}
            onChange={(e) =>
              onPatch({
                meetingPointLng:
                  e.target.value === '' ? '' : Number(e.target.value),
              })
            }
            placeholder="4.8320"
            step="any"
          />
        </div>
      </div>

      {/* キャンセルポリシー */}
      <div>
        <label className={fieldLabel}>キャンセルポリシー</label>
        <textarea
          value={value.cancellationPolicy}
          onChange={(e) => onPatch({ cancellationPolicy: e.target.value })}
          rows={2}
          maxLength={1000}
          placeholder="例: 開催3日前まで全額返金"
          className={textInput}
        />
      </div>
    </div>
  );
}

/**
 * ギャラリー画像（複数）アップロード UI。
 * cover とは別の追加写真。並べ替え (上/下) と削除に対応。
 * uploadImage を再利用（article-images バケット）。
 */
function GalleryField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, startUpload] = useTransition();

  const handleFiles = (files: FileList | File[] | null) => {
    if (!files) return;
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (arr.length === 0) {
      toast.error('画像ファイルを選択してください');
      return;
    }
    startUpload(async () => {
      const uploaded: string[] = [];
      for (const file of arr) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await uploadImage(fd);
        if (res.ok) uploaded.push(res.url);
        else toast.error(res.error);
      }
      if (uploaded.length > 0) {
        onChange([...value, ...uploaded].slice(0, 20));
        toast.success(
          `${uploaded.length}枚を追加しました。「保存」を押して反映してください`,
        );
      }
    });
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...value];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j]!, next[idx]!];
    onChange(next);
  };
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  return (
    <div>
      <label className={fieldLabel}>
        ギャラリー画像（追加写真・複数可。先頭にカバーが付きます）
      </label>
      {value.length > 0 ? (
        <ul className="mb-2 flex flex-wrap gap-2">
          {value.map((url, idx) => (
            <li
              key={`${url}-${idx}`}
              className="relative h-20 w-28 overflow-hidden rounded-md ring-1 ring-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/45 px-1 py-0.5">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  aria-label="左へ"
                  className="text-white/90 hover:text-white"
                >
                  <GripVertical className="h-3.5 w-3.5 rotate-90" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  aria-label="削除"
                  className="text-white/90 hover:text-white"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  aria-label="右へ"
                  className="text-white/90 hover:text-white"
                >
                  <GripVertical className="h-3.5 w-3.5 -rotate-90" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
      >
        <ImagePlus className="h-4 w-4" />
        {isUploading ? 'アップロード中…' : '写真を追加'}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
    </div>
  );
}

/** 言語タグ入力。Enter / カンマで確定、× で削除。 */
function LanguagesField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (langs: string[]) => void;
}) {
  const [text, setText] = useState('');
  const commit = () => {
    const t = text.trim().replace(/,$/, '').trim();
    if (!t) return;
    if (!value.includes(t)) onChange([...value, t].slice(0, 20));
    setText('');
  };
  return (
    <div>
      <label className={fieldLabel}>対応言語</label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-sm border border-border bg-card px-2 py-1.5">
        {value.map((lang, idx) => (
          <span
            key={`${lang}-${idx}`}
            className="inline-flex items-center gap-1 rounded-full bg-primary-500/15 px-2 py-0.5 text-[12px] font-medium text-primary-300"
          >
            {lang}
            <button
              type="button"
              onClick={() => onChange(value.filter((_, i) => i !== idx))}
              aria-label={`${lang} を削除`}
            >
              <XIcon className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Backspace' && !text && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={commit}
          placeholder={value.length === 0 ? '例: 日本語、フランス語' : ''}
          className="min-w-[100px] flex-1 bg-transparent text-body-md outline-none"
        />
      </div>
    </div>
  );
}
