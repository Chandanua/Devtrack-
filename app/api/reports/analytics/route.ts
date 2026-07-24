import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrgAccess } from '@/lib/auth/get-org';

export async function GET(request: Request) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const sprintId = url.searchParams.get('sprintId');

  // Fetch all sprints in org
  const sprints = await prisma.sprint.findMany({
    where: { project: { org_id: access.orgId } },
    include: {
      project: { select: { id: true, name: true } },
      tasks: true,
    },
    orderBy: { start_date: 'asc' },
  });

  // Calculate Velocity data across sprints
  const velocityData = sprints.map((s) => {
    const totalTasks = s.tasks.length;
    const completedTasks = s.tasks.filter((t) => t.status === 'completed').length;
    return {
      sprintName: s.name,
      total: totalTasks,
      completed: completedTasks,
      status: s.status,
    };
  });

  // Active sprint or selected sprint for Burndown
  const activeSprint = sprintId
    ? sprints.find((s) => s.id === sprintId)
    : sprints.find((s) => s.status === 'active') || sprints[sprints.length - 1];

  let burndownData: Array<{ day: string; ideal: number; actual: number }> = [];

  if (activeSprint) {
    const startDate = new Date(activeSprint.start_date);
    const endDate = new Date(activeSprint.end_date);
    const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

    const tasksInSprint = activeSprint.tasks;
    const totalTaskCount = tasksInSprint.length;

    // Generate daily burndown points
    burndownData = Array.from({ length: totalDays + 1 }).map((_, dayIdx) => {
      const currentDate = new Date(startDate.getTime() + dayIdx * 24 * 60 * 60 * 1000);
      const idealRemaining = Math.max(0, Math.round(totalTaskCount - (totalTaskCount / totalDays) * dayIdx));

      // Count tasks completed on or before this day
      const completedByDay = tasksInSprint.filter((t) => {
        if (t.status !== 'completed') return false;
        const updatedAt = new Date(t.updated_at);
        return updatedAt <= currentDate;
      }).length;

      const actualRemaining = Math.max(0, totalTaskCount - completedByDay);

      return {
        day: `Day ${dayIdx + 1} (${currentDate.toLocaleDateString('en', { month: 'short', day: 'numeric' })})`,
        ideal: idealRemaining,
        actual: currentDate <= new Date() ? actualRemaining : 0,
      };
    });
  }

  // Developer Throughput & Activity
  const orgMembers = await prisma.orgMembership.findMany({
    where: { org_id: access.orgId },
    include: {
      profile: {
        select: {
          id: true, full_name: true, avatar_url: true,
          task_assignees: { include: { task: true } },
          time_logs: true,
        },
      },
    },
  });

  const memberThroughput = orgMembers.map((m) => {
    const profile = m.profile;
    const assignedTasks = profile.task_assignees.map((ta) => ta.task);
    const completedCount = assignedTasks.filter((t) => t.status === 'completed').length;
    const inProgressCount = assignedTasks.filter((t) => t.status === 'in_progress').length;
    const totalMinutesLogged = profile.time_logs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0);

    return {
      userId: profile.id,
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url,
      assigned: assignedTasks.length,
      completed: completedCount,
      inProgress: inProgressCount,
      hoursLogged: Math.round((totalMinutesLogged / 60) * 10) / 10,
    };
  });

  // Cycle time metrics (avg hours from created to completed)
  const completedTasksWithTime = await prisma.task.findMany({
    where: {
      project: { org_id: access.orgId },
      status: 'completed',
    },
    select: { created_at: true, updated_at: true, priority: true },
  });

  let avgCycleHours = 0;
  if (completedTasksWithTime.length > 0) {
    const totalHours = completedTasksWithTime.reduce((sum, t) => {
      const diff = new Date(t.updated_at).getTime() - new Date(t.created_at).getTime();
      return sum + diff / (1000 * 60 * 60);
    }, 0);
    avgCycleHours = Math.round((totalHours / completedTasksWithTime.length) * 10) / 10;
  }

  return NextResponse.json({
    sprints: sprints.map((s) => ({ id: s.id, name: s.name, status: s.status, goal: s.goal })),
    activeSprint: activeSprint
      ? { id: activeSprint.id, name: activeSprint.name, status: activeSprint.status, goal: activeSprint.goal }
      : null,
    velocityData,
    burndownData,
    memberThroughput,
    cycleTime: {
      avgCycleHours,
      completedSampleCount: completedTasksWithTime.length,
    },
  });
}
