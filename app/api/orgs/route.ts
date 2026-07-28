import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/auth/get-user';
import { slugify } from '@/lib/auth/oauth';

const createOrgSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
});

// List all orgs the current user belongs to
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const memberships = await prisma.orgMembership.findMany({
    where: { user_id: userId },
    include: {
      org: {
        include: {
          _count: { select: { members: true, projects: true } },
        },
      },
    },
    orderBy: { created_at: 'asc' },
  });

  const orgs = memberships.map((m) => ({
    id: m.org.id,
    name: m.org.name,
    slug: m.org.slug,
    logo_url: m.org.logo_url,
    role: m.role,
    member_count: m.org._count.members,
    project_count: m.org._count.projects,
  }));

  return NextResponse.json(orgs);
}

// Create a new organization
export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = createOrgSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }
    const name = parsed.data.name.trim();

    let slug = slugify(name);

    // Ensure unique slug
    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const org = await prisma.organization.create({
      data: {
        name: name.trim(),
        slug,
        members: {
          create: { user_id: userId, role: 'owner' },
        },
      },
    });

    return NextResponse.json(org, { status: 201 });
  } catch (error) {
    console.error('Create org error:', error);
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
  }
}
