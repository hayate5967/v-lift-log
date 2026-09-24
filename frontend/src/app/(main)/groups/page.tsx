import Link from 'next/link';
import { requireToken } from '@/lib/session';
import { listGroups } from '@/lib/api/groups';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default async function GroupsPage() {
  const token = await requireToken();
  const groups = await listGroups(token);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Link href="/groups/new" className="flex-1">
          <Button>+ 作成</Button>
        </Link>
        <Link href="/groups/join" className="flex-1">
          <Button variant="secondary">参加する</Button>
        </Link>
      </div>

      {groups.length === 0 && (
        <p className="text-sm text-zinc-500">
          まだグループに所属していません。
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {groups.map((group) => (
          <li key={group.id}>
            <Link href={`/groups/${group.id}`}>
              <Card>
                <span className="font-medium">{group.name}</span>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
