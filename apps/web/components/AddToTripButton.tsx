'use client';

import { toast } from 'sonner';
import { Button } from '@locore/ui';
import { CalendarPlus } from '@locore/ui/icons';
import { TripAdds } from '../lib/storage/local';

export function AddToTripButton({
  articleId,
  size = 'md',
}: {
  articleId: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <Button
      variant="outline"
      size={size}
      onClick={() => {
        TripAdds.add(articleId);
        toast.success('旅程に追加しました', {
          description: '「旅程」ページから確認できます',
        });
      }}
    >
      <CalendarPlus className="mr-1.5 h-4 w-4" />
      旅程に追加
    </Button>
  );
}
