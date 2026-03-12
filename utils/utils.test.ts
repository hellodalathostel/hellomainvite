import { test, describe } from 'node:test';
import assert from 'node:assert';
import { formatNumberInput } from './utils.ts';

describe('formatNumberInput', () => {
  test('formats number correctly for vi-VN locale', () => {
    assert.strictEqual(formatNumberInput(1000), '1.000');
    assert.strictEqual(formatNumberInput(1000000), '1.000.000');
  });

  test('formats numeric string correctly', () => {
    assert.strictEqual(formatNumberInput('5000'), '5.000');
  });

  test('returns empty string for falsy values', () => {
    assert.strictEqual(formatNumberInput(''), '');
    assert.strictEqual(formatNumberInput(0), '');
    // @ts-ignore
    assert.strictEqual(formatNumberInput(null), '');
    // @ts-ignore
    assert.strictEqual(formatNumberInput(undefined), '');
  });

  test('returns empty string for non-numeric strings', () => {
    assert.strictEqual(formatNumberInput('abc'), '');
  });

  test('handles large numbers', () => {
    assert.strictEqual(formatNumberInput(123456789), '123.456.789');
  });
});
