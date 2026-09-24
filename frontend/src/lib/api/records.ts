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
