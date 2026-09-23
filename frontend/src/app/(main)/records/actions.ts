'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  createRecord,
  deleteRecord,
  updateRecord,
  type RecordInput,
  type SetInput,
} from '@/lib/api/records';
import { ApiError } from '@/lib/api/errors';
import { requireToken } from '@/lib/session';

export interface RecordFormState {
  error?: string;
}

function parseSets(formData: FormData): SetInput[] {
  const raw = String(formData.get('setsJson') ?? '[]');
  return JSON.parse(raw) as SetInput[];
}

function buildInput(formData: FormData): RecordInput {
  const memo = String(formData.get('memo') ?? '').trim();
  return {
    exerciseId: String(formData.get('exerciseId') ?? ''),
    performedAt: String(formData.get('performedAt') ?? ''),
    memo: memo || undefined,
    sets: parseSets(formData),
    visibilityGroupIds: formData.getAll('visibilityGroupIds').map(String),
  };
}

export async function createRecordAction(
  _prevState: RecordFormState,
  formData: FormData,
): Promise<RecordFormState> {
  const token = await requireToken();
  try {
    await createRecord(token, buildInput(formData));
  } catch (e) {
    return {
      error: e instanceof ApiError ? e.message : '通信エラーが発生しました',
    };
  }
  revalidatePath('/records');
  redirect('/records');
}

export async function updateRecordAction(
  id: string,
  _prevState: RecordFormState,
  formData: FormData,
): Promise<RecordFormState> {
  const token = await requireToken();
  try {
    await updateRecord(token, id, buildInput(formData));
  } catch (e) {
    return {
      error: e instanceof ApiError ? e.message : '通信エラーが発生しました',
    };
  }
  revalidatePath('/records');
  revalidatePath(`/records/${id}`);
  redirect(`/records/${id}`);
}

export async function deleteRecordAction(id: string): Promise<void> {
  const token = await requireToken();
  await deleteRecord(token, id);
  revalidatePath('/records');
  redirect('/records');
}
