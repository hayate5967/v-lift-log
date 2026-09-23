import { ApiError, ApiErrorBody } from './errors';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  token?: string;
  body?: unknown;
  searchParams?: Record<string, string | number | undefined>;
}

/**
 * backend(NestJS)への共通fetchラッパー。Server Component/Server Actionからのみ呼ぶ
 * （tokenはCookieから取得したものを都度渡す。ブラウザ側JSはtokenに触れない）。
 */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  if (!BASE_URL) {
    throw new Error(
      'NEXT_PUBLIC_API_BASE_URL が設定されていません（.env.localを確認してください）',
    );
  }

  const { method = 'GET', token, body, searchParams } = options;

  const url = new URL(path, BASE_URL);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      res.status,
      (data as ApiErrorBody | null) ?? {
        statusCode: res.status,
        message: 'リクエストに失敗しました',
      },
    );
  }

  return data as T;
}
