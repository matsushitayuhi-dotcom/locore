'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button, Input } from '@locore/ui';
import { deleteAccount } from '@/app/settings/account/actions';

const CONFIRM_TEXT = '退会する';

type Props = {
  disabled?: boolean;
  hasUnsettled?: boolean;
};

export function DeleteAccountDialog({ disabled, hasUnsettled }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onConfirm = () => {
    if (confirmText !== CONFIRM_TEXT) {
      toast.error(`「${CONFIRM_TEXT}」と入力してください`);
      return;
    }
    startTransition(async () => {
      const res = await deleteAccount({ reason, confirmText });
      if (res.ok) {
        setDone(true);
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        退会手続きを開始
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-neutral-900/40 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !isPending && !done && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-md border border-border bg-card p-6 shadow-md"
            onClick={(e) => e.stopPropagation()}
          >
            {done ? (
              <div className="space-y-4 text-center">
                <p
                  className="text-[18px] font-semibold tracking-tight"
                  style={{
                    fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
                  }}
                >
                  退会手続きを完了しました
                </p>
                <p className="text-[12px] text-foreground/60">
                  ご利用ありがとうございました。<br />
                  既存の購入者はあなたの記事を引き続き閲覧できます。
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    setDone(false);
                  }}
                >
                  閉じる
                </Button>
              </div>
            ) : (
              <>
                <h3
                  className="text-[18px] font-semibold tracking-tight text-danger-500"
                  style={{
                    fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
                  }}
                >
                  退会の確認
                </h3>
                <ul className="mt-3 space-y-1.5 text-[12px] text-foreground/70">
                  <li>・ログインできなくなります（再登録は別アカウント扱い）。</li>
                  <li>・公開中の記事は販売停止になります。</li>
                  <li>・既存購入者は引き続き閲覧できます。</li>
                  <li>・取引履歴・監査ログは法令上保管されます。</li>
                  {hasUnsettled ? (
                    <li className="text-danger-500">
                      ・未精算の残高がある場合、次回月次精算時に送金されます。
                    </li>
                  ) : null}
                </ul>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-foreground/70">
                      退会理由（任意）
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      maxLength={1000}
                      rows={3}
                      className="flex w-full rounded-sm border border-border bg-card px-3 py-2 text-body-md text-foreground placeholder:text-neutral-400 focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
                      placeholder="改善のため、よろしければご記入ください"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-foreground/70">
                      確認のため「{CONFIRM_TEXT}」と入力してください
                    </label>
                    <Input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder={CONFIRM_TEXT}
                    />
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={isPending}
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={onConfirm}
                    disabled={isPending || confirmText !== CONFIRM_TEXT}
                  >
                    {isPending ? '処理中…' : '退会する'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
