import test from 'node:test';
import assert from 'node:assert';
import { formatCurrency } from './utils.ts';

test('formatCurrency', async (t) => {
  await t.test('formats 0 correctly', () => {
    // Note: the whitespace before ₫ is a non-breaking space (U+00A0)
    assert.strictEqual(formatCurrency(0), '0\u00A0₫');
  });

  await t.test('formats thousands correctly', () => {
    assert.strictEqual(formatCurrency(1000), '1.000\u00A0₫');
  });

  await t.test('formats millions correctly', () => {
    assert.strictEqual(formatCurrency(1000000), '1.000.000\u00A0₫');
  });

  await t.test('formats negative numbers correctly', () => {
    assert.strictEqual(formatCurrency(-50000), '-50.000\u00A0₫');
  });

  await t.test('formats decimal numbers correctly (rounds to integer)', () => {
    assert.strictEqual(formatCurrency(10.5), '11\u00A0₫');
    assert.strictEqual(formatCurrency(100.25), '100\u00A0₫');
  });
});
