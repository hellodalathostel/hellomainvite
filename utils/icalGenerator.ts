import type { Booking } from '../types/types';

/**
 * Escape iCal text values per RFC 5545 section 3.3.11
 */
const escapeIcalText = (value: string): string => {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
};

/**
 * Format a local date string "YYYY-MM-DD" as an iCal DATE value.
 * We use DATE (not DATETIME) for whole-day blocking because Booking.com
 * iCal calendar import treats whole-day VEVENT as availability blocks.
 */
const toIcalDate = (dateStr: string): string => {
  return dateStr.replace(/-/g, '');
};

/**
 * Fold long iCal content lines at 75 octets per RFC 5545 section 3.1.
 * Continuation lines start with a SPACE.
 */
const foldLine = (line: string): string => {
  const MAX_BYTES = 75;
  const encoder = new TextEncoder();
  const bytes = encoder.encode(line);
  if (bytes.length <= MAX_BYTES) return line;

  const chunks: string[] = [];
  let offset = 0;
  let firstChunk = true;

  while (offset < bytes.length) {
    const limit = firstChunk ? MAX_BYTES : MAX_BYTES - 1; // -1 for the leading space on continuation
    let end = offset + limit;

    if (end >= bytes.length) {
      chunks.push((firstChunk ? '' : ' ') + new TextDecoder().decode(bytes.slice(offset)));
      break;
    }

    // Avoid splitting a multi-byte UTF-8 sequence
    while (end > offset && (bytes[end] & 0xc0) === 0x80) end--;

    chunks.push((firstChunk ? '' : ' ') + new TextDecoder().decode(bytes.slice(offset, end)));
    offset = end;
    firstChunk = false;
  }

  return chunks.join('\r\n');
};

const PRODID = '-//Hello Dalat Hostel//Availability Block//VI';

const toIcalUtcTimestamp = (date: Date = new Date()): string => {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
};

export interface IcalBlockOptions {
  /** Property name shown in summary field. Defaults to "Hello Dalat Hostel". */
  propertyName?: string;
  /**
   * DTSTART date to use as lower bound for filtering bookings.
   * Bookings whose checkout is on or before this date are excluded.
   */
  fromDate?: string;
}

export interface IcalBlock {
  bookingId: string;
  roomId: string;
  dtStart: string;
  dtEnd: string;
}

/**
 * Build a list of VEVENT availability blocks from local bookings for one room.
 *
 * Rules:
 * - Only include bookings whose status is "booked" or "checked-in"
 *   (not cancelled, not checked-out, not deleted).
 * - DTSTART = checkIn date  (whole day block starts on arrival date)
 * - DTEND   = checkOut date (exclusive end — day after last night)
 * - If fromDate is set, skip bookings that have already checked out.
 */
export const buildIcalBlocks = (
  bookings: Booking[],
  roomId: string,
  options: IcalBlockOptions = {}
): IcalBlock[] => {
  const { fromDate } = options;
  const today = fromDate ?? new Date().toISOString().split('T')[0];

  return bookings
    .filter((b) => {
      if (b.roomId !== roomId) return false;
      if (b.isDeleted) return false;
      if (b.status === 'cancelled' || b.status === 'checked-out') return false;
      if (b.checkOut <= today) return false;
      return true;
    })
    .map((b) => ({
      bookingId: b.id,
      roomId: b.roomId,
      dtStart: b.checkIn,
      dtEnd: b.checkOut,
    }));
};

/**
 * Generate a complete iCal VCALENDAR string for one room, suitable for
 * download as a .ics file or hosting at a static URL that Booking.com can
 * poll to import availability blocks.
 */
export const generateRoomIcal = (
  bookings: Booking[],
  roomId: string,
  roomName: string,
  options: IcalBlockOptions = {}
): string => {
  const { propertyName = 'Hello Dalat Hostel' } = options;
  const blocks = buildIcalBlocks(bookings, roomId, options);
  const now = toIcalUtcTimestamp();

  const vevents = blocks
    .map((block) => {
      const uid = `block-${block.bookingId}-${block.roomId}@hellodalat.hostel`;
      const summary = escapeIcalText(`${propertyName} – ${roomName} (blocked)`);
      const dtStart = toIcalDate(block.dtStart);
      const dtEnd = toIcalDate(block.dtEnd);

      const lines = [
        'BEGIN:VEVENT',
        foldLine(`UID:${uid}`),
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${dtStart}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        foldLine(`SUMMARY:${summary}`),
        'TRANSP:OPAQUE',
        'STATUS:CONFIRMED',
        'END:VEVENT',
      ];

      return lines.join('\r\n');
    })
    .join('\r\n');

  const calName = foldLine(`X-WR-CALNAME:${escapeIcalText(`${propertyName} – ${roomName}`)}`);

  const components = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    foldLine(`PRODID:${PRODID}`),
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    calName,
    vevents,
    'END:VCALENDAR',
  ].filter(Boolean);

  return components.join('\r\n') + '\r\n';
};

/**
 * Trigger a browser download of the .ics content for a given room.
 */
export const downloadRoomIcal = (
  bookings: Booking[],
  roomId: string,
  roomName: string,
  options: IcalBlockOptions = {}
): void => {
  const content = generateRoomIcal(bookings, roomId, roomName, options);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `room-${roomId}-availability.ics`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Download a single .ics file containing availability blocks for every room
 * in the provided list (useful for a bulk "export all" action).
 */
export const downloadAllRoomsIcal = (
  bookings: Booking[],
  rooms: { id: string; name: string }[],
  options: IcalBlockOptions = {}
): void => {
  const { propertyName = 'Hello Dalat Hostel' } = options;
  const now = toIcalUtcTimestamp();

  const allBlocks = rooms.flatMap(({ id: roomId, name: roomName }) => {
    const blocks = buildIcalBlocks(bookings, roomId, options);
    return blocks.map((block) => {
      const uid = `block-${block.bookingId}-${block.roomId}@hellodalat.hostel`;
      const summary = escapeIcalText(`${propertyName} – ${roomName} (blocked)`);
      const dtStart = toIcalDate(block.dtStart);
      const dtEnd = toIcalDate(block.dtEnd);

      return [
        'BEGIN:VEVENT',
        foldLine(`UID:${uid}`),
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${dtStart}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        foldLine(`SUMMARY:${summary}`),
        'TRANSP:OPAQUE',
        'STATUS:CONFIRMED',
        'END:VEVENT',
      ].join('\r\n');
    });
  });

  const calName = foldLine(`X-WR-CALNAME:${escapeIcalText(`${propertyName} – All Rooms`)}`);

  const content =
    [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      foldLine(`PRODID:${PRODID}`),
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      calName,
      ...allBlocks,
      'END:VCALENDAR',
    ].join('\r\n') + '\r\n';

  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'all-rooms-availability.ics';
  a.click();
  URL.revokeObjectURL(url);
};
