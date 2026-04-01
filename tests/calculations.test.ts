import test from 'node:test';
import assert from 'node:assert/strict';

import type { Booking, RoomDefinition } from '../types/types';
import { CARD_FEE_SERVICE_NAME, calculateBill, calculateBookingTotal } from '../utils/calculations.ts';

const rooms: RoomDefinition[] = [
  { id: '101', name: 'Room 101', price: 500000 },
  { id: '102', name: 'Room 102', price: 600000 },
];

const makeBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'b1',
  roomId: '101',
  groupId: 'g1',
  guestName: 'Tester',
  phone: '0900000000',
  source: 'Walk-in',
  note: '',
  checkIn: '2026-04-01',
  checkOut: '2026-04-03',
  status: 'checked-out',
  price: 500000,
  totalAmount: 0,
  paid: 300000,
  surcharge: 0,
  services: [],
  discounts: [],
  guests: [],
  createdAt: 1,
  ...overrides,
});

test('calculateBill for group uses current booking paid as shared source of truth', () => {
  const primaryBooking = makeBooking({ id: 'b1', roomId: '101', paid: 300000 });
  const siblingBooking = makeBooking({ id: 'b2', roomId: '102', price: 600000, paid: 999999 });

  const bill = calculateBill(primaryBooking, [primaryBooking, siblingBooking], rooms, true);

  assert.equal(bill.isGroup, true);
  assert.equal(bill.paid, 300000);
});

test('calculateBill for group only counts service and discount on bookings that carry them', () => {
  const primaryBooking = makeBooking({
    id: 'b1',
    roomId: '101',
    paid: 0,
    services: [{ name: 'Laundry', price: 50000, qty: 1 }],
    discounts: [{ description: 'Promo', amount: 20000 }],
    surcharge: 10000,
  });
  const siblingBooking = makeBooking({
    id: 'b2',
    roomId: '102',
    price: 600000,
    services: [],
    discounts: [],
    surcharge: 0,
  });

  const bill = calculateBill(primaryBooking, [primaryBooking, siblingBooking], rooms, true);

  // Room total = 1,000,000 + 1,200,000 = 2,200,000
  // Services = 50,000; discounts = 20,000; surcharge = 10,000
  assert.equal(bill.total, 2240000);
  assert.equal(bill.surcharge, 10000);
});

test('calculateBookingTotal uses dynamic card surcharge when no fixed card-fee service exists', () => {
  const booking = {
    checkIn: '2026-04-01',
    checkOut: '2026-04-03',
    price: 500000,
    paid: 200000,
    paymentMethod: 'card' as const,
    services: [],
    discounts: [],
    surcharge: 0,
  };

  const result = calculateBookingTotal(booking, rooms, false, {});

  // preTaxTotal = 1,000,000; remaining before surcharge = 800,000 => 4% = 32,000
  assert.equal(result.preTaxTotal, 1000000);
  assert.equal(result.surcharge, 32000);
  assert.equal(result.grandTotal, 1032000);
  assert.equal(result.debt, 832000);
});

test('calculateBookingTotal ignores manual surcharge when fixed card-fee service is present', () => {
  const booking = {
    checkIn: '2026-04-01',
    checkOut: '2026-04-03',
    price: 500000,
    paid: 0,
    paymentMethod: 'card' as const,
    services: [{ name: CARD_FEE_SERVICE_NAME, price: 40000, qty: 1 }],
    discounts: [],
    surcharge: 50000,
  };

  const result = calculateBookingTotal(booking, rooms, false, {});

  // Card fee is represented as a fixed service, so surcharge must be forced to 0.
  assert.equal(result.preTaxTotal, 1040000);
  assert.equal(result.surcharge, 0);
  assert.equal(result.grandTotal, 1040000);
});