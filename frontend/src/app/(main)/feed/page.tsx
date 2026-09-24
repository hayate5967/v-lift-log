import { requireToken } from '@/lib/session';
import { listFeed } from '@/lib/api/records';
import { listGroups } from '@/lib/api/groups';
import { GroupFilter } from './GroupFilter';
import { FeedList } from './FeedList';

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ groupId?: string }>;
}) {
  const { groupId } = await searchParams;
  const token = await requireToken();

  const [records, groups] = await Promise.all([
    listFeed(token, { groupId }),
    listGroups(token),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <GroupFilter groups={groups} />
      {/* groupId変更時にuseState(initialRecords)が古いまま残らないよう、
          keyでFeedListごと再マウントして一覧をリセットする。 */}
      <FeedList
        key={groupId ?? 'all'}
        initialRecords={records}
        groupId={groupId}
      />
    </div>
  );
}
