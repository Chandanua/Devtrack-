import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { SOCKET_EVENTS, type OnlineUser } from './events';
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db';

let io: SocketIOServer | null = null;
const activeUsers = new Map<string, { socketId: string; user: OnlineUser }>();

export function initSocketServer(server: HTTPServer): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(server, {
    path: '/api/socket/io',
    addTrailingSlash: false,
    cors: {
      origin: '*',
      credentials: true,
    },
  });

  // Authentication middleware for sockets
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie || '';
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map((c) => {
          const [key, ...v] = c.split('=');
          return [key, decodeURIComponent(v.join('='))];
        })
      );

      const token = cookies[COOKIE_NAME];
      if (!token) return next(new Error('Unauthorized socket connection'));

      const payload = await verifyToken(token);
      if (!payload?.userId) return next(new Error('Invalid token'));

      const profile = await prisma.profile.findUnique({
        where: { id: payload.userId },
        select: { id: true, full_name: true, avatar_url: true },
      });

      if (!profile) return next(new Error('User not found'));

      socket.data.user = {
        userId: profile.id,
        fullName: profile.full_name,
        avatarUrl: profile.avatar_url,
      };

      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;

    // Join Org Room
    socket.on(SOCKET_EVENTS.JOIN_ORG, ({ orgId }: { orgId: string }) => {
      if (!orgId) return;

      const roomName = `org:${orgId}`;
      socket.join(roomName);

      const onlineUserData: OnlineUser = {
        userId: user.userId,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        orgId,
      };

      activeUsers.set(socket.id, { socketId: socket.id, user: onlineUserData });
      emitPresenceUpdate(orgId);
    });

    // Leave Org Room
    socket.on(SOCKET_EVENTS.LEAVE_ORG, ({ orgId }: { orgId: string }) => {
      if (!orgId) return;
      socket.leave(`org:${orgId}`);
      activeUsers.delete(socket.id);
      emitPresenceUpdate(orgId);
    });

    // Join Task Room (for live comments)
    socket.on(SOCKET_EVENTS.JOIN_TASK, ({ taskId }: { taskId: string }) => {
      if (!taskId) return;
      socket.join(`task:${taskId}`);
    });

    // Leave Task Room
    socket.on(SOCKET_EVENTS.LEAVE_TASK, ({ taskId }: { taskId: string }) => {
      if (!taskId) return;
      socket.leave(`task:${taskId}`);
    });

    socket.on('disconnect', () => {
      const active = activeUsers.get(socket.id);
      if (active) {
        const { orgId } = active.user;
        activeUsers.delete(socket.id);
        emitPresenceUpdate(orgId);
      }
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

function emitPresenceUpdate(orgId: string) {
  if (!io) return;
  const orgUsers: OnlineUser[] = [];
  const seenUserIds = new Set<string>();

  for (const item of activeUsers.values()) {
    if (item.user.orgId === orgId && !seenUserIds.has(item.user.userId)) {
      seenUserIds.add(item.user.userId);
      orgUsers.push(item.user);
    }
  }

  io.to(`org:${orgId}`).emit(SOCKET_EVENTS.PRESENCE_UPDATE, orgUsers);
}

export function emitToOrg(orgId: string, event: string, payload: any) {
  if (io) {
    io.to(`org:${orgId}`).emit(event, payload);
  }
}

export function emitToUser(userId: string, event: string, payload: any) {
  if (io) {
    for (const item of activeUsers.values()) {
      if (item.user.userId === userId) {
        io.to(item.socketId).emit(event, payload);
      }
    }
  }
}

export function emitToTask(taskId: string, event: string, payload: any) {
  if (io) {
    io.to(`task:${taskId}`).emit(event, payload);
  }
}
