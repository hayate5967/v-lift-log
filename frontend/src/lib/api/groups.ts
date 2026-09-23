import { apiFetch } from './client';
import { Group } from './types';

// GroupsのUI本体はfeature/frontend-groupsで実装する。ここではRecordsの
// 公開先チェックボックス・Feedのグループ絞り込みが必要とするlistGroupsのみ先行実装する。

/** GET /groups: 自分の所属グループ一覧。 */
export function listGroups(token: string): Promise<Group[]> {
  return apiFetch('/groups', { token });
}
