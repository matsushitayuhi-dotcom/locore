'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { updateUserRole } from './actions';

/**
 * インライン role 変更セレクト。
 * 変更すると即時 Server Action を呼ぶ。
 */

const ROLES = ['reader', 'resident_writer', 'editor', 'light_diarist'] as const;
type Role = (typeof ROLES)[number];

const ROLE_LABEL: Record<Role, string> = {
  reader: '読者',
  resident_writer: 'ライター',
  editor: '編集者',
  light_diarist: '日記',
};

export function UserRoleSelect({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: Role;
}) {
  const [role, setRole] = useState<Role>(currentRole);
  const [isPending, startTransition] = useTransition();

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as Role;
    const prev = role;
    setRole(newRole); // optimistic
    startTransition(async () => {
      const res = await updateUserRole({ userId, role: newRole });
      if (res.ok) {
        toast.success(
          `ロールを ${ROLE_LABEL[newRole]} に変更しました`,
          { description: 'ユーザーは次回ログイン時に反映' },
        );
      } else {
        setRole(prev); // rollback
        toast.error(res.error);
      }
    });
  };

  return (
    <select
      value={role}
      onChange={onChange}
      disabled={isPending}
      className={
        'h-7 rounded-md border border-border bg-card px-1.5 text-[11px] font-medium tabular focus:border-2 focus:border-primary-500 focus:outline-none ' +
        (role === 'editor'
          ? 'text-primary-300'
          : role === 'resident_writer'
            ? 'text-foreground'
            : 'text-foreground/65') +
        (isPending ? ' opacity-50' : '')
      }
      aria-label="ロールを変更"
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABEL[r]}
        </option>
      ))}
    </select>
  );
}
