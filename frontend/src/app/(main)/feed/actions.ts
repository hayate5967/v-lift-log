'use server';

import { listFeed } from '@/lib/api/records';
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
  return listFeed(token, { cursor, groupId });
}
