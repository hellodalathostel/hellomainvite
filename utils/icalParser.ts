import type { Booking } from '../types/types';
import { getDaysDiff, isOverlap } from './utils.ts';

export interface ParsedIcalEvent {
  uid: string;
  summary: string;
  description: string;
  checkIn: string;
  checkOut: string;
  status: string;
  guestName?: string;
  otaBookingNumber?: string;
}

export interface BookingComImportPreviewItem {
  uid: string;
  roomId: string;
  roomName: string;
  summary: string;
  description: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  status: string;
  guestName?: string;
  otaBookingNumber?: string;
  existingBookingId?: string;
  conflictBookingId?: string;
  action: 'create' | 'update' | 'conflict' | 'ignore';
  actionLabel: string;
}

const GENERIC_SUMMARY_VALUES = new Set([
  'reserved',
  'reservation',
  'booking.com',
  'booked',
  'unavailable',
  'not available',
]);

const unfoldIcalLines = (content: string): string[] => {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lines: string[] = [];

  normalized.forEach((line) => {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
      return;
    }

    lines.push(line);
  });

  return lines;
};

const decodeIcalText = (value: string): string => {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
};

const toIsoDate = (value?: string): string | null => {
  if (!value) return null;

  const match = value.match(/(\d{8})/);
  if (!match) return null;

  const raw = match[1];
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
};

const extractBookingNumber = (...values: Array<string | undefined>) => {
  for (const value of values) {
    const match = value?.match(/\b\d{8,12}\b/);
    if (match) return match[0];
  }

  return undefined;
};

const deriveGuestName = (summary: string, description: string): string | undefined => {
  const summaryText = summary.trim();
  if (summaryText) {
    const normalized = summaryText.toLowerCase();
    if (!GENERIC_SUMMARY_VALUES.has(normalized)) {
      return summaryText;
    }
  }

  const firstMeaningfulLine = description
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line && !/^booking(\.com)?$/i.test(line));

  return firstMeaningfulLine || undefined;
};

export const parseIcalEvents = (content: string): ParsedIcalEvent[] => {
  const lines = unfoldIcalLines(content);
  const events: ParsedIcalEvent[] = [];
  let current: Record<string, string> | null = null;

  lines.forEach((line) => {
    if (!line) return;
    if (line === 'BEGIN:VEVENT') {
      current = {};
      return;
    }

    if (line === 'END:VEVENT') {
      if (!current) return;

      const checkIn = toIsoDate(current.DTSTART);
      const checkOut = toIsoDate(current.DTEND);
      if (!checkIn || !checkOut || checkIn >= checkOut) {
        current = null;
        return;
      }

      const summary = decodeIcalText(current.SUMMARY || '');
      const description = decodeIcalText(current.DESCRIPTION || '');
      const uid = (current.UID || `${checkIn}-${checkOut}-${summary}`).trim();
      const otaBookingNumber = extractBookingNumber(summary, description, uid);

      events.push({
        uid,
        summary,
        description,
        checkIn,
        checkOut,
        status: (current.STATUS || 'CONFIRMED').trim().toUpperCase(),
        guestName: deriveGuestName(summary, description),
        otaBookingNumber,
      });

      current = null;
      return;
    }

    if (!current) return;

    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) return;

    const rawKey = line.slice(0, separatorIndex);
    const key = rawKey.split(';')[0].toUpperCase();
    const value = line.slice(separatorIndex + 1);

    current[key] = value;
  });

  return events.sort((left, right) => left.checkIn.localeCompare(right.checkIn));
};

export const buildBookingComImportPreview = (
  events: ParsedIcalEvent[],
  roomId: string,
  roomName: string,
  existingBookings: Booking[]
): BookingComImportPreviewItem[] => {
  const activeBookings = existingBookings.filter(
    (booking) => !booking.isDeleted && booking.status !== 'cancelled' && booking.status !== 'checked-out'
  );

  return events.map((event) => {
    const existingMatch = activeBookings.find((booking) => {
      if (booking.roomId !== roomId) return false;
      if (event.otaBookingNumber && booking.otaBookingNumber === event.otaBookingNumber) return true;
      return booking.checkIn === event.checkIn && booking.checkOut === event.checkOut;
    });

    const conflictMatch = activeBookings.find((booking) => {
      if (booking.roomId !== roomId) return false;
      if (booking.id === existingMatch?.id) return false;
      return isOverlap(event.checkIn, event.checkOut, booking.checkIn, booking.checkOut);
    });

    let action: BookingComImportPreviewItem['action'] = 'create';
    let actionLabel = 'Tạo booking nháp';

    if (event.status === 'CANCELLED' && !existingMatch) {
      action = 'ignore';
      actionLabel = 'Không có booking để cập nhật';
    } else if (existingMatch) {
      action = 'update';
      actionLabel = event.status === 'CANCELLED' ? 'Mở booking để hủy' : 'Mở booking hiện có';
    } else if (conflictMatch) {
      action = 'conflict';
      actionLabel = 'Tạo nháp để xử lý trùng lịch';
    }

    return {
      uid: event.uid,
      roomId,
      roomName,
      summary: event.summary,
      description: event.description,
      checkIn: event.checkIn,
      checkOut: event.checkOut,
      nights: getDaysDiff(event.checkIn, event.checkOut),
      status: event.status,
      guestName: event.guestName,
      otaBookingNumber: event.otaBookingNumber,
      existingBookingId: existingMatch?.id,
      conflictBookingId: conflictMatch?.id,
      action,
      actionLabel,
    };
  });
};