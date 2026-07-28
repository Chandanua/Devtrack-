import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';

export interface CalendarEventPayload {
  title: string;
  description?: string | null;
  startDate: Date;
  endDate: Date;
}

export interface CalendarEventUpdatePayload {
  title?: string;
  description?: string | null;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Looks up the Google Account row by accountId, decrypts the stored refresh_token,
 * and calls Google's token endpoint to get a fresh access_token.
 */
export async function getValidAccessToken(accountId: string): Promise<string> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { refresh_token: true, provider: true },
  });

  if (!account || account.provider !== 'google') {
    throw new Error('Google Account not found');
  }

  if (!account.refresh_token) {
    throw new Error('No refresh token stored for this Google account');
  }

  const rawRefreshToken = decrypt(account.refresh_token);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      grant_type: 'refresh_token',
      refresh_token: rawRefreshToken,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('[Google Calendar] Failed to refresh access token:', res.status, errorText);

    let isInvalidGrant = false;
    try {
      const errorData = JSON.parse(errorText);
      if (errorData.error === 'invalid_grant') {
        isInvalidGrant = true;
      }
    } catch {
      if (errorText.includes('invalid_grant')) {
        isInvalidGrant = true;
      }
    }

    if (isInvalidGrant) {
      await prisma.account.update({
        where: { id: accountId },
        data: { refresh_token: null },
      });
    }

    throw new Error(`Failed to refresh Google access token: ${res.status}`);
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error('Google token response did not contain access_token');
  }

  return data.access_token;
}

/**
 * Creates a new event in the user's primary Google Calendar.
 */
export async function createCalendarEvent(
  accessToken: string,
  event: CalendarEventPayload
): Promise<string> {
  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: event.title,
      description: event.description || undefined,
      start: {
        dateTime: event.startDate.toISOString(),
      },
      end: {
        dateTime: event.endDate.toISOString(),
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('[Google Calendar] Create event failed:', res.status, errorText);
    throw new Error(`Failed to create Google Calendar event: ${res.status}`);
  }

  const data = await res.json();
  return data.id;
}

/**
 * Updates an existing event in the user's primary Google Calendar.
 */
export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  event: CalendarEventUpdatePayload
): Promise<void> {
  const payload: Record<string, unknown> = {};

  if (event.title !== undefined) payload.summary = event.title;
  if (event.description !== undefined) payload.description = event.description || '';
  if (event.startDate !== undefined) payload.start = { dateTime: event.startDate.toISOString() };
  if (event.endDate !== undefined) payload.end = { dateTime: event.endDate.toISOString() };

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    console.error('[Google Calendar] Update event failed:', res.status, errorText);
    throw new Error(`Failed to update Google Calendar event: ${res.status}`);
  }
}

/**
 * Deletes an event from the user's primary Google Calendar.
 */
export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok && res.status !== 404) {
    const errorText = await res.text();
    console.error('[Google Calendar] Delete event failed:', res.status, errorText);
    throw new Error(`Failed to delete Google Calendar event: ${res.status}`);
  }
}
