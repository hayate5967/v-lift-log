/**
 * middleware.ts（Edge runtime）とlib/session.ts（Node runtime, next/headers使用）の
 * 両方から参照するため、next/headers等ランタイム依存の無い純粋な定数だけをここに置く。
 */
export const SESSION_COOKIE_NAME = 'vlift_token';
