'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  createRecord,
  deleteRecord,
  listOwnRecords,
  updateRecord,
  type RecordInput,
  type SetInput,
} from '@/lib/api/records';
import { ApiError } from '@/lib/api/errors';
import { requireToken } from '@/lib/session';
import { RecordItem } from '@/lib/api/types';

export interface RecordFormState {
  error?: string;
}

function parseSets(formData: FormData): SetInput[] {
  const raw = String(formData.get('setsJson') ?? '[]');
  return JSON.parse(raw) as SetInput[];
}

function buildInput(formData: FormData): RecordInput {
  // 空文字列でも常にmemoキーを含める。undefinedにするとJSON.stringifyでキーごと
  // 落ちてしまい、PATCH時にbackendの「キー無し=現状維持」セマンティクスと衝突して
  // メモを空にする編集が保存されない（既存メモが残ってしまう）。
  return {
    exerciseId: String(formData.get('exerciseId') ?? ''),
    performedAt: String(formData.get('performedAt') ?? ''),
    memo: String(formData.get('memo') ?? '').trim(),
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
  // /feedにも自分の記録が出るため、Router Cacheに古い一覧が残らないよう合わせて無効化する。
  revalidatePath('/records');
  revalidatePath('/feed');
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
  revalidatePath('/feed');
  redirect(`/records/${id}`);
}

export async function deleteRecordAction(id: string): Promise<void> {
  const token = await requireToken();
  try {
    await deleteRecord(token, id);
  } catch (e) {
    // deleteはuseActionStateを使わないフォームのため、フォーム内でエラー表示できない。
    // app/(main)/error.tsx の境界に捕捉させ、メッセージだけ分かりやすく保つ。
    throw new Error(
      e instanceof ApiError
        ? e.message
        : '削除に失敗しました。通信エラーが発生しました',
    );
  }
  revalidatePath('/records');
  revalidatePath('/feed');
  redirect('/records');
}

/**
 * 「もっと見る」用。tokenはhttpOnly Cookieでブラウザ側JSから読めないため、
 * クライアントから直接backendを叩けない。Server Action経由でtokenを補って取得する。
 */
export async function loadMoreOwnRecordsAction(
  cursor: string,
): Promise<RecordItem[]> {
  const token = await requireToken();
  return listOwnRecords(token, cursor);
}
