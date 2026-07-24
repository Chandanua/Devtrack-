import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrgAccess } from '@/lib/auth/get-org';

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

  const { name, color } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
  }

  try {
    const tag = await prisma.tag.create({
      data: { name: name.trim(), color: color || 'blue', org_id: access.orgId },
    });
    return NextResponse.json(tag, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Tag already exists' }, { status: 409 });
  }
}
