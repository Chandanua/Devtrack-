import type { OrgRole } from '@prisma/client';

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
  | 'view_audit_log'
  | 'manage_members'
  | 'manage_workspace';

// Permissions mapped to org roles (owner inherits everything)
const PERMISSION_MAP: Record<Permission, OrgRole[]> = {
  create_project: ['owner', 'admin'],
  edit_project: ['owner', 'admin'],
  delete_project: ['owner', 'admin'],
  create_team: ['owner', 'admin'],
  manage_team_members: ['owner', 'admin'],
  create_task: ['owner', 'admin', 'member'],
  edit_any_task: ['owner', 'admin'],
  delete_task: ['owner', 'admin'],
  manage_tags: ['owner', 'admin', 'member'],
  view_all_reports: ['owner', 'admin', 'member', 'viewer'],
  view_team_reports: ['owner', 'admin', 'member', 'viewer'],
  manage_sprints: ['owner', 'admin', 'member'],
  view_audit_log: ['owner', 'admin'],
  manage_members: ['owner', 'admin'],
  manage_workspace: ['owner', 'admin'],
};

/**
 * Check if a user with the given org role has a specific permission.
 */
export function can(orgRole: string | undefined | null, permission: Permission): boolean {
  if (!orgRole) return false;
  return PERMISSION_MAP[permission]?.includes(orgRole as OrgRole) ?? false;
}

/**
 * Check if the role is admin-level or above within the org.
 */
export function isManagerOrAbove(orgRole: string | undefined | null): boolean {
  if (!orgRole) return false;
  return ['owner', 'admin'].includes(orgRole);
}

/**
 * Check if the role is the org owner.
 */
export function isAdmin(orgRole: string | undefined | null): boolean {
  return orgRole === 'owner';
}

/**
 * Check if the role can edit content (not a viewer).
 */
export function canEdit(orgRole: string | undefined | null): boolean {
  if (!orgRole) return false;
  return ['owner', 'admin', 'member'].includes(orgRole);
}

// Legacy support: map old UserRole to a default OrgRole for migration
export function userRoleToOrgRole(userRole: string): OrgRole {
  switch (userRole) {
    case 'super_admin':
      return 'owner';
    case 'project_manager':
      return 'admin';
    case 'team_lead':
      return 'admin';
    default:
      return 'member';
  }
}
