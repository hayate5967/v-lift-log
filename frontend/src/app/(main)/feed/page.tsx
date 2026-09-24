import { requireToken } from '@/lib/session';
import { listFeed } from '@/lib/api/records';
import { listGroups } from '@/lib/api/groups';
import { PaginatedRecordsList } from '@/components/PaginatedRecordsList';
import { GroupFilter } from './GroupFilter';
import { loadMoreFeedAction } from './actions';

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
          keyで再マウントして一覧をリセットする。 */}
      <PaginatedRecordsList
        key={groupId ?? 'all'}
        initialRecords={records}
        loadMore={loadMoreFeedAction.bind(null, groupId)}
        showOwner
        emptyMessage="まだ記録がありません。"
      />
    </div>
  );
}
