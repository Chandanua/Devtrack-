import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcryptjs';
import { v4 as uuid } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding DevTrack database...');

  // ── Organization ──────────────────────────────────
  const orgId = uuid();
  const org = await prisma.organization.create({
    data: {
      id: orgId,
      name: 'DevTrack HQ',
      slug: 'devtrack-hq',
    },
  });
  console.log('✅ Organization created:', org.name);

  // ── Users ─────────────────────────────────────────
  const adminId = uuid();
  const devId = uuid();
  const qaId = uuid();
  const designerId = uuid();
  const leadId = uuid();
  const devOpsId = uuid();

  const admin = await prisma.profile.create({
    data: {
      id: adminId,
      email: 'admin@devtrack.io',
      password_hash: hashSync('admin123', 12),
      full_name: 'Alex Morgan',
      role: 'project_manager',
      job_title: 'Engineering Manager',
      avatar_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Alex',
      availability: 'available',
    },
  });

  const dev = await prisma.profile.create({
    data: {
      id: devId,
      email: 'dev@devtrack.io',
      password_hash: hashSync('dev123', 12),
      full_name: 'Jordan Lee',
      role: 'developer',
      job_title: 'Full Stack Developer',
      avatar_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Jordan',
      availability: 'available',
    },
  });

  const qa = await prisma.profile.create({
    data: {
      id: qaId,
      email: 'priya@devtrack.io',
      password_hash: hashSync('priya123', 12),
      full_name: 'Priya Sharma',
      role: 'qa_tester',
      job_title: 'QA Engineer',
      avatar_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Priya',
      availability: 'available',
    },
  });

  const designer = await prisma.profile.create({
    data: {
      id: designerId,
      email: 'maya@devtrack.io',
      password_hash: hashSync('maya123', 12),
      full_name: 'Maya Chen',
      role: 'designer',
      job_title: 'UI/UX Designer',
      avatar_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Maya',
      availability: 'available',
    },
  });

  const lead = await prisma.profile.create({
    data: {
      id: leadId,
      email: 'sam@devtrack.io',
      password_hash: hashSync('sam123', 12),
      full_name: 'Sam Wilson',
      role: 'team_lead',
      job_title: 'Tech Lead',
      avatar_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Sam',
      availability: 'busy',
    },
  });

  const devOps = await prisma.profile.create({
    data: {
      id: devOpsId,
      email: 'riley@devtrack.io',
      password_hash: hashSync('riley123', 12),
      full_name: 'Riley Brooks',
      role: 'developer',
      job_title: 'DevOps Engineer',
      avatar_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Riley',
      availability: 'available',
    },
  });

  console.log('✅ Users created');

  // ── Org Memberships ───────────────────────────────
  await prisma.orgMembership.createMany({
    data: [
      { org_id: orgId, user_id: adminId, role: 'owner' },
      { org_id: orgId, user_id: leadId, role: 'admin' },
      { org_id: orgId, user_id: devId, role: 'member' },
      { org_id: orgId, user_id: qaId, role: 'member' },
      { org_id: orgId, user_id: designerId, role: 'member' },
      { org_id: orgId, user_id: devOpsId, role: 'member' },
    ],
  });
  console.log('✅ Org memberships created');

  // ── Teams ─────────────────────────────────────────
  const frontendTeamId = uuid();
  const backendTeamId = uuid();

  await prisma.team.create({
    data: {
      id: frontendTeamId,
      name: 'Frontend',
      description: 'UI/UX and frontend development',
      org_id: orgId,
      created_by: adminId,
      members: {
        create: [
          { user_id: devId, role_within_team: 'lead' },
          { user_id: designerId, role_within_team: 'member' },
        ],
      },
    },
  });

  await prisma.team.create({
    data: {
      id: backendTeamId,
      name: 'Backend',
      description: 'API and infrastructure',
      org_id: orgId,
      created_by: adminId,
      members: {
        create: [
          { user_id: leadId, role_within_team: 'lead' },
          { user_id: devOpsId, role_within_team: 'member' },
        ],
      },
    },
  });
  console.log('✅ Teams created');

  // ── Tags (scoped to org) ──────────────────────────
  const tags = await Promise.all([
    prisma.tag.create({ data: { name: 'bug', color: 'red', org_id: orgId } }),
    prisma.tag.create({ data: { name: 'feature', color: 'blue', org_id: orgId } }),
    prisma.tag.create({ data: { name: 'improvement', color: 'green', org_id: orgId } }),
    prisma.tag.create({ data: { name: 'documentation', color: 'amber', org_id: orgId } }),
    prisma.tag.create({ data: { name: 'performance', color: 'violet', org_id: orgId } }),
    prisma.tag.create({ data: { name: 'security', color: 'red', org_id: orgId } }),
    prisma.tag.create({ data: { name: 'design', color: 'pink', org_id: orgId } }),
    prisma.tag.create({ data: { name: 'devops', color: 'cyan', org_id: orgId } }),
  ]);
  console.log('✅ Tags created');

  // ── Projects (scoped to org) ──────────────────────
  const projAlpha = await prisma.project.create({
    data: {
      name: 'Project Alpha',
      description: 'Main SaaS product — next-gen analytics dashboard with real-time data visualization',
      client_name: 'Internal',
      status: 'active',
      start_date: new Date('2025-01-15'),
      end_date: new Date('2025-06-30'),
      org_id: orgId,
      team_id: frontendTeamId,
      created_by: adminId,
      progress: 42,
    },
  });

  const projBeta = await prisma.project.create({
    data: {
      name: 'API Gateway v2',
      description: 'Rebuild the API gateway with rate limiting, caching, and improved auth',
      client_name: 'Platform Team',
      status: 'active',
      start_date: new Date('2025-02-01'),
      end_date: new Date('2025-05-31'),
      org_id: orgId,
      team_id: backendTeamId,
      created_by: leadId,
      progress: 65,
    },
  });

  const projGamma = await prisma.project.create({
    data: {
      name: 'Mobile App',
      description: 'React Native companion app for the main platform',
      status: 'planning',
      start_date: new Date('2025-04-01'),
      org_id: orgId,
      created_by: adminId,
      progress: 5,
    },
  });
  console.log('✅ Projects created');

  // ── Sprints ───────────────────────────────────────
  const sprint1 = await prisma.sprint.create({
    data: {
      project_id: projAlpha.id,
      name: 'Sprint 7 — Dashboard Revamp',
      goal: 'Redesign the analytics dashboard with new chart components',
      start_date: new Date('2025-03-10'),
      end_date: new Date('2025-03-24'),
      status: 'active',
    },
  });

  await prisma.sprint.create({
    data: {
      project_id: projBeta.id,
      name: 'Sprint 4 — Rate Limiter',
      goal: 'Implement token-bucket rate limiting and Redis caching layer',
      start_date: new Date('2025-03-03'),
      end_date: new Date('2025-03-17'),
      status: 'active',
    },
  });
  console.log('✅ Sprints created');

  // ── Tasks ─────────────────────────────────────────
  const tasks = [
    {
      title: 'Design new dashboard wireframes',
      description: 'Create low-fidelity wireframes for the revamped analytics dashboard. Include desktop and tablet breakpoints.',
      status: 'completed' as const,
      priority: 'high' as const,
      project_id: projAlpha.id,
      created_by: adminId,
      sprint_id: sprint1.id,
      assignees: [designerId],
      tags: [tags[6].id],
      due_date: new Date('2025-03-12'),
      order_index: 0,
    },
    {
      title: 'Implement chart component library',
      description: 'Build reusable React chart components using Recharts — bar, line, pie, area, and sparkline.',
      status: 'in_progress' as const,
      priority: 'critical' as const,
      project_id: projAlpha.id,
      created_by: leadId,
      sprint_id: sprint1.id,
      assignees: [devId],
      tags: [tags[1].id],
      due_date: new Date('2025-03-18'),
      order_index: 1,
    },
    {
      title: 'Fix date picker timezone bug',
      description: 'Date picker shows wrong dates for users in negative UTC offsets. Investigate and fix.',
      status: 'todo' as const,
      priority: 'high' as const,
      project_id: projAlpha.id,
      created_by: qaId,
      assignees: [devId],
      tags: [tags[0].id],
      due_date: new Date('2025-03-15'),
      order_index: 2,
    },
    {
      title: 'Set up Redis caching layer',
      description: 'Configure Redis for API response caching. Implement cache invalidation strategies for data consistency.',
      status: 'in_progress' as const,
      priority: 'critical' as const,
      project_id: projBeta.id,
      created_by: leadId,
      assignees: [devOpsId],
      tags: [tags[4].id, tags[7].id],
      due_date: new Date('2025-03-14'),
      order_index: 0,
    },
    {
      title: 'Write API documentation',
      description: 'Document all API endpoints using OpenAPI/Swagger. Include request/response examples.',
      status: 'backlog' as const,
      priority: 'medium' as const,
      project_id: projBeta.id,
      created_by: adminId,
      assignees: [devId],
      tags: [tags[3].id],
      order_index: 1,
    },
    {
      title: 'Security audit: auth endpoints',
      description: 'Review all authentication endpoints for OWASP top-10 vulnerabilities. Test rate limiting on login.',
      status: 'todo' as const,
      priority: 'critical' as const,
      project_id: projBeta.id,
      created_by: leadId,
      assignees: [qaId],
      tags: [tags[5].id],
      due_date: new Date('2025-03-20'),
      order_index: 2,
    },
    {
      title: 'Create mobile app project structure',
      description: 'Initialize React Native project with Expo. Set up navigation, state management, and theme system.',
      status: 'todo' as const,
      priority: 'medium' as const,
      project_id: projGamma.id,
      created_by: adminId,
      assignees: [devId, designerId],
      tags: [tags[1].id],
      order_index: 0,
    },
    {
      title: 'Performance: optimize dashboard queries',
      description: 'Dashboard load time exceeds 3s. Profile SQL queries and add appropriate indexes.',
      status: 'blocked' as const,
      priority: 'high' as const,
      project_id: projAlpha.id,
      created_by: devId,
      assignees: [devOpsId, leadId],
      tags: [tags[4].id],
      due_date: new Date('2025-03-22'),
      order_index: 3,
    },
  ];

  for (const taskData of tasks) {
    const { assignees, tags: tagIds, ...data } = taskData;
    const task = await prisma.task.create({ data });

    if (assignees?.length) {
      await prisma.taskAssignee.createMany({
        data: assignees.map((uid) => ({ task_id: task.id, user_id: uid })),
      });
    }
    if (tagIds?.length) {
      await prisma.taskTag.createMany({
        data: tagIds.map((tid) => ({ task_id: task.id, tag_id: tid })),
      });
    }

    // Activity log
    await prisma.activityLog.create({
      data: {
        task_id: task.id,
        user_id: taskData.created_by,
        action: 'created',
        metadata: { title: task.title },
      },
    });
  }
  console.log('✅ Tasks created with assignees, tags & activity');

  // ── Comments ──────────────────────────────────────
  const firstTask = await prisma.task.findFirst({ where: { project_id: projAlpha.id }, orderBy: { order_index: 'asc' } });
  if (firstTask) {
    const comment = await prisma.comment.create({
      data: {
        task_id: firstTask.id,
        author_id: designerId,
        body: 'Wireframes are ready for review. I\'ve included both desktop and tablet layouts. Let me know if we need mobile as well.',
      },
    });
    await prisma.commentReaction.create({
      data: { comment_id: comment.id, user_id: adminId, emoji: '👍' },
    });
    await prisma.comment.create({
      data: {
        task_id: firstTask.id,
        author_id: adminId,
        body: 'Looks great! Let\'s go ahead with implementation. @Jordan — can you pick up the chart components next?',
      },
    });
  }
  console.log('✅ Comments & reactions created');

  // ── Notifications ─────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        user_id: devId,
        type: 'task_assigned',
        title: 'New task assigned',
        body: 'You were assigned to "Implement chart component library"',
        entity_type: 'task',
        read: false,
      },
      {
        user_id: qaId,
        type: 'task_assigned',
        title: 'New task assigned',
        body: 'You were assigned to "Security audit: auth endpoints"',
        entity_type: 'task',
        read: false,
      },
      {
        user_id: devOpsId,
        type: 'deadline_approaching',
        title: 'Deadline approaching',
        body: '"Set up Redis caching layer" is due in 2 days',
        entity_type: 'task',
        read: true,
      },
    ],
  });
  console.log('✅ Notifications created');

  // ── Time Logs ─────────────────────────────────────
  const chartTask = await prisma.task.findFirst({ where: { title: { contains: 'chart component' } } });
  if (chartTask) {
    await prisma.timeLog.create({
      data: {
        task_id: chartTask.id,
        user_id: devId,
        start_time: new Date('2025-03-13T09:00:00'),
        end_time: new Date('2025-03-13T12:30:00'),
        duration_minutes: 210,
        description: 'Built bar and line chart components',
      },
    });
    await prisma.timeLog.create({
      data: {
        task_id: chartTask.id,
        user_id: devId,
        start_time: new Date('2025-03-13T13:30:00'),
        end_time: new Date('2025-03-13T17:00:00'),
        duration_minutes: 210,
        description: 'Built pie chart and sparkline components',
      },
    });
  }
  console.log('✅ Time logs created');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Login credentials:');
  console.log('   admin@devtrack.io / admin123  (Owner)');
  console.log('   dev@devtrack.io   / dev123    (Member)');
  console.log('   priya@devtrack.io / priya123  (Member)');
  console.log('   maya@devtrack.io  / maya123   (Member)');
  console.log('   sam@devtrack.io   / sam123    (Admin)');
  console.log('   riley@devtrack.io / riley123  (Member)');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
