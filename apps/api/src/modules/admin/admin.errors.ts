export class AdminUserNotFoundError extends Error {
  readonly code = 'ADMIN_USER_NOT_FOUND' as const;

  constructor() {
    super('Administrator target user was not found');
  }
}

export class AdminCursorInvalidError extends Error {
  readonly code = 'ADMIN_CURSOR_INVALID' as const;

  constructor() {
    super('Administrator cursor is invalid');
  }
}
