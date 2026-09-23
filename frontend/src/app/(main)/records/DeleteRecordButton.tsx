'use client';

import { Button } from '@/components/ui/Button';

export function DeleteRecordButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm('この記録を削除しますか？')) {
          e.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="danger">
        削除する
      </Button>
    </form>
  );
}
