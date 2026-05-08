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
