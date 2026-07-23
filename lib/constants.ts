import type {
  ProjectStatus,
  TaskPriority,
  TaskStatus,
  UserRole,
  UserAvailability,
} from '@/lib/types/database';

export const ROLES: UserRole[] = [
  'super_admin',
  'project_manager',
  'team_lead',
  'developer',
  'qa_tester',
  'designer',
];

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  project_manager: 'Project Manager',
  team_lead: 'Team Lead',
  developer: 'Developer',
  qa_tester: 'QA Tester',
  designer: 'UI/UX Designer',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  super_admin: 'Full access to all settings, teams, and data',
  project_manager: 'Create projects, assign teams, manage timelines',
  team_lead: 'Lead a team, manage tasks and review progress',
  developer: 'Work on assigned tasks, track time, collaborate',
  qa_tester: 'Test and verify tasks, report bugs and issues',
  designer: 'Design tasks, share mockups, collaborate with team',
};

export const PROJECT_STATUSES: ProjectStatus[] = [
  'planning',
  'active',
  'on_hold',
  'completed',
];

export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; color: string; dotClass: string }
> = {
  planning: { label: 'Planning', color: 'blue', dotClass: 'bg-blue-500' },
  active: { label: 'Active', color: 'green', dotClass: 'bg-emerald-500' },
  on_hold: { label: 'On Hold', color: 'amber', dotClass: 'bg-amber-500' },
  completed: { label: 'Completed', color: 'slate', dotClass: 'bg-slate-400' },
};

export const TASK_STATUSES: TaskStatus[] = [
  'backlog',
  'todo',
  'in_progress',
  'code_review',
  'testing',
  'blocked',
  'completed',
];

export const TASK_STATUS_META: Record<
  TaskStatus,
  { label: string; color: string; badgeClass: string; dotClass: string }
> = {
  backlog: {
    label: 'Backlog',
    color: 'slate',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    dotClass: 'bg-slate-500',
  },
  todo: {
    label: 'To Do',
    color: 'blue',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    dotClass: 'bg-blue-500',
  },
  in_progress: {
    label: 'In Progress',
    color: 'violet',
    badgeClass:
      'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    dotClass: 'bg-violet-500',
  },
  code_review: {
    label: 'Code Review',
    color: 'cyan',
    badgeClass: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
    dotClass: 'bg-cyan-500',
  },
  testing: {
    label: 'Testing',
    color: 'amber',
    badgeClass:
      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    dotClass: 'bg-amber-500',
  },
  blocked: {
    label: 'Blocked',
    color: 'red',
    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    dotClass: 'bg-red-500',
  },
  completed: {
    label: 'Completed',
    color: 'green',
    badgeClass:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    dotClass: 'bg-emerald-500',
  },
};

export const TASK_PRIORITIES: TaskPriority[] = ['critical', 'high', 'medium', 'low'];

export const TASK_PRIORITY_META: Record<
  TaskPriority,
  { label: string; dotClass: string; badgeClass: string; emoji: string }
> = {
  critical: {
    label: 'Critical',
    dotClass: 'bg-red-500',
    badgeClass: 'bg-red-500 text-white',
    emoji: '🔴',
  },
  high: {
    label: 'High',
    dotClass: 'bg-orange-500',
    badgeClass: 'bg-orange-500 text-white',
    emoji: '🟠',
  },
  medium: {
    label: 'Medium',
    dotClass: 'bg-yellow-500',
    badgeClass: 'bg-yellow-500 text-white',
    emoji: '🟡',
  },
  low: {
    label: 'Low',
    dotClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-500 text-white',
    emoji: '🟢',
  },
};

export const AVAILABILITY_META: Record<
  UserAvailability,
  { label: string; dotClass: string }
> = {
  available: { label: 'Available', dotClass: 'bg-emerald-500' },
  busy: { label: 'Busy', dotClass: 'bg-red-500' },
  away: { label: 'Away', dotClass: 'bg-amber-500' },
  offline: { label: 'Offline', dotClass: 'bg-slate-400' },
};

export const TAG_COLORS: Record<
  string,
  { badgeClass: string; dotClass: string }
> = {
  blue: {
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    dotClass: 'bg-blue-500',
  },
  cyan: {
    badgeClass: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
    dotClass: 'bg-cyan-500',
  },
  violet: {
    badgeClass:
      'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    dotClass: 'bg-violet-500',
  },
  red: {
    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    dotClass: 'bg-red-500',
  },
  green: {
    badgeClass:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    dotClass: 'bg-emerald-500',
  },
  pink: {
    badgeClass: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
    dotClass: 'bg-pink-500',
  },
  amber: {
    badgeClass:
      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    dotClass: 'bg-amber-500',
  },
  orange: {
    badgeClass:
      'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    dotClass: 'bg-orange-500',
  },
};

export function tagColorMeta(color: string) {
  return TAG_COLORS[color] ?? TAG_COLORS.blue;
}

export function priorityRank(priority: TaskPriority): number {
  return { critical: 0, high: 1, medium: 2, low: 3 }[priority];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function avatarGradient(seed: string): string {
  const gradients = [
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-rose-500 to-orange-500',
    'from-violet-500 to-fuchsia-500',
    'from-amber-500 to-yellow-500',
    'from-cyan-500 to-sky-500',
    'from-pink-500 to-rose-500',
    'from-indigo-500 to-blue-500',
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return gradients[Math.abs(hash) % gradients.length];
}

// String-keyed map for contexts where we don't want to import Prisma types
export const ROLE_LABELS_MAP: Record<string, string> = {
  super_admin: 'Super Admin',
  project_manager: 'Project Manager',
  team_lead: 'Team Lead',
  developer: 'Developer',
  qa_tester: 'QA Tester',
  designer: 'UI/UX Designer',
};

