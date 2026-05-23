import Link from 'next/link';
import type { TagWithCount } from '@/lib/services/list';
import {
  buildServicesHref,
  toggleTagHref,
  type ServiceFiltersState,
} from './ServiceFilters';

/**
 * /services タグフィルタ chips。
 *
 * - 上位 (件数の多い順) は最初から表示
 * - それ以外は <details> で「+他のタグ (N)」展開
 * - 各 chip はリンク (toggle で URL 書き換え)
 * - "クリアする" リンク (現状のタグを全部外す)
 *
 * State はすべて URL クエリ (?tags=a,b,c) に持つので Client 化不要。
 */
type Props = {
  state: ServiceFiltersState;
  topTags: TagWithCount[];
  moreTags: TagWithCount[];
  renderTagLabel: (tag: string) => string;
};

export function ServiceFiltersTagSection({
  state,
  topTags,
  moreTags,
  renderTagLabel,
}: Props) {
  if (topTags.length === 0 && moreTags.length === 0) return null;
  const selectedSet = new Set(state.tags);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/55">
          タグ
        </span>
        {state.tags.length > 0 ? (
          <Link
            href={buildServicesHref(state, { tags: [] })}
            className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground/65 hover:bg-primary-500/10 hover:text-foreground"
          >
            {state.tags.length} 個選択中 · 全て解除
          </Link>
        ) : (
          <span className="text-[11px] text-foreground/50">
            (複数選べます)
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {topTags.map((t) => {
          const active = selectedSet.has(t.tag);
          return (
            <Link
              key={t.tag}
              href={toggleTagHref(state, t.tag)}
              aria-pressed={active}
              className={
                'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold transition ' +
                (active
                  ? 'bg-primary-500/20 text-primary-300 ring-1 ring-primary-300'
                  : 'bg-muted text-foreground/70 hover:bg-primary-500/10 hover:text-foreground')
              }
            >
              {renderTagLabel(t.tag)}
              {t.count > 0 ? (
                <span
                  className={
                    'text-[10px] tabular ' +
                    (active ? 'text-primary-300/80' : 'text-foreground/45')
                  }
                >
                  {t.count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>

      {moreTags.length > 0 ? (
        <details className="group">
          <summary className="cursor-pointer text-[11px] font-semibold text-primary-300 hover:underline">
            ＋他のタグ ({moreTags.length})
          </summary>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {moreTags.map((t) => {
              const active = selectedSet.has(t.tag);
              return (
                <Link
                  key={t.tag}
                  href={toggleTagHref(state, t.tag)}
                  aria-pressed={active}
                  className={
                    'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold transition ' +
                    (active
                      ? 'bg-primary-500/20 text-primary-300 ring-1 ring-primary-300'
                      : 'bg-muted text-foreground/70 hover:bg-primary-500/10 hover:text-foreground')
                  }
                >
                  {renderTagLabel(t.tag)}
                  {t.count > 0 ? (
                    <span
                      className={
                        'text-[10px] tabular ' +
                        (active ? 'text-primary-300/80' : 'text-foreground/45')
                      }
                    >
                      {t.count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </details>
      ) : null}
    </div>
  );
}
