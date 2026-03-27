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

test('returns empty analytics for empty bookings', () => {
  const analytics = buildReportAnalytics([]);

  assert.equal(analytics.dailyRevenue.length, 0);
  assert.equal(analytics.roomRevenue.length, 0);
  assert.equal(analytics.sourceRevenue.length, 0);
  assert.equal(analytics.customerRevenue.length, 0);
  assert.equal(analytics.monthlyRevenue.length, 0);
  assert.equal(analytics.roomRevenueByMonth.length, 0);
  assert.equal(analytics.roomRevenueByQuarter.length, 0);
  assert.equal(analytics.roomRevenueByYear.length, 0);
});

test('aggregates room revenue by quarter and year correctly', () => {
  const bookings: Booking[] = [
    makeBooking({
      id: 'b-q1',
      checkIn: '2026-01-01',
      checkOut: '2026-01-03',
      price: 100000,
    }),
    makeBooking({
      id: 'b-q2',
      checkIn: '2026-04-10',
      checkOut: '2026-04-12',
      price: 200000,
    }),
  ];

  const analytics = buildReportAnalytics(bookings);
  const q1 = analytics.roomRevenueByQuarter.find(item => item.period === '2026-Q1');
  const q2 = analytics.roomRevenueByQuarter.find(item => item.period === '2026-Q2');
  const y2026 = analytics.roomRevenueByYear.find(item => item.period === '2026');

  assert.ok(q1);
  assert.ok(q2);
  assert.ok(y2026);

  // Q1: 2 nights * 100000
  assert.equal(q1?.roomRevenue, 200000);
  // Q2: 2 nights * 200000
  assert.equal(q2?.roomRevenue, 400000);
  // Year total
  assert.equal(y2026?.roomRevenue, 600000);
  assert.equal(y2026?.bookingCount, 2);
});

test('filters bookings by checkout date range inclusively', () => {
  const bookings: Booking[] = [
    makeBooking({ id: 'b-before', checkOut: '2026-02-28' }),
    makeBooking({ id: 'b-start', checkOut: '2026-03-01' }),
    makeBooking({ id: 'b-mid', checkOut: '2026-03-05' }),
    makeBooking({ id: 'b-end', checkOut: '2026-03-07' }),
    makeBooking({ id: 'b-after', checkOut: '2026-03-08' }),
  ];

  const analytics = buildReportAnalytics(bookings, '2026-03-01', '2026-03-07');
  const ids = analytics.dailyRevenue.flatMap(day => day.bookingCount);

  // start/end boundaries are inclusive for checkout date filter
  assert.equal(analytics.dailyRevenue.length, 3);
  assert.equal(ids.reduce((sum, count) => sum + count, 0), 3);
});

test('room occupancy rate is computed from nights over selected range', () => {
  const bookings: Booking[] = [
    makeBooking({
      id: 'b-occ',
      roomId: '101',
      checkIn: '2026-03-01',
      checkOut: '2026-03-03',
      price: 100000,
    }),
  ];

  // Range has 7 days; booking has 2 nights => 28.57%
  const analytics = buildReportAnalytics(bookings, '2026-03-01', '2026-03-07');
  assert.equal(analytics.roomRevenue.length, 1);
  assert.equal(Number(analytics.roomRevenue[0].occupancyRate.toFixed(2)), 28.57);
});

test('card fee service edge keeps surcharge deduped with mixed services', () => {
  const bookings: Booking[] = [
    makeBooking({
      id: 'b-card-mixed',
      services: [
        { name: CARD_FEE_SERVICE_NAME, price: 10000, qty: 1 },
        { name: 'Laundry', price: 15000, qty: 2 },
      ],
      surcharge: 15000,
      discounts: [{ description: 'Promo', amount: 5000 }],
    }),
  ];

  const analytics = buildReportAnalytics(bookings);
  const daily = analytics.dailyRevenue[0];

  // room = 200000, services = 40000, surcharge deduped to 0, discount = 5000
  assert.equal(daily.serviceRevenue, 40000);
  assert.equal(daily.surchargeRevenue, 0);
  assert.equal(daily.grossRevenue, 240000);
  assert.equal(daily.revenue, 235000);
});
