import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcryptjs';
import { v4 as uuid } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding DevTrack database...');

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
      job_title: 'Senior QA Engineer',
      avatar_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Priya',
      availability: 'busy',
    },
  });

  const designer = await prisma.profile.create({
    data: {
      id: designerId,
      email: 'nina@devtrack.io',
      password_hash: hashSync('nina123', 12),
      full_name: 'Nina Petrova',
      role: 'designer',
      job_title: 'Lead UI/UX Designer',
      avatar_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Nina',
      availability: 'available',
    },
  });

  const lead = await prisma.profile.create({
    data: {
      id: leadId,
      email: 'marcus@devtrack.io',
      password_hash: hashSync('marcus123', 12),
      full_name: 'Marcus Chen',
      role: 'team_lead',
      job_title: 'Tech Lead — Platform',
      avatar_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Marcus',
      availability: 'away',
    },
  });

  const devOps = await prisma.profile.create({
    data: {
      id: devOpsId,
      email: 'sam@devtrack.io',
      password_hash: hashSync('sam123', 12),
      full_name: 'Sam Nakamura',
      role: 'developer',
      job_title: 'DevOps Engineer',
      avatar_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Sam',
      availability: 'available',
    },
  });

  console.log('  ✅ Created 6 users');

  // ── Team ──────────────────────────────────────────
  const team = await prisma.team.create({
    data: {
      name: 'Core Engineering',
      description: 'Main product development team',
      created_by: adminId,
      members: {
        create: [
          { user_id: adminId, role_within_team: 'lead' },
          { user_id: devId, role_within_team: 'member' },
          { user_id: qaId, role_within_team: 'member' },
          { user_id: designerId, role_within_team: 'member' },
          { user_id: leadId, role_within_team: 'lead' },
          { user_id: devOpsId, role_within_team: 'member' },
        ],
      },
    },
  });

  console.log('  ✅ Created team with 6 members');

  // ── Tags ──────────────────────────────────────────
  const tagData = [
    { name: 'Bug', color: 'red' },
    { name: 'Feature', color: 'blue' },
    { name: 'Improvement', color: 'violet' },
    { name: 'Documentation', color: 'cyan' },
    { name: 'Design', color: 'pink' },
    { name: 'Performance', color: 'amber' },
    { name: 'Security', color: 'orange' },
    { name: 'DevOps', color: 'green' },
  ];

  const tags: Record<string, string> = {};
  for (const t of tagData) {
    const tag = await prisma.tag.create({ data: t });
    tags[t.name] = tag.id;
  }

  console.log('  ✅ Created 8 tags');

  // ── Projects ──────────────────────────────────────
  const proj1 = await prisma.project.create({
    data: {
      name: 'DevTrack Platform',
      description: 'Main product — the task management platform itself.',
      status: 'active',
      progress: 45,
      team_id: team.id,
      created_by: adminId,
      start_date: new Date('2026-06-01'),
      end_date: new Date('2026-12-31'),
      client_name: 'Internal',
    },
  });

  const proj2 = await prisma.project.create({
    data: {
      name: 'Mobile App v2',
      description: 'React Native mobile companion app for DevTrack.',
      status: 'planning',
      progress: 10,
      team_id: team.id,
      created_by: adminId,
      start_date: new Date('2026-08-01'),
      end_date: new Date('2027-03-31'),
      client_name: 'Product Team',
    },
  });

  console.log('  ✅ Created 2 projects');

  // ── Tasks ─────────────────────────────────────────
  const taskDefs = [
    { title: 'Set up CI/CD pipeline', status: 'completed' as const, priority: 'high' as const, project_id: proj1.id, due: -10, tags: ['DevOps'], assignee: devOpsId },
    { title: 'Design dashboard layout', status: 'completed' as const, priority: 'medium' as const, project_id: proj1.id, due: -7, tags: ['Design'], assignee: designerId },
    { title: 'Implement JWT authentication', status: 'completed' as const, priority: 'critical' as const, project_id: proj1.id, due: -5, tags: ['Security', 'Feature'], assignee: devId },
    { title: 'Build Kanban board with drag & drop', status: 'in_progress' as const, priority: 'high' as const, project_id: proj1.id, due: 3, tags: ['Feature'], assignee: devId },
    { title: 'Add dark mode support', status: 'in_progress' as const, priority: 'medium' as const, project_id: proj1.id, due: 5, tags: ['Design', 'Improvement'], assignee: designerId },
    { title: 'Write API documentation', status: 'todo' as const, priority: 'medium' as const, project_id: proj1.id, due: 7, tags: ['Documentation'], assignee: leadId },
    { title: 'Fix calendar timezone bug', status: 'todo' as const, priority: 'high' as const, project_id: proj1.id, due: 4, tags: ['Bug'], assignee: qaId },
    { title: 'Optimize database queries', status: 'backlog' as const, priority: 'medium' as const, project_id: proj1.id, due: 14, tags: ['Performance'], assignee: leadId },
    { title: 'Add email notifications', status: 'backlog' as const, priority: 'low' as const, project_id: proj1.id, due: 21, tags: ['Feature'], assignee: devOpsId },
    { title: 'Code review automation', status: 'code_review' as const, priority: 'medium' as const, project_id: proj1.id, due: 2, tags: ['DevOps', 'Improvement'], assignee: devOpsId },
    { title: 'Mobile app wireframes', status: 'todo' as const, priority: 'high' as const, project_id: proj2.id, due: 10, tags: ['Design'], assignee: designerId },
    { title: 'Set up React Native project', status: 'backlog' as const, priority: 'medium' as const, project_id: proj2.id, due: 15, tags: ['Feature'], assignee: devId },
    { title: 'Write end-to-end test suite', status: 'in_progress' as const, priority: 'high' as const, project_id: proj1.id, due: 6, tags: ['Bug', 'Improvement'], assignee: qaId },
    { title: 'Audit accessibility (WCAG 2.1)', status: 'todo' as const, priority: 'medium' as const, project_id: proj1.id, due: 12, tags: ['Design', 'Documentation'], assignee: qaId },
    { title: 'Infrastructure monitoring setup', status: 'in_progress' as const, priority: 'high' as const, project_id: proj1.id, due: 8, tags: ['DevOps', 'Security'], assignee: devOpsId },
    { title: 'Refactor state management', status: 'code_review' as const, priority: 'medium' as const, project_id: proj1.id, due: 3, tags: ['Improvement', 'Performance'], assignee: leadId },
  ];

  const createdTasks: string[] = [];
  for (let i = 0; i < taskDefs.length; i++) {
    const t = taskDefs[i];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + t.due);

    const task = await prisma.task.create({
      data: {
        title: t.title,
        status: t.status,
        priority: t.priority,
        project_id: t.project_id,
        created_by: adminId,
        due_date: dueDate,
        order_index: i,
        estimated_minutes: Math.floor(Math.random() * 480 + 60),
      },
    });

    createdTasks.push(task.id);

    // Assign
    await prisma.taskAssignee.create({ data: { task_id: task.id, user_id: t.assignee } });

    // Tags
    for (const tagName of t.tags) {
      if (tags[tagName]) {
        await prisma.taskTag.create({ data: { task_id: task.id, tag_id: tags[tagName] } });
      }
    }

    // Activity
    await prisma.activityLog.create({
      data: { task_id: task.id, user_id: adminId, action: 'created', metadata: { title: t.title } },
    });
  }

  console.log(`  ✅ Created ${taskDefs.length} tasks with tags & assignments`);

  // ── Subtasks ──────────────────────────────────────
  const kanbanTask = createdTasks[3]; // "Build Kanban board"
  const subtaskTitles = ['Create column components', 'Implement drag handlers', 'Add task card animations'];
  for (let i = 0; i < subtaskTitles.length; i++) {
    await prisma.task.create({
      data: {
        title: subtaskTitles[i],
        project_id: proj1.id,
        parent_task_id: kanbanTask,
        status: i === 0 ? 'completed' : 'todo',
        priority: 'medium',
        created_by: devId,
        order_index: i,
      },
    });
  }

  console.log('  ✅ Created 3 subtasks');

  // ── Comments ──────────────────────────────────────
  const comment1 = await prisma.comment.create({
    data: { task_id: kanbanTask, author_id: adminId, body: 'Looking great so far! Can we add smooth spring animations to the card drop?' },
  });

  await prisma.comment.create({
    data: { task_id: kanbanTask, author_id: devId, body: "Sure! I'll use Framer Motion's layoutId for that. Should be smooth." },
  });

  await prisma.commentReaction.create({
    data: { comment_id: comment1.id, user_id: devId, emoji: '🚀' },
  });

  console.log('  ✅ Created comments & reactions');

  // ── Time Logs ─────────────────────────────────────
  const timeLogTask = createdTasks[0]; // "Set up CI/CD pipeline"
  const now = new Date();
  await prisma.timeLog.create({
    data: {
      task_id: timeLogTask,
      user_id: devId,
      start_time: new Date(now.getTime() - 3 * 3600000),
      end_time: new Date(now.getTime() - 1.5 * 3600000),
      duration_minutes: 90,
    },
  });

  await prisma.timeLog.create({
    data: {
      task_id: createdTasks[2],
      user_id: devId,
      start_time: new Date(now.getTime() - 26 * 3600000),
      end_time: new Date(now.getTime() - 24 * 3600000),
      duration_minutes: 120,
    },
  });

  console.log('  ✅ Created time logs');

  // ── Notifications ─────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { user_id: devId, type: 'task_assigned', title: 'You were assigned to a task', body: 'Build Kanban board with drag & drop', entity_type: 'task', entity_id: kanbanTask },
      { user_id: adminId, type: 'status_change', title: 'Task status updated', body: 'Set up CI/CD pipeline: in_progress → completed', entity_type: 'task', entity_id: timeLogTask },
      { user_id: devId, type: 'comment_mention', title: 'New comment on your task', body: 'Looking great so far! Can we add smooth spring animations...', entity_type: 'task', entity_id: kanbanTask },
    ],
  });

  console.log('  ✅ Created notifications');
  console.log('\n🎉 Seed complete!');
  console.log('\n📋 Login credentials:');
  console.log('   Admin:     admin@devtrack.io / admin123');
  console.log('   Developer: dev@devtrack.io   / dev123');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
