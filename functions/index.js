const { onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.database();
const REGION = 'asia-southeast1';
const PRODID = '-//Hello Dalat Hostel//Realtime iCal Feed//VI';

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

const resolveRoomId = (req) => {
  const roomIdFromQuery = (req.query.roomId || '').toString().trim();
  if (roomIdFromQuery) return roomIdFromQuery;

  const pathPart = (req.path || '').replace(/^\//, '').replace(/\.ics$/i, '').trim();
  return pathPart;
};

const normalizeBookings = (rawBookings, roomId) => {
  return Object.entries(rawBookings || {})
    .map(([id, value]) => ({ id, ...value }))
    .filter((booking) => {
      if (booking.roomId !== roomId) return false;
      if (booking.isDeleted === true) return false;
      if (booking.status === 'cancelled' || booking.status === 'checked-out') return false;
      if (!booking.checkIn || !booking.checkOut) return false;
      if (booking.checkIn >= booking.checkOut) return false;
      return true;
    })
    .sort((left, right) => String(left.checkIn).localeCompare(String(right.checkIn)));
};

const buildCalendar = ({ roomId, roomName, bookings }) => {
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const events = bookings
    .map((booking) => {
      const summary = escapeIcalText(`Hello Dalat Hostel - ${roomName} (blocked)`);
      const uid = `block-${booking.id}-${roomId}@hello-dalat-manager`;
      const lines = [
        'BEGIN:VEVENT',
        foldLine(`UID:${uid}`),
        `DTSTAMP:${dtStamp}Z`,
        `DTSTART;VALUE=DATE:${toIcalDate(booking.checkIn)}`,
        `DTEND;VALUE=DATE:${toIcalDate(booking.checkOut)}`,
        foldLine(`SUMMARY:${summary}`),
        'TRANSP:OPAQUE',
        'STATUS:CONFIRMED',
        'END:VEVENT',
      ];

      return lines.join('\r\n');
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

exports.roomIcal = onRequest({ region: REGION }, async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const roomId = resolveRoomId(req);
    if (!roomId || !/^[0-9A-Za-z_-]+$/.test(roomId)) {
      res.status(400).json({ error: 'Invalid roomId' });
      return;
    }

    const [bookingsSnap, roomsSnap] = await Promise.all([
      db.ref('bookings').get(),
      db.ref('app_data/rooms').get(),
    ]);

    const rawBookings = bookingsSnap.val() || {};
    const customRooms = roomsSnap.val() || {};

    const roomName = customRooms?.[roomId]?.name || roomId;
    const roomBookings = normalizeBookings(rawBookings, roomId);
    const content = buildCalendar({ roomId, roomName, bookings: roomBookings });

    res.set('Content-Type', 'text/calendar; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300');
    res.status(200).send(content);
  } catch (error) {
    logger.error('roomIcal failed', error);
    res.status(500).json({ error: 'Failed to generate iCal feed' });
  }
});