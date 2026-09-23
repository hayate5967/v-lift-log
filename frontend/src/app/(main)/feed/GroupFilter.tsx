'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Group } from '@/lib/api/types';

export function GroupFilter({ groups }: { groups: Group[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get('groupId') ?? '';

  if (groups.length === 0) {
    return null;
  }

  return (
    <select
      value={current}
      onChange={(e) => {
        const value = e.target.value;
        router.push(value ? `/feed?groupId=${value}` : '/feed');
      }}
      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
    >
      <option value="">すべて</option>
      {groups.map((group) => (
        <option key={group.id} value={group.id}>
          {group.name}
        </option>
      ))}
    </select>
  );
}
