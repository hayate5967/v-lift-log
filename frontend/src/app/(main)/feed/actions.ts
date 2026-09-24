'use server';

import { listFeed } from '@/lib/api/records';
import { runMutationAction } from '@/lib/api/errors';
import { requireToken } from '@/lib/session';
import { RecordItem } from '@/lib/api/types';

/**
 * 「もっと見る」用。tokenはhttpOnly Cookieでブラウザ側JSから読めないため、
 * クライアントから直接backendを叩けない。Server Action経由でtokenを補って取得する。
 */
export async function loadMoreFeedAction(
  groupId: string | undefined,
  cursor: string,
): Promise<RecordItem[]> {
  const token = await requireToken();
  const result = await runMutationAction(() =>
    listFeed(token, { cursor, groupId }),
  );
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.value;
}
