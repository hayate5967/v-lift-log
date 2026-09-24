import { apiFetch } from './client';
import { Group, GroupMember, RecordItem } from './types';
import { PAGE_LIMIT } from './records';

/** GET /groups: 自分の所属グループ一覧。 */
export function listGroups(token: string): Promise<Group[]> {
  return apiFetch('/groups', { token });
}

/** POST /groups */
export function createGroup(
  token: string,
  name: string,
): Promise<{ group: Group; joinCode: string }> {
  return apiFetch('/groups', { method: 'POST', token, body: { name } });
}

/** POST /groups/join */
export function joinGroup(
  token: string,
  joinCode: string,
): Promise<{ group: Group }> {
  return apiFetch('/groups/join', {
    method: 'POST',
    token,
    body: { joinCode },
  });
}

/** GET /groups/:id: 詳細+メンバー一覧。 */
export function getGroupDetail(
  token: string,
  id: string,
): Promise<{ group: Group; members: GroupMember[] }> {
  return apiFetch(`/groups/${id}`, { token });
}

/** GET /groups/:groupId/records: そのグループに公開された記録一覧。 */
export function listGroupRecords(
  token: string,
  groupId: string,
  cursor?: string,
): Promise<RecordItem[]> {
  return apiFetch(`/groups/${groupId}/records`, {
    token,
    searchParams: { cursor, limit: PAGE_LIMIT },
  });
}
