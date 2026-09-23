import { requireToken } from '@/lib/session';
import { getGroupDetail, listGroupRecords } from '@/lib/api/groups';
import { notFoundOn404 } from '@/lib/api/errors';
import { Card } from '@/components/ui/Card';
import { RecordListItem } from '@/components/RecordListItem';
import { CopyJoinCodeButton } from './CopyJoinCodeButton';

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const token = await requireToken();

  const [{ group, members }, records] = await Promise.all([
    getGroupDetail(token, id).catch(notFoundOn404),
    listGroupRecords(token, id).catch(notFoundOn404),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">{group.name}</h1>

      <Card>
        <p className="text-xs text-zinc-500">参加コード</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="font-mono text-lg tracking-widest">
            {group.joinCode}
          </span>
          <CopyJoinCodeButton joinCode={group.joinCode} />
        </div>
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-medium text-zinc-700">
          メンバー（{members.length}）
        </h2>
        <ul className="flex flex-col gap-1">
          {members.map((member) => (
            <li key={member.id} className="text-sm text-zinc-600">
              {member.name}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-zinc-700">記録</h2>
        {records.length === 0 ? (
          <p className="text-sm text-zinc-500">
            まだ公開された記録がありません。
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {records.map((record) => (
              <li key={record.id}>
                <RecordListItem record={record} showOwner />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
