export type UserRole =
  | 'super_admin'
  | 'project_manager'
  | 'team_lead'
  | 'developer'
  | 'qa_tester'
  | 'designer';

export type UserAvailability = 'available' | 'busy' | 'away' | 'offline';

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed';

export type TaskStatus =
  | 'backlog'
  | 'todo'
  | 'in_progress'
  | 'code_review'
  | 'testing'
  | 'blocked'
  | 'completed';

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export type SprintStatus = 'planning' | 'active' | 'completed';

export type NotificationType =
  | 'task_assigned'
  | 'due_reminder'
  | 'deadline_approaching'
  | 'task_overdue'
  | 'comment_mention'
  | 'status_change'
  | 'priority_update'
  | 'project_announcement';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  job_title: string | null;
  availability: UserAvailability;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role_within_team: 'lead' | 'member';
  created_at: string;
  profile?: Profile;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  client_name: string | null;
  client_contact: string | null;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  team_id: string | null;
  created_by: string;
  progress: number;
  created_at: string;
  updated_at: string;
  team?: Team | null;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  project_id: string;
  parent_task_id: string | null;
  order_index: number;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  created_by: string;
  is_recurring: boolean;
  recurrence_rule: string | null;
  sprint_id: string | null;
  created_at: string;
  updated_at: string;
  project?: Project;
  assignees?: Profile[];
  tags?: Tag[];
  subtasks?: Task[];
  attachments?: TaskAttachment[];
  _count?: {
    comments: number;
    subtasks: number;
    attachments: number;
    assignees: number;
  };
}

export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  created_at: string;
  profile?: Profile;
}

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  created_at: string;
  depends_on_task?: Task;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  filename: string;
  storage_path: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
  uploaded_by_profile?: Profile;
}

export interface Comment {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author?: Profile;
  reactions?: CommentReaction[];
}

export interface CommentReaction {
  comment_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface TimeLog {
  id: string;
  task_id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  description: string | null;
  created_at: string;
  profile?: Profile;
  task?: Task;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  entity_type: 'task' | 'project' | 'comment' | null;
  entity_id: string | null;
  read: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  task_id: string;
  user_id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  profile?: Profile;
}

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal: string | null;
  start_date: string;
  end_date: string;
  status: SprintStatus;
  created_at: string;
}
