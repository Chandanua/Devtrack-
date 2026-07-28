import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

// ─── Mocks ───────────────────────────────────────────────────

// Mock Prisma DB
vi.mock('@/lib/db', () => ({
  prisma: {
    task: {
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    project: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    comment: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
  },
}));

// Mock requireOrgAccess auth helper
vi.mock('@/lib/auth/get-org', () => ({
  requireOrgAccess: vi.fn(),
}));

// Mock socket server emitters
vi.mock('@/lib/socket/server', () => ({
  emitToOrg: vi.fn(),
  emitToUser: vi.fn(),
}));

import { prisma } from '@/lib/db';
import { requireOrgAccess } from '@/lib/auth/get-org';
import { GET as getTask, PUT as updateTask, DELETE as deleteTask } from '@/app/api/tasks/[id]/route';
import { GET as getComments, POST as addComment } from '@/app/api/tasks/[id]/comments/route';
import { DELETE as deleteProject } from '@/app/api/projects/[id]/route';

// ─── Test Fixtures ───────────────────────────────────────────

const USER_A_ORG_A = { userId: 'user-a-uuid', orgId: 'org-a-uuid', role: 'member' as const };
const VIEWER_ORG_A = { userId: 'user-viewer-uuid', orgId: 'org-a-uuid', role: 'viewer' as const };

const TASK_B_ORG_B = {
  id: 'task-b-uuid',
  title: 'Secret Task in Org B',
  project_id: 'project-b-uuid',
  project: { id: 'project-b-uuid', org_id: 'org-b-uuid', name: 'Project B' },
};

const PROJECT_A_ORG_A = {
  id: 'project-a-uuid',
  name: 'Project A',
  org_id: 'org-a-uuid',
};

describe('Security Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── 1. Cross-Tenant IDOR: Tasks ───────────────────────────

  describe('Cross-Tenant IDOR Protection on Tasks', () => {
    it('prevents user from Org A from reading (GET) a task in Org B (returns 404)', async () => {
      // User A from Org A requests access
      vi.mocked(requireOrgAccess).mockResolvedValue(USER_A_ORG_A);

      // Prisma query scoped to Org A returns null because task belongs to Org B
      vi.mocked(prisma.task.findFirst).mockResolvedValue(null);

      const res = await getTask(new Request('http://localhost:3000/api/tasks/task-b-uuid'), {
        params: Promise.resolve({ id: 'task-b-uuid' }),
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('Not found');

      // Verify Prisma query enforced org scoping
      expect(prisma.task.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'task-b-uuid',
            project: { org_id: 'org-a-uuid' },
          }),
        })
      );
    });

    it('prevents user from Org A from updating (PUT) a task in Org B (returns 404)', async () => {
      vi.mocked(requireOrgAccess).mockResolvedValue(USER_A_ORG_A);
      vi.mocked(prisma.task.findFirst).mockResolvedValue(null);

      const req = new Request('http://localhost:3000/api/tasks/task-b-uuid', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Hacked Title' }),
      });

      const res = await updateTask(req, {
        params: Promise.resolve({ id: 'task-b-uuid' }),
      });

      expect(res.status).toBe(404);
      expect(prisma.task.update).not.toHaveBeenCalled();
    });

    it('prevents user from Org A from deleting (DELETE) a task in Org B (returns 404)', async () => {
      vi.mocked(requireOrgAccess).mockResolvedValue({ ...USER_A_ORG_A, role: 'admin' });
      vi.mocked(prisma.task.findFirst).mockResolvedValue(null);

      const res = await deleteTask(new Request('http://localhost:3000/api/tasks/task-b-uuid'), {
        params: Promise.resolve({ id: 'task-b-uuid' }),
      });

      expect(res.status).toBe(404);
      expect(prisma.task.delete).not.toHaveBeenCalled();
    });
  });

  // ─── 2. Cross-Tenant IDOR: Comments ────────────────────────

  describe('Cross-Tenant IDOR Protection on Task Comments', () => {
    it('prevents user from Org A from reading comments on Org B task (returns 404)', async () => {
      vi.mocked(requireOrgAccess).mockResolvedValue(USER_A_ORG_A);
      vi.mocked(prisma.task.findFirst).mockResolvedValue(null);

      const res = await getComments(new Request('http://localhost:3000/api/tasks/task-b-uuid/comments'), {
        params: Promise.resolve({ id: 'task-b-uuid' }),
      });

      expect(res.status).toBe(404);
      expect(prisma.comment.findMany).not.toHaveBeenCalled();
    });

    it('prevents user from Org A from posting comments on Org B task (returns 404)', async () => {
      vi.mocked(requireOrgAccess).mockResolvedValue(USER_A_ORG_A);
      vi.mocked(prisma.task.findFirst).mockResolvedValue(null);

      const req = new Request('http://localhost:3000/api/tasks/task-b-uuid/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: 'Unauthorized comment' }),
      });

      const res = await addComment(req, {
        params: Promise.resolve({ id: 'task-b-uuid' }),
      });

      expect(res.status).toBe(404);
      expect(prisma.comment.create).not.toHaveBeenCalled();
    });
  });

  // ─── 3. Server-Side RBAC: Viewer Role Restrictions ────────

  describe('Server-Side RBAC Enforcement', () => {
    it('prevents a "viewer" role user from deleting a task (returns 403)', async () => {
      vi.mocked(requireOrgAccess).mockResolvedValue(VIEWER_ORG_A);

      const res = await deleteTask(new Request('http://localhost:3000/api/tasks/task-a-uuid'), {
        params: Promise.resolve({ id: 'task-a-uuid' }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Forbidden');
      expect(prisma.task.delete).not.toHaveBeenCalled();
    });

    it('prevents a "viewer" role user from deleting a project (returns 403)', async () => {
      vi.mocked(requireOrgAccess).mockResolvedValue(VIEWER_ORG_A);

      const res = await deleteProject(new Request('http://localhost:3000/api/projects/project-a-uuid'), {
        params: Promise.resolve({ id: 'project-a-uuid' }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Forbidden');
      expect(prisma.project.delete).not.toHaveBeenCalled();
    });
  });
});
