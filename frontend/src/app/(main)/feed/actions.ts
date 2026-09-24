'use server';

import { listFeed } from '@/lib/api/records';
import { redirectOn401 } from '@/lib/api/errors';
import { requireToken } from '@/lib/session';
import { RecordItem } from '@/lib/api/types';

/**
 * 「もっと見る」用。tokenはhttpOnly Cookieでブラウザ側JSから読めないため、
 * クライアントから直接backendを叩けない。Server Action経由でtokenを補って取得する。
 */
export async function loadMoreFeedAction(
  cursor: string,
  groupId?: string,
): Promise<RecordItem[]> {
  const token = await requireToken();
  try {
    return await listFeed(token, { cursor, groupId });
  } catch (e) {
    redirectOn401(e);
    throw e;
  }
}
