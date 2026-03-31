import test from 'node:test';
import assert from 'node:assert/strict';

import type { Booking } from '../types/types';
import { buildBookingComImportPreview, parseIcalEvents } from '../utils/icalParser.ts';

const sampleIcal = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'UID:booking-5406116782@example.com',
  'DTSTART;VALUE=DATE:20260410',
  'DTEND;VALUE=DATE:20260412',
  'SUMMARY:Lana Wendt',
  'DESCRIPTION:Booking number 5406116782',
  'STATUS:CONFIRMED',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:cancelled-99999999@example.com',
  'DTSTART;VALUE=DATE:20260415',
  'DTEND;VALUE=DATE:20260416',
  'SUMMARY:Reserved',
  'STATUS:CANCELLED',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

const makeBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'booking-local-1',
  roomId: '201',
  guestName: 'Existing Guest',
  phone: '',
  otaBookingNumber: '5406116782',
  source: 'Booking.com',
  checkIn: '2026-04-10',
  checkOut: '2026-04-12',
  status: 'booked',
  price: 400000,
  totalAmount: 0,
  paid: 0,
  surcharge: 0,
  services: [],
  discounts: [],
  guests: [],
  createdAt: 1,
  ...overrides,
});

test('parseIcalEvents extracts vevents with decoded fields', () => {
  const events = parseIcalEvents(sampleIcal);

  assert.equal(events.length, 2);
  assert.equal(events[0].checkIn, '2026-04-10');
  assert.equal(events[0].checkOut, '2026-04-12');
  assert.equal(events[0].guestName, 'Lana Wendt');
  assert.equal(events[0].otaBookingNumber, '5406116782');
  assert.equal(events[1].status, 'CANCELLED');
});

test('buildBookingComImportPreview marks existing ota match as update', () => {
  const preview = buildBookingComImportPreview(parseIcalEvents(sampleIcal), '201', '201 - Deluxe Queen', [makeBooking()]);

  assert.equal(preview[0].action, 'update');
  assert.equal(preview[0].existingBookingId, 'booking-local-1');
  assert.equal(preview[0].actionLabel, 'Mở booking hiện có');
});

test('buildBookingComImportPreview marks overlapping booking as conflict', () => {
  const preview = buildBookingComImportPreview(
    parseIcalEvents(sampleIcal).slice(0, 1),
    '201',
    '201 - Deluxe Queen',
    [makeBooking({ id: 'conflict-1', otaBookingNumber: 'different', checkIn: '2026-04-11', checkOut: '2026-04-13' })]
  );

  assert.equal(preview[0].action, 'conflict');
  assert.equal(preview[0].conflictBookingId, 'conflict-1');
});

test('buildBookingComImportPreview ignores cancelled events without local match', () => {
  const preview = buildBookingComImportPreview(parseIcalEvents(sampleIcal).slice(1), '201', '201 - Deluxe Queen', []);

  assert.equal(preview[0].action, 'ignore');
  assert.equal(preview[0].actionLabel, 'Không có booking để cập nhật');
});