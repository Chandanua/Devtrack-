import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { emitToOrg, emitToUser } from '@/lib/socket/server';
import { SOCKET_EVENTS } from '@/lib/socket/events';

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'devtrack_webhook_secret_key_123';

function verifySignature(payloadText: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const sha256Prefix = 'sha256=';
  if (!signatureHeader.startsWith(sha256Prefix)) return false;

  const sigHex = signatureHeader.slice(sha256Prefix.length);
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = Buffer.from(hmac.update(payloadText).digest('hex'), 'utf8');
  const checksum = Buffer.from(sigHex, 'utf8');

  if (checksum.length !== digest.length) return false;
  return crypto.timingSafeEqual(digest, checksum);
}

// Extract valid UUID task IDs from text (title, body, or branch name)
function extractTaskIds(text: string): string[] {
  if (!text) return [];
  const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
  const matches = text.match(uuidRegex) || [];
  return Array.from(new Set(matches));
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // Signature verification (in production or if header provided)
    if (signature && !verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
    }

    const event = request.headers.get('x-github-event');
    const payload = JSON.parse(rawBody);

    if (event === 'ping') {
      return NextResponse.json({ message: 'GitHub webhook ping received successfully' });
    }

    if (event === 'pull_request') {
      const { action, pull_request, repository } = payload;
      if (!pull_request) return NextResponse.json({ message: 'No PR data' });

      const prTitle = pull_request.title || '';
      const prBody = pull_request.body || '';
      const branchName = pull_request.head?.ref || '';
      const prNumber = pull_request.number;
      const prUrl = pull_request.html_url;
      const isMerged = pull_request.merged === true;
      const repoFullName = repository?.full_name || 'github/repo';
      const authorGithub = pull_request.user?.login || 'unknown';

      let prState = 'open';
      if (action === 'closed') {
        prState = isMerged ? 'merged' : 'closed';
      }

      // Find referenced task IDs from title, body, and branch
      const searchText = `${prTitle} ${prBody} ${branchName}`;
      const taskIds = extractTaskIds(searchText);

      if (taskIds.length === 0) {
        return NextResponse.json({ message: 'No DevTrack task IDs referenced in PR' });
      }

      const updatedTasks = [];

      for (const taskId of taskIds) {
        const task = await prisma.task.findUnique({
          where: { id: taskId },
          include: { project: true },
        });

        if (!task) continue;

        // Upsert PR Link
        await prisma.taskGitHubLink.upsert({
          where: {
            task_id_pr_number_repo_full_name: {
              task_id: taskId,
              pr_number: prNumber,
              repo_full_name: repoFullName,
            },
          },
          update: {
            pr_title: prTitle,
            pr_url: prUrl,
            pr_state: prState,
            branch_name: branchName,
            author_github: authorGithub,
          },
          create: {
            task_id: taskId,
            pr_number: prNumber,
            pr_title: prTitle,
            pr_url: prUrl,
            pr_state: prState,
            branch_name: branchName,
            repo_full_name: repoFullName,
            author_github: authorGithub,
          },
        });

        // Determine new task status
        let newStatus: string | null = null;
        if (action === 'opened' || action === 'reopened') {
          newStatus = 'code_review';
        } else if (action === 'closed' && isMerged) {
          newStatus = 'completed';
        }

        if (newStatus && newStatus !== task.status) {
          const updated = await prisma.task.update({
            where: { id: taskId },
            data: { status: newStatus as any },
          });

          // Log Activity
          await prisma.activityLog.create({
            data: {
              task_id: taskId,
              user_id: task.created_by,
              action: 'github_pr_update',
              metadata: {
                pr_number: prNumber,
                pr_action: action,
                is_merged: isMerged,
                from_status: task.status,
                to_status: newStatus,
                author: authorGithub,
              },
            },
          });

          // Broadcast Socket.io event to Org
          const fullTask = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
              project: { select: { id: true, name: true } },
              assignees: { include: { profile: true } },
              tags: { include: { tag: true } },
              _count: { select: { comments: true, subtasks: true, attachments: true, assignees: true } },
            },
          });

          if (fullTask) {
            const mapped = {
              ...fullTask,
              assignees: fullTask.assignees.map((a) => a.profile),
              tags: fullTask.tags.map((tt) => tt.tag),
            };
            emitToOrg(task.project.org_id, SOCKET_EVENTS.TASK_UPDATED, mapped);
          }

          updatedTasks.push(updated.id);
        }
      }

      return NextResponse.json({
        message: 'GitHub PR event processed',
        processed_tasks: taskIds,
        updated_tasks: updatedTasks,
      });
    }

    return NextResponse.json({ message: 'Event ignored' });
  } catch (error) {
    console.error('GitHub Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
