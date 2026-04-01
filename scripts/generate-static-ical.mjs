import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const projectId = 'hello-dalat-manager';
const firebaseCmd = path.join(process.env.APPDATA || '', 'npm', 'firebase.cmd');
const cwd = process.cwd();
const outputDir = path.join(cwd, 'dist', 'ical');

const PRODID = '-//Hello Dalat Hostel//Static iCal Feed//VI';

const escapeIcalText = (value) => {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
};

const toIcalDate = (dateStr) => String(dateStr || '').replace(/-/g, '');

const foldLine = (line) => {
  const MAX_BYTES = 75;
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= MAX_BYTES) return line;

  const parts = [];
  let offset = 0;
  let first = true;

  while (offset < bytes.length) {
    let limit = first ? MAX_BYTES : MAX_BYTES - 1;
    let end = Math.min(offset + limit, bytes.length);

    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) {
      end -= 1;
    }

    const chunk = bytes.slice(offset, end).toString('utf8');
    parts.push((first ? '' : ' ') + chunk);
    offset = end;
    first = false;
  }

  return parts.join('\r\n');
};

const buildCalendar = ({ roomId, roomName, bookings }) => {
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const events = bookings
    .map((booking) => {
      const summary = escapeIcalText(`Hello Dalat Hostel - ${roomName} (blocked)`);
      const uid = `block-${booking.id}-${roomId}@hello-dalat-manager`;
      return [
        'BEGIN:VEVENT',
        foldLine(`UID:${uid}`),
        `DTSTAMP:${dtStamp}Z`,
        `DTSTART;VALUE=DATE:${toIcalDate(booking.checkIn)}`,
        `DTEND;VALUE=DATE:${toIcalDate(booking.checkOut)}`,
        foldLine(`SUMMARY:${summary}`),
        'TRANSP:OPAQUE',
        'STATUS:CONFIRMED',
        'END:VEVENT',
      ].join('\r\n');
    })
    .join('\r\n');

  const calName = foldLine(`X-WR-CALNAME:${escapeIcalText(`Hello Dalat Hostel - ${roomName}`)}`);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    foldLine(`PRODID:${PRODID}`),
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    calName,
    events,
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n') + '\r\n';
};

const getJsonFromFirebase = (dbPath) => {
  const command = `"${firebaseCmd}" database:get ${dbPath} --project ${projectId}`;
  const raw = execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: true }).trim();
  return raw ? JSON.parse(raw) : {};
};

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const main = () => {
  if (!fs.existsSync(firebaseCmd)) {
    throw new Error(`firebase.cmd not found at ${firebaseCmd}`);
  }

  const bookings = getJsonFromFirebase('/bookings') || {};
  const roomsMap = getJsonFromFirebase('/app_data/rooms') || {};

  const roomIds = Array.from(new Set([
    ...Object.keys(roomsMap),
    ...Object.values(bookings)
      .map((booking) => booking?.roomId)
      .filter(Boolean),
  ])).sort();

  ensureDir(outputDir);

  const nowMs = Date.now();
  const activeBookings = Object.entries(bookings)
    .map(([id, value]) => ({ id, ...value }))
    .filter((booking) => {
      if (booking.isDeleted === true) return false;
      if (booking.status === 'cancelled' || booking.status === 'checked-out') return false;
      if (!booking.roomId || !booking.checkIn || !booking.checkOut) return false;
      if (booking.checkIn >= booking.checkOut) return false;
      return true;
    });

  roomIds.forEach((roomId) => {
    const roomName = roomsMap?.[roomId]?.name || roomId;
    const roomBookings = activeBookings
      .filter((booking) => booking.roomId === roomId)
      .sort((left, right) => String(left.checkIn).localeCompare(String(right.checkIn)));

    const content = buildCalendar({ roomId, roomName, bookings: roomBookings });
    fs.writeFileSync(path.join(outputDir, `${roomId}.ics`), content, 'utf8');
  });

  fs.writeFileSync(
    path.join(outputDir, 'metadata.json'),
    JSON.stringify(
      {
        generatedAt: new Date(nowMs).toISOString(),
        roomCount: roomIds.length,
        rooms: roomIds,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`[iCal] Generated ${roomIds.length} room feeds at dist/ical`);
};

main();