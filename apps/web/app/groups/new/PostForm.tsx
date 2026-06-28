'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';
import { createCommunityPost } from '@/lib/community/actions';
import { ContactEmailField } from '@/components/community/ContactEmailField';
import { ContactLeakWarning } from '@/components/community/CommunityDisclaimer';
import { PhotoUploader } from '@/components/community/PhotoUploader';
import {
  GROUP_CATEGORIES,
  GROUP_CATEGORY_LABEL,
  GROUP_FREQUENCIES,
  FREQUENCY_LABEL,
  GROUP_LEVELS,
  LEVEL_LABEL,
  GROUP_LOCATION_FORMATS,
  GROUP_LOCATION_FORMAT_LABEL,
  GROUP_LANGUAGES,
  GROUP_LANGUAGE_LABEL,
  type GroupCategory,
  type GroupFrequency,
  type GroupLevel,
  type GroupLocationFormat,
  type GroupLanguage,
  type CommunityAudience,
} from '@/lib/community/constants';

const FIELD_CLS =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none';
const LABEL_CLS = 'block text-[12px] font-bold text-foreground';
const SECTION_TITLE_CLS =
  'text-[11px] font-bold uppercase tracking-[0.14em] text-primary-300';

const formSchema = z.object({
  title: z.string().trim().min(2, 'タイトルは 2 文字以上で入力してください').max(140, 'タイトルは 140 文字以内で入力してください'),
  body: z.string().trim().min(10, '活動内容は 10 文字以上で入力してください').max(8000, '活動内容は 8000 文字以内で入力してください'),
});

/** 改行区切りテキストを配列に。空行は除外、最大件数で切る */
function linesToArray(text: string, max = 10): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, max);
}

/**
 * 当日の流れの簡易パース。1 行 1 ステップ。
 * 「19:00 受付・ドリンクオーダー」のように先頭の時刻＋本文を分離。
 * 時刻が無い行は time 空で title のみ。
 */
function parseSchedule(text: string): { time: string; title: string }[] {
  return linesToArray(text, 12).map((line) => {
    const m = line.match(/^(\d{1,2}[:：]\d{2})\s*[ 　\-–—]*\s*(.*)$/);
    if (m) {
      return { time: m[1]!.replace('：', ':'), title: (m[2] ?? '').slice(0, 120) || m[1]! };
    }
    return { time: '', title: line.slice(0, 120) };
  });
}

export function PostForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // --- 基本 ---
  const [title, setTitle] = useState('');
  const audience: CommunityAudience = 'both';
  const [category, setCategory] = useState<GroupCategory>('hobby');
  const [frequency, setFrequency] = useState<GroupFrequency>('monthly');

  // --- 開催日時・場所 ---
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [eventTimeStart, setEventTimeStart] = useState('');
  const [eventTimeEnd, setEventTimeEnd] = useState('');
  const [locationFormat, setLocationFormat] = useState<GroupLocationFormat>('in_person');
  const [locationText, setLocationText] = useState('');

  // --- 定員・対象・言語 ---
  const [capacity, setCapacity] = useState('');
  const [skillLevel, setSkillLevel] = useState<GroupLevel>('any');
  const [ageRange, setAgeRange] = useState('');
  const [langs, setLangs] = useState<GroupLanguage[]>(['ja']);

  // --- 参加費 ---
  const [feeAmount, setFeeAmount] = useState('');
  const [feeNote, setFeeNote] = useState('');
  const [applicationDeadline, setApplicationDeadline] = useState('');

  // --- 内容 ---
  const [body, setBody] = useState('');
  const [schedule, setSchedule] = useState('');
  const [recommendedFor, setRecommendedFor] = useState('');
  const [whatToBring, setWhatToBring] = useState('');

  // --- 写真・連絡 ---
  const [photos, setPhotos] = useState<string[]>([]);
  const [contactEmail, setContactEmail] = useState('');

  const toggleLang = (l: GroupLanguage) => {
    setLangs((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = formSchema.safeParse({ title, body });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? '入力内容に不備があります');
      return;
    }

    const capNum = capacity ? Number(capacity) : undefined;
    if (capNum !== undefined && (!Number.isFinite(capNum) || capNum < 1 || capNum > 999)) {
      toast.error('定員は 1〜999 の数値で入力してください');
      return;
    }
    const feeNum = feeAmount ? Number(feeAmount) : null;
    if (feeNum !== null && (!Number.isFinite(feeNum) || feeNum < 0)) {
      toast.error('参加費は 0 以上の数値で入力してください');
      return;
    }
    if (eventEndDate && eventStartDate && eventEndDate < eventStartDate) {
      toast.error('終了日は開催日以降にしてください');
      return;
    }

    const scheduleArr = schedule.trim() ? parseSchedule(schedule) : undefined;
    const recommendedArr = recommendedFor.trim() ? linesToArray(recommendedFor) : undefined;
    const bringArr = whatToBring.trim() ? linesToArray(whatToBring) : undefined;

    startTransition(async () => {
      const res = await createCommunityPost({
        kind: 'group',
        title: parsed.data.title,
        body: parsed.data.body,
        locationText: locationText.trim() || null,
        priceAmount: feeNum,
        priceCurrency: 'EUR',
        priceUnit: feeNum !== null && feeNum > 0 ? 'per_session' : null,
        photos,
        contactEmail: contactEmail.trim() || undefined,
        metadata: {
          category,
          meeting_frequency: frequency,
          skill_level: skillLevel,
          age_range: ageRange.trim() || undefined,
          audience,
          // 拡張（空は undefined にして metadata を膨らませない）
          event_start_date: eventStartDate || undefined,
          event_end_date: eventEndDate || undefined,
          event_time_start: eventTimeStart || undefined,
          event_time_end: eventTimeEnd || undefined,
          location_format: locationFormat,
          capacity: capNum,
          languages: langs.length > 0 ? langs : undefined,
          recommended_for: recommendedArr,
          what_to_bring: bringArr,
          schedule: scheduleArr,
          application_deadline: applicationDeadline || undefined,
          fee_note: feeNote.trim() || undefined,
        },
      });
      if (res.ok && res.data) {
        toast.success('集まりを公開しました');
        router.push(res.data.path);
        router.refresh();
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* ============ 基本 ============ */}
      <fieldset className="space-y-5">
        <legend className={SECTION_TITLE_CLS}>基本</legend>

        <div>
          <label htmlFor="title" className={LABEL_CLS}>
            タイトル <span className="text-danger-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={140}
            required
            className={`mt-1.5 ${FIELD_CLS}`}
            placeholder="パリ 日仏ランゲージエクスチェンジ・カフェ会（初心者歓迎・一人参加OK）"
          />
          <p className="mt-0.5 text-right text-[10px] text-foreground/45">{title.length} / 140</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className={LABEL_CLS}>
              カテゴリ <span className="text-danger-500">*</span>
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as GroupCategory)}
              className={`mt-1.5 ${FIELD_CLS}`}
            >
              {GROUP_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {GROUP_CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="frequency" className={LABEL_CLS}>
              開催頻度
            </label>
            <select
              id="frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as GroupFrequency)}
              className={`mt-1.5 ${FIELD_CLS}`}
            >
              {GROUP_FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {FREQUENCY_LABEL[f]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      {/* ============ 開催日時・場所 ============ */}
      <fieldset className="space-y-4 border-t border-border pt-5">
        <legend className={SECTION_TITLE_CLS}>開催日時・場所</legend>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="eventStartDate" className={LABEL_CLS}>
              開催日（次回） <span className="font-normal text-foreground/55">（任意）</span>
            </label>
            <input
              id="eventStartDate"
              type="date"
              value={eventStartDate}
              onChange={(e) => setEventStartDate(e.target.value)}
              className={`mt-1.5 ${FIELD_CLS}`}
            />
          </div>
          <div>
            <label htmlFor="eventEndDate" className={LABEL_CLS}>
              終了日 <span className="font-normal text-foreground/55">（複数日開催のみ）</span>
            </label>
            <input
              id="eventEndDate"
              type="date"
              value={eventEndDate}
              onChange={(e) => setEventEndDate(e.target.value)}
              className={`mt-1.5 ${FIELD_CLS}`}
            />
          </div>
          <div>
            <label htmlFor="eventTimeStart" className={LABEL_CLS}>
              開始時刻 <span className="font-normal text-foreground/55">（任意）</span>
            </label>
            <input
              id="eventTimeStart"
              type="time"
              value={eventTimeStart}
              onChange={(e) => setEventTimeStart(e.target.value)}
              className={`mt-1.5 ${FIELD_CLS}`}
            />
          </div>
          <div>
            <label htmlFor="eventTimeEnd" className={LABEL_CLS}>
              終了時刻 <span className="font-normal text-foreground/55">（任意）</span>
            </label>
            <input
              id="eventTimeEnd"
              type="time"
              value={eventTimeEnd}
              onChange={(e) => setEventTimeEnd(e.target.value)}
              className={`mt-1.5 ${FIELD_CLS}`}
            />
          </div>
        </div>

        <fieldset>
          <legend className={LABEL_CLS}>開催形式</legend>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            {GROUP_LOCATION_FORMATS.map((f) => (
              <label
                key={f}
                className={
                  'flex cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2.5 py-2 text-[12px] font-medium transition ' +
                  (locationFormat === f
                    ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                    : 'border-border bg-card text-foreground/70 hover:border-foreground/30')
                }
              >
                <input
                  type="radio"
                  name="location_format"
                  value={f}
                  checked={locationFormat === f}
                  onChange={() => setLocationFormat(f)}
                  className="sr-only"
                />
                {GROUP_LOCATION_FORMAT_LABEL[f]}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="locationText" className={LABEL_CLS}>
            開催場所 / 区{' '}
            <span className="font-normal text-foreground/55">
              {locationFormat === 'online' ? '（オンラインの場合は任意）' : '（任意）'}
            </span>
          </label>
          <input
            id="locationText"
            type="text"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            maxLength={140}
            className={`mt-1.5 ${FIELD_CLS}`}
            placeholder="Paris 4区 Le Marais のカフェ"
          />
          <p className="mt-0.5 text-[11px] text-foreground/55">
            正確な店名・住所は本文には書かず、参加申込後にメッセージで伝えることもできます。
          </p>
        </div>
      </fieldset>

      {/* ============ 定員・対象・言語 ============ */}
      <fieldset className="space-y-4 border-t border-border pt-5">
        <legend className={SECTION_TITLE_CLS}>定員・対象・言語</legend>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="capacity" className={LABEL_CLS}>
              定員 <span className="font-normal text-foreground/55">（任意）</span>
            </label>
            <input
              id="capacity"
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              min={1}
              max={999}
              className={`mt-1.5 tabular ${FIELD_CLS}`}
              placeholder="12"
            />
            <p className="mt-0.5 text-[11px] text-foreground/55">
              残り枠は実際の参加表明から自動計算されます。
            </p>
          </div>
          <div>
            <label htmlFor="level" className={LABEL_CLS}>
              対象レベル
            </label>
            <select
              id="level"
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value as GroupLevel)}
              className={`mt-1.5 ${FIELD_CLS}`}
            >
              {GROUP_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABEL[l]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="age" className={LABEL_CLS}>
              対象 <span className="font-normal text-foreground/55">（任意）</span>
            </label>
            <input
              id="age"
              type="text"
              value={ageRange}
              onChange={(e) => setAgeRange(e.target.value)}
              maxLength={60}
              className={`mt-1.5 ${FIELD_CLS}`}
              placeholder="一人参加OK / 日仏どちらも"
            />
          </div>
        </div>

        <fieldset>
          <legend className={LABEL_CLS}>開催言語</legend>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            {GROUP_LANGUAGES.map((l) => {
              const on = langs.includes(l);
              return (
                <label
                  key={l}
                  className={
                    'flex cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2.5 py-2 text-[12px] font-medium transition ' +
                    (on
                      ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                      : 'border-border bg-card text-foreground/70 hover:border-foreground/30')
                  }
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleLang(l)}
                    className="sr-only"
                  />
                  {GROUP_LANGUAGE_LABEL[l]}
                </label>
              );
            })}
          </div>
        </fieldset>
      </fieldset>

      {/* ============ 参加費 ============ */}
      <fieldset className="space-y-4 border-t border-border pt-5">
        <legend className={SECTION_TITLE_CLS}>参加費</legend>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="fee" className={LABEL_CLS}>
              参加費（€） <span className="font-normal text-foreground/55">（無料は空欄）</span>
            </label>
            <input
              id="fee"
              type="number"
              value={feeAmount}
              onChange={(e) => setFeeAmount(e.target.value)}
              min={0}
              step={1}
              className={`mt-1.5 w-40 tabular ${FIELD_CLS}`}
              placeholder="0"
            />
          </div>
          <div>
            <label htmlFor="feeNote" className={LABEL_CLS}>
              参加費の補足 <span className="font-normal text-foreground/55">（任意）</span>
            </label>
            <input
              id="feeNote"
              type="text"
              value={feeNote}
              onChange={(e) => setFeeNote(e.target.value)}
              maxLength={120}
              className={`mt-1.5 ${FIELD_CLS}`}
              placeholder="ドリンク代は各自"
            />
          </div>
        </div>

        <div>
          <label htmlFor="applicationDeadline" className={LABEL_CLS}>
            申込締切 <span className="font-normal text-foreground/55">（任意）</span>
          </label>
          <input
            id="applicationDeadline"
            type="date"
            value={applicationDeadline}
            onChange={(e) => setApplicationDeadline(e.target.value)}
            className={`mt-1.5 ${FIELD_CLS}`}
          />
        </div>
      </fieldset>

      {/* ============ 内容 ============ */}
      <fieldset className="space-y-4 border-t border-border pt-5">
        <legend className={SECTION_TITLE_CLS}>内容</legend>

        <ContactLeakWarning />

        <div>
          <label htmlFor="body" className={LABEL_CLS}>
            この集まりについて <span className="text-danger-500">*</span>
          </label>
          <p className="mt-0.5 text-[11px] text-foreground/55">
            活動の流れ、雰囲気、求める仲間像など。Markdown 記法も使えます。
          </p>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={8000}
            rows={10}
            required
            className={`mt-1.5 leading-relaxed ${FIELD_CLS}`}
            placeholder={
              'パリで日本語とフランス語を学び合う、ゆるい交流カフェ会です。\n\n前半は日本語、後半はフランス語、と時間で言語を切り替えながら、少人数のテーブルでおしゃべりします。'
            }
          />
          <p className="mt-0.5 text-right text-[10px] text-foreground/45">{body.length} / 8000</p>
        </div>

        <div>
          <label htmlFor="schedule" className={LABEL_CLS}>
            当日の流れ{' '}
            <span className="font-normal text-foreground/55">（1 行に「時刻 内容」・任意）</span>
          </label>
          <textarea
            id="schedule"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            rows={5}
            className={`mt-1.5 leading-relaxed ${FIELD_CLS}`}
            placeholder={
              '19:00 受付・ドリンクオーダー\n19:15 かんたん自己紹介（日本語）\n19:40 フリートーク（前半 日本語）\n20:15 言語チェンジ（後半 フランス語）\n21:00 解散'
            }
          />
        </div>

        <div>
          <label htmlFor="recommendedFor" className={LABEL_CLS}>
            こんな方におすすめ{' '}
            <span className="font-normal text-foreground/55">（1 行に 1 項目・任意）</span>
          </label>
          <textarea
            id="recommendedFor"
            value={recommendedFor}
            onChange={(e) => setRecommendedFor(e.target.value)}
            rows={4}
            className={`mt-1.5 leading-relaxed ${FIELD_CLS}`}
            placeholder={
              'フランス語を実際に話して練習したい方（レベル不問）\n日本語を学ぶフランス人と交流したい方\n一人で参加してみたい方'
            }
          />
        </div>

        <div>
          <label htmlFor="whatToBring" className={LABEL_CLS}>
            持ち物・注意{' '}
            <span className="font-normal text-foreground/55">（1 行に 1 項目・任意）</span>
          </label>
          <textarea
            id="whatToBring"
            value={whatToBring}
            onChange={(e) => setWhatToBring(e.target.value)}
            rows={3}
            className={`mt-1.5 leading-relaxed ${FIELD_CLS}`}
            placeholder={
              'ドリンク1杯（5〜7€程度）を各自オーダー\n連絡先交換できるもの（SNS等）があれば便利'
            }
          />
        </div>
      </fieldset>

      {/* ============ 写真 ============ */}
      <fieldset className="space-y-2 border-t border-border pt-5">
        <legend className={SECTION_TITLE_CLS}>写真</legend>
        <p className="text-[11px] text-foreground/55">
          会場や過去の様子が伝わる写真を添えると参加が集まりやすくなります。1 枚目が詳細ページの大きな写真になります。（任意・最大 12 枚）
        </p>
        <PhotoUploader photos={photos} onChange={setPhotos} maxPhotos={12} />
      </fieldset>

      {/* ============ 連絡 ============ */}
      <fieldset className="space-y-4 border-t border-border pt-5">
        <legend className={SECTION_TITLE_CLS}>連絡</legend>
        <ContactEmailField value={contactEmail} onChange={setContactEmail} />
      </fieldset>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => router.push('/groups')}
          className="rounded-full px-4 py-2 text-[12px] font-medium text-foreground/65 hover:bg-muted"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-primary-500 px-6 py-2.5 text-[13px] font-bold text-neutral-950 transition hover:bg-primary-300 disabled:opacity-50"
        >
          {isPending ? '公開中…' : '公開する'}
        </button>
      </div>
    </form>
  );
}
