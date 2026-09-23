'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createGroup, joinGroup } from '@/lib/api/groups';
import { ApiError } from '@/lib/api/errors';
import { requireToken } from '@/lib/session';

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
    return {
      error: e instanceof ApiError ? e.message : '通信エラーが発生しました',
    };
  }
  revalidatePath('/groups');
  redirect(`/groups/${groupId}`);
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
    return {
      error: e instanceof ApiError ? e.message : '通信エラーが発生しました',
    };
  }
  revalidatePath('/groups');
  redirect(`/groups/${groupId}`);
}
