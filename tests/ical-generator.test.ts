import test from 'node:test';
import assert from 'node:assert/strict';

import type { Booking } from '../types/types';
import {
  buildIcalBlocks,
  generateRoomIcal,
} from '../utils/icalGenerator.ts';

const makeBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'b1',
  roomId: '101',
  guestName: 'Test Guest',
  phone: '0900000000',
  source: 'Booking.com',
  checkIn: '2026-04-01',
  checkOut: '2026-04-03',
  status: 'booked',
  price: 200000,
  totalAmount: 200000,
  paid: 0,
  surcharge: 0,
  services: [],
  discounts: [],
  guests: [],
  createdAt: 1,
  ...overrides,
});

// ─── buildIcalBlocks ──────────────────────────────────────────────────────────

test('includes active booked booking for correct room', () => {
  const blocks = buildIcalBlocks([makeBooking()], '101', { fromDate: '2026-03-31' });
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].bookingId, 'b1');
  assert.equal(blocks[0].dtStart, '2026-04-01');
  assert.equal(blocks[0].dtEnd, '2026-04-03');
});

test('includes checked-in booking', () => {
  const blocks = buildIcalBlocks(
    [makeBooking({ status: 'checked-in' })],
    '101',
    { fromDate: '2026-03-31' }
  );
  assert.equal(blocks.length, 1);
});

test('excludes booking for different room', () => {
  const blocks = buildIcalBlocks([makeBooking({ roomId: '201' })], '101');
  assert.equal(blocks.length, 0);
});

test('excludes cancelled booking', () => {
  const blocks = buildIcalBlocks([makeBooking({ status: 'cancelled' })], '101');
  assert.equal(blocks.length, 0);
});

test('excludes checked-out booking', () => {
  const blocks = buildIcalBlocks([makeBooking({ status: 'checked-out' })], '101');
  assert.equal(blocks.length, 0);
});

test('excludes soft-deleted booking', () => {
  const blocks = buildIcalBlocks([makeBooking({ isDeleted: true })], '101');
  assert.equal(blocks.length, 0);
});

test('excludes booking whose checkout is before or on fromDate', () => {
  const blocks = buildIcalBlocks(
    [makeBooking({ checkOut: '2026-03-31' })],
    '101',
    { fromDate: '2026-03-31' }
  );
  assert.equal(blocks.length, 0);
});

test('includes booking whose checkout is after fromDate', () => {
  const blocks = buildIcalBlocks(
    [makeBooking({ checkIn: '2026-03-30', checkOut: '2026-04-01' })],
    '101',
    { fromDate: '2026-03-31' }
  );
  assert.equal(blocks.length, 1);
});

test('handles multiple bookings for same room', () => {
  const bookings = [
    makeBooking({ id: 'b1', checkIn: '2026-04-01', checkOut: '2026-04-03' }),
    makeBooking({ id: 'b2', checkIn: '2026-04-05', checkOut: '2026-04-07' }),
    makeBooking({ id: 'b3', roomId: '201' }),
  ];
  const blocks = buildIcalBlocks(bookings, '101', { fromDate: '2026-03-31' });
  assert.equal(blocks.length, 2);
  assert.deepEqual(blocks.map((b) => b.bookingId), ['b1', 'b2']);
});

// ─── generateRoomIcal ─────────────────────────────────────────────────────────

test('output starts with BEGIN:VCALENDAR and ends with END:VCALENDAR', () => {
  const ical = generateRoomIcal([makeBooking()], '101', '101 - Family', { fromDate: '2026-03-31' });
  assert.ok(ical.startsWith('BEGIN:VCALENDAR'));
  assert.ok(ical.trimEnd().endsWith('END:VCALENDAR'));
});

test('output contains VEVENT for the booking', () => {
  const ical = generateRoomIcal([makeBooking()], '101', '101 - Family', { fromDate: '2026-03-31' });
  assert.ok(ical.includes('BEGIN:VEVENT'));
  assert.ok(ical.includes('END:VEVENT'));
});

test('DTSTART and DTEND use DATE format without dashes', () => {
  const ical = generateRoomIcal([makeBooking()], '101', '101 - Family', { fromDate: '2026-03-31' });
  assert.ok(ical.includes('DTSTART;VALUE=DATE:20260401'));
  assert.ok(ical.includes('DTEND;VALUE=DATE:20260403'));
});

test('UID contains booking id and room id', () => {
  const ical = generateRoomIcal([makeBooking({ id: 'booking-xyz', roomId: '102' })], '102', '102 - Single', { fromDate: '2026-03-31' });
  assert.ok(ical.includes('UID:block-booking-xyz-102@hellodalat.hostel'));
});

test('returns empty calendar when no active bookings exist for room', () => {
  const ical = generateRoomIcal([], '101', '101 - Family');
  assert.ok(ical.includes('BEGIN:VCALENDAR'));
  assert.ok(!ical.includes('BEGIN:VEVENT'));
});

test('no VEVENT for cancelled bookings', () => {
  const ical = generateRoomIcal([makeBooking({ status: 'cancelled' })], '101', '101 - Family', { fromDate: '2026-03-31' });
  assert.ok(!ical.includes('BEGIN:VEVENT'));
});

test('lines do not exceed 75 octets (after CRLF fold)', () => {
  const booking = makeBooking({
    id: 'b-very-long-0000000000000000000000000000001',
    roomId: '101',
  });
  const ical = generateRoomIcal([booking], '101', '101 - Family Deluxe Suite Ultra Premium', { fromDate: '2026-03-31' });

  const encoder = new TextEncoder();
  const lines = ical.split('\r\n');

  for (const line of lines) {
    const byteLen = encoder.encode(line).length;
    assert.ok(
      byteLen <= 75,
      `Line exceeds 75 bytes (${byteLen}): "${line.slice(0, 40)}..."`
    );
  }
});

test('output uses CRLF line endings throughout', () => {
  const ical = generateRoomIcal([makeBooking()], '101', '101 - Family');
  // Should not have lone \n (i.e. \n not preceded by \r)
  const hasBareLf = /(?<!\r)\n/.test(ical);
  assert.ok(!hasBareLf, 'Output contains bare LF line endings');
});

test('special characters in property name are escaped', () => {
  const ical = generateRoomIcal(
    [makeBooking()],
    '101',
    '101 - Family',
    { propertyName: 'Hostel, "Da Lat"; Special\\Test', fromDate: '2026-03-31' }
  );
  // Commas and semicolons must be backslash-escaped
  assert.ok(!ical.includes('Hostel, "Da Lat"; Special\\Test'), 'Raw special chars found unescaped');
  assert.ok(ical.includes('Hostel\\, "Da Lat"\\; Special\\\\Test'), 'Escaped version not found');
});
