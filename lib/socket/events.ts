export const SOCKET_EVENTS = {
  // Connection / Rooms
  JOIN_ORG: 'join:org',
  LEAVE_ORG: 'leave:org',
  JOIN_TASK: 'join:task',
  LEAVE_TASK: 'leave:task',

  // Presence
  PRESENCE_UPDATE: 'presence:update',

  // Kanban & Task Events
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',

  // Comments & Typing
  COMMENT_CREATED: 'comment:created',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',

  // Notifications
  NOTIFICATION_NEW: 'notification:new',
} as const;

export interface OnlineUser {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  orgId: string;
}
