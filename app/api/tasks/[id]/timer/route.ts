import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrgAccess } from '@/lib/auth/get-org';
import { canEdit } from '@/lib/auth/roles';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canEdit(access.role)) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  const { id: taskId } = await params;

  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { org_id: access.orgId } },
    select: { id: true },
  });
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const userId = access.userId;
  const { action } = await req.json(); // 'start' | 'stop' | 'check'

  if (action === 'start') {
    // Check for existing active timer
    const existing = await prisma.timeLog.findFirst({
      where: { task_id: taskId, user_id: userId, end_time: null },
    });
    if (existing) return NextResponse.json({ error: 'Timer already running', log: existing }, { status: 409 });

    const log = await prisma.timeLog.create({
      data: { task_id: taskId, user_id: userId, start_time: new Date() },
    });
    return NextResponse.json(log, { status: 201 });
  }

  if (action === 'stop') {
    const active = await prisma.timeLog.findFirst({
      where: { task_id: taskId, user_id: userId, end_time: null },
    });
    if (!active) return NextResponse.json({ error: 'No active timer' }, { status: 404 });

    const endTime = new Date();
    const durationMin = Math.floor((endTime.getTime() - active.start_time.getTime()) / 60000);

    const log = await prisma.timeLog.update({
      where: { id: active.id },
      data: { end_time: endTime, duration_minutes: durationMin },
    });
    return NextResponse.json(log);
  }

  // Check active timer (GET-style via POST)
  if (action === 'check') {
    const active = await prisma.timeLog.findFirst({
      where: { task_id: taskId, user_id: userId, end_time: null },
    });
    return NextResponse.json({ active: active ?? null });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
