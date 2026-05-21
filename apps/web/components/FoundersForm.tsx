'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Input } from '@locore/ui';

export function FoundersForm() {
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [open, setOpen] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      toast.error('有効なメールアドレスを入力してください');
      return;
    }
    setOpen(true);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-[12px] font-medium text-foreground/70">
          メールアドレス
        </label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-[12px] font-medium text-foreground/70">
          現在お住まいの街
        </label>
        <Input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="例：パリ・マレ地区 / NYC / ロンドン etc."
        />
      </div>
      <Button type="submit" variant="primary" size="lg" className="w-full">
        Founders 枠に応募する
      </Button>
      <p className="text-[11px] text-foreground/50">
        ※ プロト版のため、応募内容は送信されません。
      </p>

      {open ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-neutral-900/40 px-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-center shadow-md"
            onClick={(e) => e.stopPropagation()}
          >
            <p
              className="text-[20px] font-semibold tracking-tight"
            >
              申し込みを送信しました
            </p>
            <p className="mt-2 text-[13px] text-foreground/60">
              5営業日以内に編集チームよりご連絡します。<br />
              現地で住んでいる時間と、書きたい街について、簡単にお伺いします。
            </p>
            <Button
              variant="outline"
              className="mt-5"
              onClick={() => setOpen(false)}
            >
              閉じる
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
