const { randomUUID } = require('node:crypto');
const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.database();
const REGION = 'asia-southeast1';
const PRODID = '-//Hello Dalat Hostel//Realtime iCal Feed//VI';
const IMPORT_SOURCE = 'Booking.com';
const DEFAULT_IMPORT_SCHEDULE = 'every 30 minutes';
const CONFLICTS_PATH = 'app_data/external_sync_conflicts';

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

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

const toIcalUtcTimestamp = (date = new Date()) => {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
};

const buildCalendar = ({ roomId, roomName, bookings }) => {
  const dtStamp = toIcalUtcTimestamp();

  const events = bookings
    .map((booking) => {
      const summary = escapeIcalText(`Hello Dalat Hostel - ${roomName} (blocked)`);
      const uid = `block-${booking.id}-${roomId}@hello-dalat-manager`;
      const lines = [
        'BEGIN:VEVENT',
        foldLine(`UID:${uid}`),
        `DTSTAMP:${dtStamp}`,
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

const unfoldIcalLines = (content) => {
  const normalized = String(content || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lines = [];

  normalized.forEach((line) => {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
      return;
    }

    lines.push(line);
  });

  return lines;
};

const decodeIcalText = (value) => {
  return String(value || '')
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
};

const toIsoDate = (value) => {
  const match = String(value || '').match(/(\d{8})/);
  if (!match) return null;

  const raw = match[1];
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
};

const extractBookingNumber = (...values) => {
  for (const value of values) {
    const match = String(value || '').match(/\b\d{8,12}\b/);
    if (match) return match[0];
  }

  return '';
};

const extractImportedIcalUid = (value) => {
  const raw = typeof value === 'string' ? value : '';
  const match = raw.match(/(?:^|\n)iCal UID:\s*(.+?)\s*(?:\n|$)/i);
  return match ? match[1].trim() : '';
};

const isGenericSummary = (summary) => {
  const normalized = normalizeText(summary).toLowerCase();
  return ['reserved', 'reservation', 'booking.com', 'booked', 'unavailable', 'not available'].includes(normalized);
};

const deriveGuestName = (summary, description) => {
  const summaryText = normalizeText(summary);
  if (summaryText && !isGenericSummary(summaryText)) {
    return summaryText;
  }

  const firstMeaningfulLine = decodeIcalText(description)
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line && !/^booking(\.com)?$/i.test(line));

  return firstMeaningfulLine || '';
};

const parseIcalEvents = (content) => {
  const lines = unfoldIcalLines(content);
  const events = [];
  let current = null;

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
      const uid = normalizeText(current.UID || `${checkIn}-${checkOut}-${summary}`);

      events.push({
        uid,
        summary,
        description,
        checkIn,
        checkOut,
        status: normalizeText(current.STATUS || 'CONFIRMED').toUpperCase(),
        guestName: deriveGuestName(summary, description),
        otaBookingNumber: extractBookingNumber(summary, description, uid),
      });

      current = null;
      return;
    }

    if (!current) return;

    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) return;

    const rawKey = line.slice(0, separatorIndex);
    const key = rawKey.split(';')[0].toUpperCase();
    current[key] = line.slice(separatorIndex + 1);
  });

  return events.sort((left, right) => left.checkIn.localeCompare(right.checkIn));
};

const isOverlap = (leftStart, leftEnd, rightStart, rightEnd) => leftStart < rightEnd && leftEnd > rightStart;

const isPmsAvailabilityReflection = (event) => {
  const normalizedUid = normalizeText(event.uid).toLowerCase();
  const normalizedSummary = normalizeText(event.summary).toLowerCase();

  if (/^block-.*@(hello-dalat-manager|hellodalat\.hostel)$/.test(normalizedUid)) {
    return true;
  }

  return normalizedSummary.includes('(blocked)') && normalizedSummary.includes('hello dalat hostel');
};

const createImportHash = (items) => {
  const raw = [...items]
    .sort((left, right) => {
      const leftKey = `${left.uid}|${left.checkIn}|${left.checkOut}|${left.status}|${left.otaBookingNumber || ''}`;
      const rightKey = `${right.uid}|${right.checkIn}|${right.checkOut}|${right.status}|${right.otaBookingNumber || ''}`;
      return leftKey.localeCompare(rightKey);
    })
    .map((item) => `${item.uid}|${item.checkIn}|${item.checkOut}|${item.status}|${item.otaBookingNumber || ''}`)
    .join('||');

  let hash = 0;
  for (let index = 0; index < raw.length; index += 1) {
    hash = (hash * 31 + raw.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16).padStart(8, '0');
};

const buildImportedBookingNote = (event) => {
  return [normalizeText(event.summary), normalizeText(event.description), `iCal UID: ${event.uid}`]
    .filter(Boolean)
    .join('\n');
};

const buildRoomBookings = (rawBookings, rawGroups, roomId) => {
  return Object.entries(rawBookings || {})
    .map(([id, value]) => {
      const booking = { id, ...(value || {}) };
      const group = booking.groupId ? rawGroups?.[booking.groupId] : undefined;
      const customer = group && typeof group.customer === 'object' ? group.customer : {};
      const payment = group && typeof group.payment === 'object' ? group.payment : {};

      return {
        id,
        roomId: booking.roomId,
        groupId: booking.groupId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        status: booking.status,
        price: Number(booking.price) || 0,
        isDeleted: booking.isDeleted === true,
        updatedAt: Number(booking.updatedAt || booking.createdAt) || 0,
        guestName: normalizeText(customer.name || booking.guestName),
        phone: normalizeText(customer.phone || booking.phone),
        otaBookingNumber: normalizeText(customer.otaBookingNumber || booking.otaBookingNumber),
        externalSource: normalizeText(customer.externalSource || booking.externalSource),
        externalIcalUid: normalizeText(customer.externalIcalUid || booking.externalIcalUid || extractImportedIcalUid(customer.note || booking.note)),
        externalImportedAt: Number(customer.externalImportedAt || booking.externalImportedAt) || 0,
        source: normalizeText(customer.source || booking.source),
        note: normalizeText(customer.note || booking.note),
        paid: Number(payment.paid || booking.paid) || 0,
      };
    })
    .filter((booking) => booking.roomId === roomId);
};

const isBookingComImportedBooking = (booking) => {
  return booking.source === IMPORT_SOURCE || booking.externalSource === IMPORT_SOURCE || Boolean(booking.externalIcalUid || extractImportedIcalUid(booking.note));
};

const buildImportDecisions = ({ events, roomId, roomName, roomBookings, lastImportedAt }) => {
  const relevantBookings = roomBookings.filter((booking) => !booking.isDeleted);
  const activeBookings = roomBookings.filter((booking) => !booking.isDeleted && booking.status !== 'cancelled' && booking.status !== 'checked-out');

  return events.map((event) => {
    const existingUidMatch = relevantBookings.find((booking) => booking.externalIcalUid === event.uid);
    const existingOtaMatch = existingUidMatch
      ? undefined
      : activeBookings.find((booking) => event.otaBookingNumber && booking.otaBookingNumber === event.otaBookingNumber);
    const existingMatch = existingUidMatch || existingOtaMatch;
    const conflictMatch = activeBookings.find((booking) => {
      if (booking.id === existingMatch?.id) return false;
      return isOverlap(event.checkIn, event.checkOut, booking.checkIn, booking.checkOut);
    });

    let action = 'create';
    let actionLabel = 'Create Booking.com reservation';
    let decisionReason = 'No strong local match and no overlap in the PMS room calendar.';
    let conflictBookingId = conflictMatch?.id;
    let existingBookingId;
    let matchType;

    if (existingUidMatch) {
      matchType = 'externalIcalUid';
    } else if (existingOtaMatch) {
      matchType = 'otaBookingNumber';
    }

    if (isPmsAvailabilityReflection(event)) {
      action = 'ignore';
      actionLabel = 'Ignore PMS availability block';
      decisionReason = 'This event is an availability block exported by PMS, not an OTA reservation to import.';
    } else if (event.status === 'CANCELLED' && !existingMatch) {
      action = 'ignore';
      actionLabel = 'Ignore unmatched cancellation';
      decisionReason = 'Cancellation has no strong UID or OTA-number match, so the importer must not cancel a local booking by date alone.';
    } else if (existingMatch) {
      if (!isBookingComImportedBooking(existingMatch)) {
        action = 'conflict';
        actionLabel = 'Conflict with non-Booking.com booking';
        conflictBookingId = existingMatch.id;
        decisionReason = 'Strong match points to a local booking that does not belong to Booking.com imported OTA data.';
      } else if (event.status === 'CANCELLED' && existingMatch.status === 'checked-in') {
        action = 'conflict';
        actionLabel = 'Cancelled OTA but checked-in locally';
        conflictBookingId = existingMatch.id;
        decisionReason = 'Reservation is cancelled upstream, but the guest is already checked in locally and needs manual review.';
      } else if (event.status === 'CANCELLED' && Number(existingMatch.paid || 0) > 0) {
        action = 'conflict';
        actionLabel = 'Cancelled OTA but payment exists locally';
        conflictBookingId = existingMatch.id;
        decisionReason = 'Reservation is cancelled upstream, but local payment is recorded so automatic cancellation is blocked.';
      } else if (
        event.status === 'CANCELLED'
        && Number(existingMatch.externalImportedAt || 0) > 0
        && Number(existingMatch.updatedAt || 0) > Number(existingMatch.externalImportedAt || 0)
      ) {
        action = 'conflict';
        actionLabel = 'Cancelled OTA but booking was edited locally';
        conflictBookingId = existingMatch.id;
        decisionReason = 'Reservation is cancelled upstream, but booking data was edited after the last import so manual confirmation is required.';
      } else if (lastImportedAt && existingMatch.updatedAt && existingMatch.updatedAt > lastImportedAt) {
        action = 'conflict';
        actionLabel = 'Local booking changed after last import';
        conflictBookingId = existingMatch.id;
        decisionReason = 'Local booking was edited after the previous successful import, so the scheduler must not overwrite it automatically.';
      } else {
        action = event.status === 'CANCELLED' ? 'cancel' : 'update';
        actionLabel = event.status === 'CANCELLED' ? 'Cancel local Booking.com booking' : 'Update local Booking.com booking';
        existingBookingId = existingMatch.id;
        decisionReason = matchType === 'externalIcalUid'
          ? 'Strong match by external iCal UID.'
          : 'Strong match by OTA booking number.';
      }
    } else if (conflictMatch) {
      action = 'conflict';
      actionLabel = 'Conflict on overlapping stay';
      decisionReason = 'There is no strong match, but the imported stay overlaps an active PMS booking in the same room.';
    }

    return {
      ...event,
      roomId,
      roomName,
      action,
      actionLabel,
      decisionReason,
      existingBookingId,
      conflictBookingId,
      matchType,
    };
  });
};

const createConflictRecord = ({ roomId, roomName, event, bookingId, reason, actionLabel, createdAt }) => {
  const conflictId = randomUUID();
  return {
    [`${CONFLICTS_PATH}/${roomId}/${conflictId}`]: {
      id: conflictId,
      roomId,
      roomName,
      bookingId: bookingId || null,
      actionLabel,
      reason,
      status: event.status,
      uid: event.uid,
      otaBookingNumber: event.otaBookingNumber || '',
      guestName: event.guestName || '',
      summary: event.summary || '',
      description: event.description || '',
      checkIn: event.checkIn,
      checkOut: event.checkOut,
      createdAt,
    },
  };
};

const applyImportDecisions = ({ decisions, roomConfig, roomPrice, roomBookings }) => {
  const timestamp = Date.now();
  const updates = {};
  const stats = { created: 0, updated: 0, cancelled: 0, ignored: 0, conflicts: 0 };

  decisions.forEach((decision) => {
    if (decision.action === 'ignore') {
      stats.ignored += 1;
      return;
    }

    if (decision.action === 'conflict') {
      stats.conflicts += 1;
      Object.assign(
        updates,
        createConflictRecord({
          roomId: decision.roomId,
          roomName: decision.roomName,
          event: decision,
          bookingId: decision.conflictBookingId,
          reason: decision.decisionReason,
          actionLabel: decision.actionLabel,
          createdAt: timestamp,
        })
      );
      return;
    }

    const note = buildImportedBookingNote(decision);

    if (decision.action === 'create') {
      const groupId = randomUUID();
      const bookingId = randomUUID();

      updates[`groups/${groupId}`] = {
        id: groupId,
        customer: {
          name: decision.guestName || '',
          phone: '',
          otaBookingNumber: decision.otaBookingNumber || '',
          externalSource: IMPORT_SOURCE,
          externalIcalUid: decision.uid,
          externalImportedAt: timestamp,
          source: IMPORT_SOURCE,
          note,
        },
        payment: {
          paid: 0,
          depositMethod: 'transfer',
          transactionId: null,
        },
        roomIds: {
          [bookingId]: decision.roomId,
        },
        status: decision.status === 'CANCELLED' ? 'cancelled' : 'active',
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      updates[`bookings/${bookingId}`] = {
        id: bookingId,
        roomId: decision.roomId,
        groupId,
        checkIn: decision.checkIn,
        checkOut: decision.checkOut,
        hasEarlyCheckIn: false,
        hasLateCheckOut: false,
        price: roomPrice,
        status: decision.status === 'CANCELLED' ? 'cancelled' : 'booked',
        services: [],
        discounts: [],
        surcharge: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
        isDeleted: false,
      };

      stats.created += 1;
      return;
    }

    const existingBooking = roomBookings.find((booking) => booking.id === decision.existingBookingId);
    if (!existingBooking) {
      stats.conflicts += 1;
      Object.assign(
        updates,
        createConflictRecord({
          roomId: decision.roomId,
          roomName: decision.roomName,
          event: decision,
          bookingId: null,
          reason: 'Strong match could not be loaded from RTDB at apply time.',
          actionLabel: 'Conflict during apply',
          createdAt: timestamp,
        })
      );
      return;
    }

    const resolvedStatus = decision.action === 'cancel'
      ? 'cancelled'
      : existingBooking.status === 'checked-in'
        ? 'checked-in'
        : 'booked';

    updates[`bookings/${existingBooking.id}/roomId`] = decision.roomId;
    updates[`bookings/${existingBooking.id}/checkIn`] = decision.checkIn;
    updates[`bookings/${existingBooking.id}/checkOut`] = decision.checkOut;
    updates[`bookings/${existingBooking.id}/status`] = resolvedStatus;
    updates[`bookings/${existingBooking.id}/updatedAt`] = timestamp;

    if (existingBooking.groupId) {
      updates[`groups/${existingBooking.groupId}/customer/name`] = decision.guestName || existingBooking.guestName || '';
      updates[`groups/${existingBooking.groupId}/customer/otaBookingNumber`] = decision.otaBookingNumber || existingBooking.otaBookingNumber || '';
      updates[`groups/${existingBooking.groupId}/customer/externalSource`] = IMPORT_SOURCE;
      updates[`groups/${existingBooking.groupId}/customer/externalIcalUid`] = decision.uid;
      updates[`groups/${existingBooking.groupId}/customer/externalImportedAt`] = timestamp;
      updates[`groups/${existingBooking.groupId}/customer/source`] = IMPORT_SOURCE;
      updates[`groups/${existingBooking.groupId}/customer/note`] = note;
      updates[`groups/${existingBooking.groupId}/updatedAt`] = timestamp;
      updates[`groups/${existingBooking.groupId}/status`] = resolvedStatus === 'cancelled' ? 'cancelled' : 'active';
    } else {
      updates[`bookings/${existingBooking.id}/guestName`] = decision.guestName || existingBooking.guestName || '';
      updates[`bookings/${existingBooking.id}/phone`] = existingBooking.phone || '';
      updates[`bookings/${existingBooking.id}/otaBookingNumber`] = decision.otaBookingNumber || existingBooking.otaBookingNumber || '';
      updates[`bookings/${existingBooking.id}/externalSource`] = IMPORT_SOURCE;
      updates[`bookings/${existingBooking.id}/externalIcalUid`] = decision.uid;
      updates[`bookings/${existingBooking.id}/externalImportedAt`] = timestamp;
      updates[`bookings/${existingBooking.id}/source`] = IMPORT_SOURCE;
      updates[`bookings/${existingBooking.id}/note`] = note;
    }

    if (decision.action === 'cancel') {
      stats.cancelled += 1;
    } else {
      stats.updated += 1;
    }
  });

  updates[`app_data/property_info/externalSync/bookingComIcal/rooms/${roomConfig.roomId}/lastImportAttemptAt`] = timestamp;
  updates[`app_data/property_info/externalSync/bookingComIcal/rooms/${roomConfig.roomId}/lastImportedAt`] = timestamp;
  updates[`app_data/property_info/externalSync/bookingComIcal/rooms/${roomConfig.roomId}/lastImportHash`] = createImportHash(decisions);
  updates[`app_data/property_info/externalSync/bookingComIcal/rooms/${roomConfig.roomId}/lastImportError`] = '';

  return { updates, stats };
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

exports.importBookingComReservations = onSchedule(
  { region: REGION, schedule: DEFAULT_IMPORT_SCHEDULE, timeZone: 'Asia/Ho_Chi_Minh' },
  async () => {
    const [propertySnap, bookingsSnap, groupsSnap, roomsSnap] = await Promise.all([
      db.ref('app_data/property_info').get(),
      db.ref('bookings').get(),
      db.ref('groups').get(),
      db.ref('app_data/rooms').get(),
    ]);

    const propertyInfo = propertySnap.val() || {};
    const rawBookings = bookingsSnap.val() || {};
    const rawGroups = groupsSnap.val() || {};
    const rooms = roomsSnap.val() || {};
    const roomConfigs = propertyInfo?.externalSync?.bookingComIcal?.rooms || {};

    const configuredRooms = Object.values(roomConfigs).filter((config) => config && config.importEnabled && normalizeText(config.importUrl));
    if (configuredRooms.length === 0) {
      logger.info('importBookingComReservations: no enabled Booking.com import rooms configured');
      return;
    }

    const summary = { roomsProcessed: 0, created: 0, updated: 0, cancelled: 0, ignored: 0, conflicts: 0, unchanged: 0, failed: 0 };

    for (const config of configuredRooms) {
      const roomId = normalizeText(config.roomId);
      const roomName = normalizeText(config.roomName || rooms?.[roomId]?.name || roomId);
      const roomPrice = Number(rooms?.[roomId]?.price) || 0;

      try {
        const response = await fetch(config.importUrl, {
          headers: {
            'User-Agent': 'Hello Dalat Hostel Booking.com iCal Import/1.0',
            Accept: 'text/calendar,text/plain;q=0.9,*/*;q=0.8',
          },
        });

        if (!response.ok) {
          throw new Error(`Fetch failed with ${response.status} ${response.statusText}`);
        }

        const content = await response.text();
        const events = parseIcalEvents(content);
        const hash = createImportHash(events);

        if (config.lastImportHash && config.lastImportHash === hash) {
          summary.unchanged += 1;
          await db.ref(`app_data/property_info/externalSync/bookingComIcal/rooms/${roomId}`).update({
            lastImportAttemptAt: Date.now(),
            lastImportError: '',
          });
          continue;
        }

        const roomBookings = buildRoomBookings(rawBookings, rawGroups, roomId);
        const decisions = buildImportDecisions({
          events,
          roomId,
          roomName,
          roomBookings,
          lastImportedAt: Number(config.lastImportedAt) || 0,
        });
        const { updates, stats } = applyImportDecisions({
          decisions,
          roomConfig: { roomId },
          roomPrice,
          roomBookings,
        });

        await db.ref().update(updates);
        summary.roomsProcessed += 1;
        summary.created += stats.created;
        summary.updated += stats.updated;
        summary.cancelled += stats.cancelled;
        summary.ignored += stats.ignored;
        summary.conflicts += stats.conflicts;
      } catch (error) {
        summary.failed += 1;
        logger.error('importBookingComReservations room failed', { roomId, error: error instanceof Error ? error.message : String(error) });
        await db.ref(`app_data/property_info/externalSync/bookingComIcal/rooms/${roomId}`).update({
          lastImportAttemptAt: Date.now(),
          lastImportError: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info('importBookingComReservations completed', summary);
  }
);