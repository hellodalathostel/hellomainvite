import test from 'node:test';
import assert from 'node:assert/strict';

import type { BookingFormData } from '../types/bookingForm';
import { validateBookingForm } from '../utils/bookingWorkflow.ts';

const makeForm = (overrides: Partial<BookingFormData> = {}): BookingFormData => ({
  roomId: '101',
  guestName: 'Tester',
  phone: '0900000000',
  otaBookingNumber: '',
  source: 'Walk-in',
  note: '',
  checkIn: '2026-04-01',
  checkOut: '2026-04-03',
  status: 'booked',
  price: 400000,
  paid: 0,
  surcharge: 0,
  services: [],
  discounts: [],
  guests: [],
  paymentMethod: 'cash',
  depositMethod: 'cash',
  transactionId: '',
  selectedRooms: ['101'],
  roomDates: {
    '101': {
      checkIn: '2026-04-01',
      checkOut: '2026-04-03',
    },
  },
  hasEarlyCheckIn: false,
  hasLateCheckOut: false,
  ...overrides,
});

test('validateBookingForm rejects invalid single booking date range', () => {
  const result = validateBookingForm(
    makeForm({ checkIn: '2026-04-03', checkOut: '2026-04-03' }),
    false
  );

  assert.equal(result, 'Ngày không hợp lệ (check-in phải nhỏ hơn check-out).');
});

test('validateBookingForm rejects duplicate rooms in new group booking', () => {
  const result = validateBookingForm(
    makeForm({
      selectedRooms: ['101', '101'],
      roomDates: {
        '101': { checkIn: '2026-04-01', checkOut: '2026-04-03' },
      },
    }),
    true
  );

  assert.equal(result, 'Danh sách phòng đang bị trùng. Vui lòng kiểm tra lại.');
});

test('validateBookingForm rejects invalid room dates in new group booking', () => {
  const result = validateBookingForm(
    makeForm({
      selectedRooms: ['101', '102'],
      roomDates: {
        '101': { checkIn: '2026-04-01', checkOut: '2026-04-03' },
        '102': { checkIn: '2026-04-05', checkOut: '2026-04-05' },
      },
    }),
    true
  );

  assert.equal(result, 'Ngày lưu trú không hợp lệ cho phòng 102.');
});