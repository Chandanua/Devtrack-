import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireOrgAccess } from '@/lib/auth/get-org';
import { canEdit } from '@/lib/auth/roles';

const timerSchema = z.object({
  action: z.enum(['start', 'stop', 'check']),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canEdit(access.role)) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  const { id: taskId } = await params;

  const body = await req.json();
  const parsed = timerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }
  const { action } = parsed.data;

  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { org_id: access.orgId } },
    select: { id: true },
  });
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const userId = access.userId;

  if (action === 'start') {
    // Check for existing active timer
    const existing = await prisma.timeLog.findFirst({
      where: { task_id: taskId, user_id: userId, end_time: null },
    });
    if (existing) return NextResponse.json({ error: 'Timer already running', log: existing }, { status: 409 });

    try {
      const log = await prisma.timeLog.create({
        data: { task_id: taskId, user_id: userId, start_time: new Date() },
      });
      return NextResponse.json(log, { status: 201 });
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2002') {
        const running = await prisma.timeLog.findFirst({
          where: { task_id: taskId, user_id: userId, end_time: null },
        });
        return NextResponse.json({ error: 'Timer already running', log: running }, { status: 409 });
      }
      throw err;
    }
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
