import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrgAccess } from '@/lib/auth/get-org';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: taskId, attachmentId } = await params;

  // Verify task belongs to org
  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { org_id: access.orgId } },
    select: { id: true },
  });
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  // Lookup attachment in database
  const attachment = await prisma.taskAttachment.findFirst({
    where: { id: attachmentId, task_id: taskId },
  });
  if (!attachment) return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });

  // Prevent path traversal by strictly resolving base upload directory
  const baseUploadDir = process.env.UPLOAD_DIR || './uploads';
  const resolvedBaseDir = path.resolve(process.cwd(), baseUploadDir);
  const filePath = path.join(resolvedBaseDir, attachment.storage_path);
  const resolvedFilePath = path.resolve(filePath);

  // Validate that resolved path stays within baseUploadDir
  if (!resolvedFilePath.startsWith(resolvedBaseDir + path.sep)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const fileBuffer = await readFile(resolvedFilePath);
    const safeFilename = path.basename(attachment.filename).replace(/"/g, '');

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': attachment.file_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
      },
    });
  } catch (error) {
    console.error('Download attachment error:', error);
    return NextResponse.json({ error: 'File not found on server' }, { status: 404 });
  }
}
