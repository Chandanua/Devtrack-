import { prisma } from '@/lib/db';
import { emitToUser } from '@/lib/socket/server';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import { sendEmail } from '@/lib/email';
import type { NotificationType } from '@prisma/client';

export interface CreateNotificationItem {
  user_id: string;
  type: NotificationType;
  entity_id: string;
  entity_type: string;
  title: string;
  body?: string | null;
}

/**
 * Centralized helper for creating notifications across DB, WebSockets, and Email.
 */
export async function notifyUsers(notifications: CreateNotificationItem[]): Promise<void> {
  if (!notifications.length) return;

  // 1. Create DB notification records
  await prisma.notification.createMany({ data: notifications });

  // 2. Emit real-time WebSocket notifications
  notifications.forEach((n) => {
    emitToUser(n.user_id, SOCKET_EVENTS.NOTIFICATION_NEW, n);
  });

  // 3. Dispatch emails asynchronously in the background (non-blocking)
  (async () => {
    const userIds = Array.from(new Set(notifications.map((n) => n.user_id)));
    const profiles = await prisma.profile.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    });
    const emailMap = new Map(profiles.map((p) => [p.id, p.email]));

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    await Promise.all(
      notifications.map(async (n) => {
        const recipientEmail = emailMap.get(n.user_id);
        if (!recipientEmail) return;

        const link = n.entity_type === 'task' ? `${baseUrl}/tasks/${n.entity_id}` : baseUrl;

        const html = `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #111827; margin-top: 0; font-size: 18px;">${n.title}</h2>
            ${n.body ? `<p style="color: #374151; font-size: 14px; line-height: 1.5;">${n.body}</p>` : ''}
            <div style="margin: 24px 0;">
              <a href="${link}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
                View in DevTrack
              </a>
            </div>
          </div>
        `;

        try {
          await sendEmail({
            to: recipientEmail,
            subject: `[DevTrack] ${n.title}`,
            html,
          });
        } catch (err) {
          console.error('[notifications] Failed to send email notification:', err);
        }
      })
    );
  })().catch((err) => {
    console.error('[notifications] Background email dispatch error:', err);
  });
}
