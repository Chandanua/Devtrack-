import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireOrgAccess } from '@/lib/auth/get-org';
import { can } from '@/lib/auth/roles';

const createTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required'),
  color: z.string().optional(),
});

export async function GET() {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tags = await prisma.tag.findMany({
    where: { org_id: access.orgId },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(tags);
}

export async function POST(request: Request) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!can(access.role, 'manage_tags')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createTagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }
  const { name, color } = parsed.data;

  try {
    const tag = await prisma.tag.create({
      data: { name: name.trim(), color: color || 'blue', org_id: access.orgId },
    });
    return NextResponse.json(tag, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Tag already exists' }, { status: 409 });
  }
}
