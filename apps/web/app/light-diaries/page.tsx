import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@locore/ui';
import { listLightDiaries } from '@/lib/lightDiaries/db';
import { LightDiaryPostButton } from '../../components/LightDiaryPostButton';

export const metadata = {
  title: 'ライト旅行記 — Locore',
};

export const dynamic = 'force-dynamic';

export default async function LightDiariesPage() {
  const lightDiaries = await listLightDiaries(50);
  return (
    <main className="mx-auto max-w-screen-md px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/50">
            ライト旅行記（無料）
          </p>
          <h1
            className="mt-1 text-[28px] font-semibold tracking-tight"
            style={{
              fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
            }}
          >
            一般ユーザーの、短い記録
          </h1>
          <p className="mt-1 text-[13px] text-foreground/60">
            編集を経ない、生の声。誰でも気軽に書ける。
          </p>
        </div>
        <LightDiaryPostButton />
      </div>

      <div className="space-y-3">
        {lightDiaries.map((d) => (
          <article
            key={d.id}
            className="rounded-md border border-border/60 bg-card/60 p-5 transition hover:bg-card"
          >
            <div className="flex items-center gap-3">
              <Avatar size="sm">
                <AvatarImage src={d.avatarUrl} alt={d.authorName} />
                <AvatarFallback>{d.authorName[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-[13px] font-medium">{d.authorName}</p>
                <p className="text-[11px] tabular text-foreground/50">
                  {d.visitedAt}
                </p>
              </div>
              <p className="ml-auto text-[11px] tabular text-foreground/40">
                ♡ {d.likes}
              </p>
            </div>
            <h3
              className="mt-3 text-[16px] font-semibold leading-snug"
              style={{
                fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
              }}
            >
              {d.title}
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-foreground/75">
              {d.body}
            </p>
          </article>
        ))}
      </div>
    </main>
  );
}
