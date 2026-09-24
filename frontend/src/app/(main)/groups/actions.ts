'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createGroup, joinGroup, listGroupRecords } from '@/lib/api/groups';
import { ApiError, redirectOn401 } from '@/lib/api/errors';
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

  let groupId: string;
  try {
    const { group } = await createGroup(token, name);
    groupId = group.id;
  } catch (e) {
    redirectOn401(e);
    return {
      error: e instanceof ApiError ? e.message : '通信エラーが発生しました',
    };
  }
  revalidatePath('/groups');
  redirect(`/groups/${groupId}`);
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
  try {
    return await listGroupRecords(token, groupId, cursor);
  } catch (e) {
    redirectOn401(e);
    throw e;
  }
}

export async function joinGroupAction(
  _prevState: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const token = await requireToken();
  const joinCode = String(formData.get('joinCode') ?? '');

  let groupId: string;
  try {
    const { group } = await joinGroup(token, joinCode);
    groupId = group.id;
  } catch (e) {
    redirectOn401(e);
    return {
      error: e instanceof ApiError ? e.message : '通信エラーが発生しました',
    };
  }
  revalidatePath('/groups');
  redirect(`/groups/${groupId}`);
}
