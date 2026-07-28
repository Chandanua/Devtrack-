import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrgAccess } from '@/lib/auth/get-org';
import { canEdit } from '@/lib/auth/roles';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv',
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg',
  'zip',
]);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/csv',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/zip',
  'application/x-zip-compressed',
]);

const DISALLOWED_EXTENSIONS = new Set([
  'exe', 'sh', 'bat', 'cmd', 'js', 'html', 'htm', 'php', 'py', 'rb', 'pl', 'vbs', 'jar', 'msi', 'ps1', 'com', 'scr', 'dll', 'so', 'dylib', 'bash', 'zsh',
]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canEdit(access.role)) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  const { id: taskId } = await params;

  // Verify task belongs to org
  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { org_id: access.orgId } },
    select: { id: true },
  });
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });

    // Sanitize filename to prevent path traversal
    const rawBaseName = path.basename(file.name);
    const sanitizedName = rawBaseName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '');
    const safeName = sanitizedName || 'attachment';

    const ext = safeName.split('.').pop()?.toLowerCase() || '';
    const mimeType = (file.type || '').toLowerCase().trim();

    if (!ext || DISALLOWED_EXTENSIONS.has(ext) || !ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed formats: pdf, doc, docx, xls, xlsx, ppt, pptx, txt, csv, png, jpg, jpeg, gif, webp, svg, zip' },
        { status: 400 }
      );
    }

    if (mimeType && (mimeType.includes('script') || mimeType.includes('executable') || mimeType.includes('html') || mimeType.includes('javascript') || !ALLOWED_MIME_TYPES.has(mimeType))) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed formats: pdf, doc, docx, xls, xlsx, ppt, pptx, txt, csv, png, jpg, jpeg, gif, webp, svg, zip' },
        { status: 400 }
      );
    }

    const filename = `${Date.now()}-${safeName}`;

    const baseUploadDir = process.env.UPLOAD_DIR || './uploads';
    const uploadDir = path.join(process.cwd(), baseUploadDir, taskId);
    const resolvedUploadDir = path.resolve(uploadDir);

    const filePath = path.join(resolvedUploadDir, filename);
    const resolvedFilePath = path.resolve(filePath);

    // Verify resolved path stays strictly under uploadDir
    if (!resolvedFilePath.startsWith(resolvedUploadDir + path.sep)) {
      return NextResponse.json({ error: 'Invalid file name' }, { status: 400 });
    }

    await mkdir(resolvedUploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(resolvedFilePath, buffer);

    const storagePath = `${taskId}/${filename}`;
    const attachment = await prisma.taskAttachment.create({
      data: {
        task_id: taskId,
        filename: safeName,
        storage_path: storagePath,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: access.userId,
      },
    });
    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
