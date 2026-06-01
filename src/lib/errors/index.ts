export type ErrorCode =
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'EMAIL_EXISTS'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'INVITE_FAILED';

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export type ActionResult<T = void> =
  | (T extends void ? { success: true } : { success: true; data: T })
  | { success: false; code: ErrorCode | 'UNKNOWN'; message: string };

export function actionError(
  e: unknown,
): { success: false; code: ErrorCode | 'UNKNOWN'; message: string } {
  if (e instanceof AppError) {
    return { success: false, code: e.code, message: e.message };
  }
  const message = e instanceof Error ? e.message : 'An unexpected error occurred';
  return { success: false, code: 'UNKNOWN', message };
}
