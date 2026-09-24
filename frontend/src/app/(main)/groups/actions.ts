'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createGroup, joinGroup, listGroupRecords } from '@/lib/api/groups';
import { runMutationAction } from '@/lib/api/errors';
import { requireToken } from '@/lib/session';
import { RecordItem } from '@/lib/api/types';

export interface GroupFormState {
  error?: string;
}

export async function createGroupAction(
  _prevState: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const token = await requireToken();
  const name = String(formData.get('name') ?? '');

  const result = await runMutationAction(() => createGroup(token, name));
  if (!result.ok) {
    return { error: result.error };
  }
  revalidatePath('/groups');
  redirect(`/groups/${result.value.group.id}`);
}

/**
 * 「もっと見る」用。tokenはhttpOnly Cookieでブラウザ側JSから読めないため、
 * クライアントから直接backendを叩けない。Server Action経由でtokenを補って取得する。
 */
export async function loadMoreGroupRecordsAction(
  groupId: string,
  cursor: string,
): Promise<RecordItem[]> {
  const token = await requireToken();
  const result = await runMutationAction(() =>
    listGroupRecords(token, groupId, cursor),
  );
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.value;
}

export async function joinGroupAction(
  _prevState: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const token = await requireToken();
  const joinCode = String(formData.get('joinCode') ?? '');

  const result = await runMutationAction(() => joinGroup(token, joinCode));
  if (!result.ok) {
    return { error: result.error };
  }
  revalidatePath('/groups');
  redirect(`/groups/${result.value.group.id}`);
}
