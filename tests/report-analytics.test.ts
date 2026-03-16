import test from 'node:test';
import assert from 'node:assert/strict';

import type { Booking } from '../types/types';
import { CARD_FEE_SERVICE_NAME } from '../utils/calculations.ts';
import { buildDailyAccountingExportRows, buildReportAnalytics, getReportSourceLabel } from '../hooks/useReportAnalytics.ts';

const makeBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'b1',
  roomId: '101',
  guestName: 'Tester',
  phone: '0900000000',
  source: 'Walk-in',
  checkIn: '2026-03-01',
  checkOut: '2026-03-03',
  status: 'checked-out',
  price: 100000,
  totalAmount: 0,
  paid: 0,
  surcharge: 0,
  services: [],
  discounts: [],
  guests: [],
  createdAt: 1,
  ...overrides,
});

test('discount affects net but not gross', () => {
  const bookings: Booking[] = [
    makeBooking({
      services: [{ name: 'Laundry', price: 20000, qty: 1 }],
      discounts: [{ description: 'Promo', amount: 15000 }],
    }),
  ];

  const analytics = buildReportAnalytics(bookings);
  assert.equal(analytics.dailyRevenue.length, 1);

  const daily = analytics.dailyRevenue[0];
  // room: 2 nights * 100000 = 200000; service: 20000; gross: 220000; net: 205000
  assert.equal(daily.grossRevenue, 220000);
  assert.equal(daily.revenue, 205000);
  assert.equal(daily.discountTotal, 15000);
});

test('card fee service prevents surcharge double counting', () => {
  const bookings: Booking[] = [
    makeBooking({
      services: [{ name: CARD_FEE_SERVICE_NAME, price: 10000, qty: 1 }],
      surcharge: 10000,
    }),
  ];

  const analytics = buildReportAnalytics(bookings);
  const daily = analytics.dailyRevenue[0];

  // surcharge should be deduped to 0 because card-fee service already exists
  assert.equal(daily.surchargeRevenue, 0);
  // gross includes room + service only
  assert.equal(daily.grossRevenue, 210000);
});

test('source normalization trims and falls back', () => {
  assert.equal(getReportSourceLabel('  OTA Booking  '), 'OTA Booking');
  assert.equal(getReportSourceLabel('   '), 'Chua xac dinh');
  assert.equal(getReportSourceLabel(undefined), 'Chua xac dinh');
});

test('daily accounting export rows have expected columns and values', () => {
  const bookings: Booking[] = [
    makeBooking({
      id: 'b-export-1',
      source: ' OTA ',
      services: [{ name: 'Breakfast', price: 30000, qty: 1 }],
      discounts: [{ description: 'Voucher', amount: 10000 }],
      surcharge: 5000,
    }),
  ];

  const analytics = buildReportAnalytics(bookings);
  const rows = buildDailyAccountingExportRows(analytics.dailyRevenue);

  assert.equal(rows.length, 1);
  const row = rows[0];

  assert.equal(row.date, '2026-03-03');
  assert.equal(row.bookingCount, 1);
  assert.equal(row.roomRevenue, 200000);
  assert.equal(row.serviceRevenue, 30000);
  assert.equal(row.surchargeRevenue, 5000);
  assert.equal(row.discountTotal, 10000);
  assert.equal(row.grossRevenue, 235000);
  assert.equal(row.revenue, 225000);
});
