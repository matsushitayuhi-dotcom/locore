'use client';

import { toast } from 'sonner';
import { Button } from '@locore/ui';
import { Plus } from '@locore/ui/icons';

export function LightDiaryPostButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() =>
        toast('機能はまもなく公開', {
          description: '一般ユーザー投稿は M2 で開放予定です',
        })
      }
    >
      <Plus className="mr-1 h-3.5 w-3.5" />
      投稿する
    </Button>
  );
}
