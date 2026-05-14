'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createBoardPost } from '@/lib/board/actions';
import {
  BOARD_CATEGORIES,
  BOARD_CATEGORY_LABEL,
  BOARD_CATEGORY_HINT,
  BOARD_AUDIENCES,
  BOARD_AUDIENCE_LABEL,
  isAudienceAllowed,
  defaultAudienceForCategory,
  type BoardCategory,
  type BoardAudience,
} from '@/lib/board/constants';

/**
 * 編集チームが掲示板に投稿するフォーム（manual ソース）。
 *
 * 必須: カテゴリ / タイトル / 本文
 * 任意: 対象（イベントのみ選択可、他は駐在員固定）/ 開催日 / 場所
 */
export function BoardPostForm() {
  const router = useRouter();
  const [category, setCategory] = useState<BoardCategory>('event');
  const [audience, setAudience] = useState<BoardAudience>('both');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [isPending, startTransition] = useTransition();

  // カテゴリが event 以外なら audience を resident に強制
  const audienceLocked = category !== 'event';
  const effectiveAudience: BoardAudience = audienceLocked ? 'resident' : audience;

  const onCategoryChange = (next: BoardCategory) => {
    setCategory(next);
    // 切替時に audience を妥当な値に補正
    if (next !== 'event') {
      setAudience('resident');
    } else if (!isAudienceAllowed(next, audience)) {
      setAudience(defaultAudienceForCategory(next));
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    const b = body.trim();
    if (t.length < 2) {
      toast.error('タイトルは 2 文字以上にしてください');
      return;
    }
    if (b.length < 1) {
      toast.error('本文を入力してください');
      return;
    }
    startTransition(async () => {
      const res = await createBoardPost({
        title: t,
        body: b,
        category,
        audience: effectiveAudience,
        eventDate: eventDate || null,
        eventLocation: eventLocation.trim() || null,
      });
      if (res.ok && res.data) {
        toast.success('投稿を公開しました');
        setTitle('');
        setBody('');
        setEventDate('');
        setEventLocation('');
        router.refresh();
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  };

  const placeholders = useMemo(() => placeholderFor(category), [category]);

  return (
    <form onSubmit={submit} className="space-y-3">
      {/* カテゴリ */}
      <div>
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/55">
          カテゴリ <span className="ml-1 text-danger-500">*</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {BOARD_CATEGORIES.map((c) => {
            const on = c === category;
            return (
              <button
                key={c}
                type="button"
                onClick={() => onCategoryChange(c)}
                title={BOARD_CATEGORY_HINT[c]}
                className={
                  'rounded-full px-3 py-1 text-[12px] font-medium transition ' +
                  (on
                    ? 'bg-primary-500 text-neutral-950'
                    : 'bg-primary-500/10 text-primary-300 hover:bg-primary-500/15')
                }
              >
                {BOARD_CATEGORY_LABEL[c]}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[10px] text-foreground/55">
          {BOARD_CATEGORY_HINT[category]}
        </p>
      </div>

      {/* 対象（イベントのみ選択可） */}
      <div>
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/55">
          対象
          {audienceLocked ? (
            <span className="ml-2 text-[10px] font-normal text-foreground/45">
              （このカテゴリは駐在員向けで固定）
            </span>
          ) : null}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {BOARD_AUDIENCES.map((a) => {
            const on = a === effectiveAudience;
            const disabled = audienceLocked && a !== 'resident';
            return (
              <button
                key={a}
                type="button"
                disabled={disabled}
                onClick={() => !audienceLocked && setAudience(a)}
                className={
                  'rounded-full px-3 py-1 text-[12px] font-medium transition ' +
                  (on
                    ? 'bg-primary-500 text-neutral-950'
                    : disabled
                      ? 'bg-foreground/5 text-foreground/30 cursor-not-allowed'
                      : 'bg-primary-500/10 text-primary-300 hover:bg-primary-500/15')
                }
              >
                {BOARD_AUDIENCE_LABEL[a]}
              </button>
            );
          })}
        </div>
      </div>

      {/* タイトル */}
      <div>
        <label
          htmlFor="bp-title"
          className="mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/55"
        >
          タイトル <span className="ml-1 text-danger-500">*</span>
        </label>
        <input
          id="bp-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={140}
          placeholder={placeholders.title}
          className="h-10 w-full rounded-md border border-border bg-card px-3 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
        />
      </div>

      {/* 本文 */}
      <div>
        <label
          htmlFor="bp-body"
          className="mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/55"
        >
          本文（Markdown 可） <span className="ml-1 text-danger-500">*</span>
        </label>
        <textarea
          id="bp-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={8000}
          rows={8}
          placeholder={placeholders.body}
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-[13px] leading-relaxed focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
        />
      </div>

      {/* 開催日 / 場所（イベント・コミュニティ・子育てカテゴリで意味がある） */}
      {(category === 'event' ||
        category === 'community' ||
        category === 'family_edu') && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="bp-date"
              className="mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/55"
            >
              開催日（任意）
            </label>
            <input
              id="bp-date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="bp-loc"
              className="mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/55"
            >
              場所（任意）
            </label>
            <input
              id="bp-loc"
              type="text"
              value={eventLocation}
              onChange={(e) => setEventLocation(e.target.value)}
              maxLength={140}
              placeholder="例: Place de la République"
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary-500 px-4 py-2 text-[13px] font-bold text-neutral-950 transition hover:bg-primary-300 disabled:opacity-50"
        >
          {isPending ? '投稿中…' : '公開する'}
        </button>
      </div>
    </form>
  );
}

/** カテゴリごとに「書き出しのヒント」を変えて、編集者のテンプレを助ける */
function placeholderFor(category: BoardCategory): {
  title: string;
  body: string;
} {
  switch (category) {
    case 'event':
      return {
        title: '例: 今週末、République 広場でクリエイターズマルシェ',
        body: 'いつ・どこで・何が起きるか。\n旅行者と駐在員のどちらにも刺さるなら「両方向け」、現地民の催しなら「駐在員向け」。',
      };
    case 'transit':
      return {
        title: '例: 5/16 木曜、メトロ 14 号線が終日運休',
        body: 'いつ、どの路線・空港・バスが止まる/混むか。\n代替ルートや徒歩での目安時間も添えると親切。',
      };
    case 'admin':
      return {
        title: '例: 確定申告の電子申告は 5/26 まで',
        body: 'いつまでに、どこ（service-public.fr 等）で、何の手続きか。\n注意点があれば追記。',
      };
    case 'food_season':
      return {
        title: '例: 白アスパラ、今週末あたりがピーク',
        body: 'マルシェのどの店、kg いくら、選び方や食べ方も短く。',
      };
    case 'community':
      return {
        title: '例: 在仏邦人クリエイターズマーケット 5/30',
        body: '在仏邦人会、日本酒会、邦人クリエイター展など。\n参加方法・申し込み締切・連絡先。',
      };
    case 'family_edu':
      return {
        title: '例: 春休み中の補習校イベント',
        body: '対象学年、参加費、申し込み方法。',
      };
    case 'health_weather':
      return {
        title: '例: 明日から 3 日間、カニキュル警報（赤）',
        body: '本当にヤバいときだけ投稿。Météo France / AirParif の警報レベルと、現実的な対処（外出時間帯、エアコン、水分）も。',
      };
  }
}
