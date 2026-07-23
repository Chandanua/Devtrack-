// Re-export Prisma types as the app's domain types
// This replaces the old manually-defined types that mirrored Supabase

export type {
  Profile,
  Team,
  TeamMember,
  Project,
  Task,
  TaskAssignee,
  TaskDependency,
  Tag,
  TaskTag,
  TaskAttachment,
  Comment,
  CommentReaction,
  TimeLog,
  Notification,
  ActivityLog,
  Sprint,
} from '@prisma/client';

export type {
  UserRole,
  UserAvailability,
  ProjectStatus,
  TaskStatus,
  TaskPriority,
  SprintStatus,
  NotificationType,
} from '@prisma/client';

// Extended types used by the frontend (with joined relations)
export interface TaskWithRelations {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  project_id: string;
  parent_task_id: string | null;
  order_index: number;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  project?: { id: string; name: string } | null;
  assignees?: Array<{ id: string; full_name: string; avatar_url: string | null; email: string }>;
  tags?: Array<{ id: string; name: string; color: string }>;
  subtasks?: TaskWithRelations[];
  attachments?: Array<{ id: string; filename: string; storage_path: string; file_type: string; file_size: number; uploaded_by: string; created_at: string }>;
  _count?: { comments: number; subtasks: number; attachments: number; assignees: number };
}
