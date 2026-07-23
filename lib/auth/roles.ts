import type { UserRole } from '@/lib/types/database';

export type Permission =
  | 'create_project'
  | 'edit_project'
  | 'delete_project'
  | 'create_team'
  | 'manage_team_members'
  | 'create_task'
  | 'edit_any_task'
  | 'delete_task'
  | 'manage_tags'
  | 'view_all_reports'
  | 'view_team_reports'
  | 'manage_sprints'
  | 'view_audit_log';

const PERMISSION_MAP: Record<Permission, UserRole[]> = {
  create_project: ['super_admin', 'project_manager'],
  edit_project: ['super_admin', 'project_manager', 'team_lead'],
  delete_project: ['super_admin', 'project_manager'],
  create_team: ['super_admin', 'project_manager', 'team_lead'],
  manage_team_members: ['super_admin', 'project_manager', 'team_lead'],
  create_task: [
    'super_admin',
    'project_manager',
    'team_lead',
    'developer',
    'qa_tester',
    'designer',
  ],
  edit_any_task: ['super_admin', 'project_manager', 'team_lead'],
  delete_task: ['super_admin', 'project_manager', 'team_lead'],
  manage_tags: ['super_admin', 'project_manager', 'team_lead'],
  view_all_reports: ['super_admin', 'project_manager'],
  view_team_reports: ['super_admin', 'project_manager', 'team_lead'],
  manage_sprints: ['super_admin', 'project_manager', 'team_lead'],
  view_audit_log: ['super_admin', 'project_manager'],
};

export function can(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return PERMISSION_MAP[permission].includes(role);
}

export function isManagerOrAbove(role: UserRole | undefined): boolean {
  if (!role) return false;
  return ['super_admin', 'project_manager', 'team_lead'].includes(role);
}

export function isAdmin(role: UserRole | undefined): boolean {
  return role === 'super_admin';
}
