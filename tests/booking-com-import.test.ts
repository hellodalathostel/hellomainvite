import test from 'node:test';
import assert from 'node:assert/strict';

import type { Booking } from '../types/types';
import {
  buildImportedBookingNote,
  buildSaveBookingPayloadFromPreview,
  createImportPreviewHash,
} from '../utils/bookingComImport.ts';
import type { BookingComImportPreviewItem } from '../utils/icalParser.ts';

const makePreviewItem = (overrides: Partial<BookingComImportPreviewItem> = {}): BookingComImportPreviewItem => ({
  uid: 'uid-1',
  roomId: '101',
  roomName: '101 - Family',
  summary: 'Guest Example',
  description: 'Booking number 12345678',
  checkIn: '2026-04-01',
  checkOut: '2026-04-03',
  nights: 2,
  status: 'CONFIRMED',
  guestName: 'Guest Example',
  otaBookingNumber: '12345678',
  action: 'create',
  actionLabel: 'Tạo booking nháp',
  ...overrides,
});

const makeExistingBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'booking-1',
  roomId: '101',
  groupId: 'group-1',
  guestName: 'Existing Guest',
  phone: '0900000000',
  otaBookingNumber: '87654321',
  source: 'Booking.com',
  note: '',
  checkIn: '2026-04-01',
  checkOut: '2026-04-02',
  status: 'booked',
  price: 450000,
  totalAmount: 0,
  paid: 0,
  surcharge: 0,
  services: [],
  discounts: [],
  guests: [],
  createdAt: 1,
  paymentMethod: 'cash',
  depositMethod: 'transfer',
  transactionId: '',
  ...overrides,
});

test('buildImportedBookingNote includes summary description and uid', () => {
  const note = buildImportedBookingNote(makePreviewItem());

  assert.ok(note.includes('Guest Example'));
  assert.ok(note.includes('Booking number 12345678'));
  assert.ok(note.includes('iCal UID: uid-1'));
});

test('buildSaveBookingPayloadFromPreview creates payload for new booking', () => {
  const payload = buildSaveBookingPayloadFromPreview(makePreviewItem(), 450000);

  assert.equal(payload.roomId, '101');
  assert.equal(payload.source, 'Booking.com');
  assert.equal(payload.otaBookingNumber, '12345678');
  assert.equal(payload.externalSource, 'Booking.com');
  assert.equal(payload.externalIcalUid, 'uid-1');
  assert.equal(typeof payload.externalImportedAt, 'number');
  assert.equal(payload.price, 450000);
  assert.equal(payload.status, 'booked');
});

test('buildSaveBookingPayloadFromPreview preserves existing booking metadata on update', () => {
  const payload = buildSaveBookingPayloadFromPreview(
    makePreviewItem({ status: 'CANCELLED', otaBookingNumber: '99999999' }),
    450000,
    makeExistingBooking({ status: 'checked-in' })
  );

  assert.equal(payload.id, 'booking-1');
  assert.equal(payload.groupId, 'group-1');
  assert.equal(payload.phone, '0900000000');
  assert.equal(payload.status, 'cancelled');
  assert.equal(payload.otaBookingNumber, '99999999');
  assert.equal(payload.externalSource, 'Booking.com');
  assert.equal(payload.externalIcalUid, 'uid-1');
});

test('createImportPreviewHash is deterministic for same items', () => {
  const items = [makePreviewItem(), makePreviewItem({ uid: 'uid-2', otaBookingNumber: '22222222' })];

  assert.equal(createImportPreviewHash(items), createImportPreviewHash(items));
});

test('createImportPreviewHash stays stable across item ordering', () => {
  const itemA = makePreviewItem({ uid: 'uid-a', otaBookingNumber: '11111111' });
  const itemB = makePreviewItem({ uid: 'uid-b', otaBookingNumber: '22222222' });

  const hashForward = createImportPreviewHash([itemA, itemB]);
  const hashReverse = createImportPreviewHash([itemB, itemA]);

  assert.equal(hashForward, hashReverse);
});