/** docs/api-spec.md 1.4「エラーレスポンス形式」。 */
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, body: ApiErrorBody) {
    super(Array.isArray(body.message) ? body.message.join('\n') : body.message);
    this.name = 'ApiError';
    this.status = status;
  }
}
