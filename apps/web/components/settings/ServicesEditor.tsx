'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button, Input } from '@locore/ui';
import { Trash2, Plus, X as XIcon } from 'lucide-react';
import {
  upsertUserService,
  deleteUserService,
} from '@/lib/services/actions';
import { TOPIC_TAGS } from '@/lib/experts/constants';

/**
 * 相談メニュー編集 UI（留学オンライン相談特化）。
 * 1 行 = 1 メニュー。このサイトのメニューはすべてオンライン相談なので
 * consultation は常に true（保存時に 'consultation' タグが付き /experts に掲載）。
 *
 * 対面体験用の旧項目（カバー画像 / カテゴリ / 料金単位 / 問い合わせ方法 /
 * 提供エリア / ギャラリー / 人数 / 特徴 / 含まれるもの / 集合場所 /
 * キャンセルポリシー）は UI から外した。DB 列自体は残るため、既存メニューの
 * それらの値は state 経由でそのまま送り返して温存する（表示しないだけ）。
 */

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
  isActive: boolean;
  /** 相談テーマ（TOPIC_TAGS の value） */
  topics: string[];
  /** 所要時間（分）。相談メニューは 30 / 60 の 2 択。'' = 未設定 */
  durationMinutes: number | '';
  /** 料金（円）。単発は 1 回あたり・継続は月額。'' = 未設定 */
  priceJpy: number | '';
  /** 対応言語 */
  languages: string[];
  /** 'single'=単発 / 'monthly'=継続プラン（priceJpy が月額になる） */
  planKind: 'single' | 'monthly';
  /** 継続プランの月回数（1/2/4）。'' = 未設定 */
  sessionsPerMonth: number | '';

  /** ===== 以下は UI 非表示。既存データ温存のため state に保持して送り返す ===== */
  category: string;
  priceUnit: string;
  contactMethod: 'chat' | 'external_url';
  externalUrl: string;
  cityId: string;
  audience: '' | 'traveler' | 'resident' | 'both';
  coverImageUrl: string;
  galleryImages: string[];
  durationLabel: string;
  minParticipants: number | '';
  maxParticipants: number | '';
  highlights: string;
  inclusions: string;
  meetingPointName: string;
  meetingPointLat: number | '';
  meetingPointLng: number | '';
  cancellationPolicy: string;
  /** 常に true（このサイトのメニューは相談のみ）だが型互換のため保持 */
  consultation: boolean;
};

const empty = (): Service => ({
  title: '',
  description: '',
  isActive: true,
  topics: [],
  durationMinutes: 30,
  priceJpy: '',
  languages: [],
  planKind: 'single',
  sessionsPerMonth: '',
  // 非表示・温存用の初期値
  category: '',
  priceUnit: '',
  contactMethod: 'chat',
  externalUrl: '',
  cityId: '',
  audience: '',
  coverImageUrl: '',
  galleryImages: [],
  durationLabel: '',
  minParticipants: '',
  maxParticipants: '',
  highlights: '',
  inclusions: '',
  meetingPointName: '',
  meetingPointLat: '',
  meetingPointLng: '',
  cancellationPolicy: '',
  consultation: true,
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
  /** 旧 UI で使っていた都市候補。現在は未使用だが呼び出し側互換のため受け取る */
  cityOptions?: CityOption[];
};

export function ServicesEditor({ initial }: Props) {
  const [rows, setRows] = useState<Service[]>(initial);
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState<Service>(empty());
  const [isPending, startTransition] = useTransition();

  const patchRow = (idx: number, patch: Partial<Service>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  /** 料金単位はメニュー種別と所要時間から自動導出（旧 priceUnit セレクタの代替）。 */
  const derivePriceUnit = (r: Service): string => {
    if (r.planKind === 'monthly') return '月額・税込';
    if (r.durationMinutes !== '') return `${r.durationMinutes}分・税込`;
    return '1回・税込';
  };

  /** Service (フォーム state) → Server Action ペイロード。共通化。 */
  const toPayload = (r: Service, position: number) => ({
    id: r.id,
    title: r.title.trim(),
    description: r.description.trim() || undefined,
    priceJpy: r.priceJpy === '' ? null : Number(r.priceJpy),
    priceUnit: derivePriceUnit(r),
    isActive: r.isActive,
    position,
    // このサイトのメニューは常に相談メニュー
    consultation: true,
    consultationTopics: r.topics,
    durationMinutes: r.durationMinutes === '' ? null : Number(r.durationMinutes),
    planKind: r.planKind,
    sessionsPerMonth:
      r.planKind === 'monthly' && r.sessionsPerMonth !== ''
        ? Number(r.sessionsPerMonth)
        : null,
    languages: r.languages,
    // ===== 以下は UI 非表示。既存値をそのまま送り返して温存 =====
    category: r.category || undefined,
    contactMethod: r.contactMethod,
    externalUrl: r.externalUrl.trim() || undefined,
    cityId: r.cityId || null,
    audience: r.audience || null,
    coverImageUrl: r.coverImageUrl.trim() || null,
    galleryImages: r.galleryImages,
    durationLabel:
      r.durationMinutes !== '' ? `${r.durationMinutes}分` : r.durationLabel.trim() || null,
    minParticipants: r.minParticipants === '' ? null : Number(r.minParticipants),
    maxParticipants: r.maxParticipants === '' ? null : Number(r.maxParticipants),
    highlights: linesToArr(r.highlights),
    inclusions: linesToArr(r.inclusions),
    meetingPointName: r.meetingPointName.trim() || null,
    meetingPointLat: r.meetingPointLat === '' ? null : Number(r.meetingPointLat),
    meetingPointLng: r.meetingPointLng === '' ? null : Number(r.meetingPointLng),
    cancellationPolicy: r.cancellationPolicy.trim() || null,
  });

  const validate = (r: Service): string | null => {
    if (!r.title.trim()) return 'メニュー名を入力してください';
    if (r.durationMinutes === '') return '1回の長さ（30分 / 60分）を選んでください';
    if (r.priceJpy === '')
      return r.planKind === 'monthly'
        ? '月額を入力してください'
        : '料金を入力してください';
    if (r.planKind === 'monthly' && r.sessionsPerMonth === '')
      return '継続プランは月の回数を選んでください';
    return null;
  };

  const onSave = (idx: number) => {
    const r = rows[idx];
    if (!r) return;
    const err = validate(r);
    if (err) {
      toast.error(err);
      return;
    }
    startTransition(async () => {
      const res = await upsertUserService(toPayload(r, idx));
      if (res.ok && res.data) {
        toast.success('相談メニューを保存しました');
        patchRow(idx, { id: res.data.id });
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  };

  const onDelete = (idx: number) => {
    const r = rows[idx];
    if (!r) return;
    if (!confirm('この相談メニューを削除しますか？')) return;
    if (!r.id) {
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
    const err = validate(draft);
    if (err) {
      toast.error(err);
      return;
    }
    startTransition(async () => {
      const res = await upsertUserService(toPayload(draft, rows.length));
      if (res.ok && res.data) {
        toast.success('相談メニューを追加しました');
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
        <h3 className="text-[16px] font-semibold tracking-tight">相談メニュー</h3>
        <p className="mt-1 text-[12px] leading-relaxed text-foreground/60">
          相談したい人が予約できるメニューを作成します。
          「単発（30分・60分）」のスポット相談か、「継続プラン（月額）」で
          出願までまるごと伴走するかを選べます。公開したメニューは
          エキスパート一覧に掲載されます。
        </p>
      </header>

      {rows.length === 0 && !drafting ? (
        <p className="text-[12px] text-foreground/50">
          まだ相談メニューがありません。「相談メニューを追加」から作成してください。
        </p>
      ) : null}

      <ul className="space-y-3">
        {rows.map((r, idx) => (
          <li
            key={r.id ?? `draft-${idx}`}
            className="space-y-4 rounded-md bg-card p-4 ring-1 ring-border"
          >
            <MenuBody value={r} onPatch={(patch) => patchRow(idx, patch)} />

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
              <label className="inline-flex items-center gap-2 text-[12px] text-foreground/70">
                <input
                  type="checkbox"
                  checked={r.isActive}
                  onChange={(e) => patchRow(idx, { isActive: e.target.checked })}
                  className="h-4 w-4 accent-primary-700"
                />
                このメニューを公開する
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
        <div className="space-y-4 rounded-md bg-primary-500/10 p-4 ring-1 ring-border">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
            新しい相談メニュー
          </p>
          <MenuBody
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
          相談メニューを追加
        </Button>
      )}
    </section>
  );
}

const fieldLabel = 'mb-1 block text-[11px] font-medium text-foreground/70';
const selectCls =
  'flex h-10 w-full rounded-sm border border-border bg-card px-3 text-body-md focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none';
const textInput =
  'flex w-full rounded-sm border border-border bg-card px-3 py-2 text-body-md focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none';

/**
 * 相談メニュー 1 件の入力群。既存行の編集と新規ドラフトで共有する。
 * 順番: 種別 → メニュー名 → 1回の長さ(＋継続なら月回数) → 料金 → テーマ → 説明 → 言語。
 */
function MenuBody({
  value,
  onPatch,
}: {
  value: Service;
  onPatch: (patch: Partial<Service>) => void;
}) {
  const isMonthly = value.planKind === 'monthly';

  const toggleTopic = (t: string) => {
    onPatch({
      topics: value.topics.includes(t)
        ? value.topics.filter((x) => x !== t)
        : [...value.topics, t],
    });
  };

  return (
    <div className="space-y-4">
      {/* 種別 */}
      <div>
        <label className={fieldLabel}>種別</label>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() =>
              onPatch({ planKind: 'single', sessionsPerMonth: '' })
            }
            aria-pressed={!isMonthly}
            className={
              'rounded-md px-3 py-2.5 text-left text-[12.5px] ring-1 transition ' +
              (!isMonthly
                ? 'bg-primary-500/15 text-primary-300 ring-primary-500/50'
                : 'bg-card text-foreground/70 ring-border hover:text-foreground')
            }
          >
            <span className="block font-semibold">単発セッション</span>
            <span className="mt-0.5 block text-[11px] text-foreground/55">
              30分 / 60分のスポット相談
            </span>
          </button>
          <button
            type="button"
            onClick={() =>
              onPatch({
                planKind: 'monthly',
                sessionsPerMonth:
                  value.sessionsPerMonth === '' ? 2 : value.sessionsPerMonth,
              })
            }
            aria-pressed={isMonthly}
            className={
              'rounded-md px-3 py-2.5 text-left text-[12.5px] ring-1 transition ' +
              (isMonthly
                ? 'bg-primary-500/15 text-primary-300 ring-primary-500/50'
                : 'bg-card text-foreground/70 ring-border hover:text-foreground')
            }
          >
            <span className="block font-semibold">継続プラン（月額）</span>
            <span className="mt-0.5 block text-[11px] text-foreground/55">
              出願までまるごと伴走
            </span>
          </button>
        </div>
      </div>

      {/* メニュー名 */}
      <div>
        <label className={fieldLabel}>メニュー名</label>
        <Input
          value={value.title}
          onChange={(e) => onPatch({ title: e.target.value })}
          placeholder={
            isMonthly
              ? '例: 大学院出願まるごと伴走プラン'
              : '例: 出願エッセイの壁打ち（30分）'
          }
          maxLength={100}
        />
      </div>

      {/* 1回の長さ ＋ (継続なら) 月回数 */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={fieldLabel}>
            {isMonthly ? '1回の長さ（プラン内セッション）' : '1回の長さ'}
          </label>
          <select
            value={
              value.durationMinutes === '' ? '' : String(value.durationMinutes)
            }
            onChange={(e) =>
              onPatch({
                durationMinutes:
                  e.target.value === '' ? '' : Number(e.target.value),
              })
            }
            className={selectCls}
          >
            <option value="">選択してください</option>
            <option value="30">30分</option>
            <option value="60">60分</option>
          </select>
        </div>
        {isMonthly ? (
          <div>
            <label className={fieldLabel}>月の回数</label>
            <select
              value={
                value.sessionsPerMonth === ''
                  ? ''
                  : String(value.sessionsPerMonth)
              }
              onChange={(e) =>
                onPatch({
                  sessionsPerMonth:
                    e.target.value === '' ? '' : Number(e.target.value),
                })
              }
              className={selectCls}
            >
              <option value="">選択してください</option>
              <option value="1">月1回</option>
              <option value="2">月2回</option>
              <option value="4">月4回</option>
            </select>
          </div>
        ) : null}
      </div>

      {/* 料金 */}
      <div>
        <label className={fieldLabel}>
          {isMonthly ? '月額（円・税込）' : '料金（円・税込 / 1回あたり）'}
        </label>
        <div className="relative max-w-[220px]">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-body-md text-foreground/50">
            ¥
          </span>
          <Input
            type="number"
            value={value.priceJpy}
            onChange={(e) =>
              onPatch({
                priceJpy: e.target.value === '' ? '' : Number(e.target.value),
              })
            }
            placeholder={isMonthly ? '24000' : '5000'}
            min={0}
            className="pl-7"
          />
        </div>
        <p className="mt-1 text-[10.5px] text-foreground/50">
          {isMonthly
            ? '目安: 月2回 ¥20,000〜30,000 / 月4回 ¥36,000〜50,000（1回30〜60分）'
            : '目安: 30分 ¥3,000〜5,000 / 60分 ¥6,000〜9,000'}
        </p>
      </div>

      {/* 相談テーマ */}
      <div>
        <label className={fieldLabel}>相談テーマ（複数選択可・一覧の絞り込みに使われます）</label>
        <div className="flex flex-wrap gap-1.5">
          {TOPIC_TAGS.map((t) => {
            const on = value.topics.includes(t.value);
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => toggleTopic(t.value)}
                aria-pressed={on}
                className={
                  'rounded-full px-3 py-1 text-[12px] font-medium ring-1 transition ' +
                  (on
                    ? 'bg-primary-500/20 text-primary-300 ring-primary-500/50'
                    : 'bg-card text-foreground/65 ring-border hover:text-foreground')
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 説明 */}
      <div>
        <label className={fieldLabel}>このメニューで相談できること</label>
        <textarea
          value={value.description}
          onChange={(e) => onPatch({ description: e.target.value })}
          rows={4}
          maxLength={2000}
          placeholder={
            isMonthly
              ? '例: 出願校選びからエッセイ添削、面接練習まで、月2回のオンライン面談で合格まで伴走します。IELTS対策の相談にも対応。'
              : '例: 志望校のエッセイを一緒に読み、構成と論点を30分でフィードバックします。出願直前の最終確認にもどうぞ。'
          }
          className={textInput}
        />
      </div>

      {/* 対応言語 */}
      <LanguagesField
        value={value.languages}
        onChange={(arr) => onPatch({ languages: arr })}
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
          placeholder={value.length === 0 ? '例: 日本語、英語' : ''}
          className="min-w-[100px] flex-1 bg-transparent text-body-md outline-none"
        />
      </div>
    </div>
  );
}
