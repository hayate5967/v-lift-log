import { apiFetch } from './client';
import { RecordItem } from './types';

export interface SetInput {
  order: number;
  weight: number;
  reps: number;
  velocity?: number;
}

export interface RecordInput {
  exerciseId: string;
  performedAt: string;
  memo?: string;
  sets: SetInput[];
  visibilityGroupIds?: string[];
}

/** POST /records */
export function createRecord(
  token: string,
  input: RecordInput,
): Promise<RecordItem> {
  return apiFetch('/records', { method: 'POST', token, body: input });
}

/** GET /records: 自分の記録一覧。 */
export function listOwnRecords(token: string): Promise<RecordItem[]> {
  return apiFetch('/records', { token });
}

/** GET /records/:id */
export function getRecord(token: string, id: string): Promise<RecordItem> {
  return apiFetch(`/records/${id}`, { token });
}

/** PATCH /records/:id */
export function updateRecord(
  token: string,
  id: string,
  input: Partial<RecordInput>,
): Promise<RecordItem> {
  return apiFetch(`/records/${id}`, { method: 'PATCH', token, body: input });
}

/** DELETE /records/:id */
export function deleteRecord(token: string, id: string): Promise<void> {
  return apiFetch(`/records/${id}`, { method: 'DELETE', token });
}

// backend共通のPaginationQueryDtoの既定値（backend/src/common/dto/pagination-query.dto.ts）。
// 「もっと見る」の表示要否を判定するヒューリスティックに使う。
export const FEED_PAGE_LIMIT = 20;

export interface FeedQuery {
  groupId?: string;
  cursor?: string;
}

/** GET /feed: 自分の記録+所属グループに公開された記録を新しい順で。 */
export function listFeed(
  token: string,
  query: FeedQuery = {},
): Promise<RecordItem[]> {
  return apiFetch('/feed', {
    token,
    searchParams: {
      groupId: query.groupId,
      cursor: query.cursor,
      limit: FEED_PAGE_LIMIT,
    },
  });
}
