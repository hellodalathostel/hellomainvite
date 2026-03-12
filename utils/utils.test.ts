import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { getDaysDiff } from './utils.ts';

describe('getDaysDiff', () => {
  it('should return 1 for the same day', () => {
    assert.strictEqual(getDaysDiff('2023-10-15', '2023-10-15'), 1);
  });

  it('should return 1 for the next day', () => {
    assert.strictEqual(getDaysDiff('2023-10-15', '2023-10-16'), 1);
  });

  it('should return correct difference for multiple days within the same month', () => {
    assert.strictEqual(getDaysDiff('2023-10-15', '2023-10-20'), 5);
  });

  it('should return correct difference across different months', () => {
    assert.strictEqual(getDaysDiff('2023-10-28', '2023-11-02'), 5);
  });

  it('should return correct difference across leap year', () => {
    // 2024 is a leap year, so Feb has 29 days
    assert.strictEqual(getDaysDiff('2024-02-28', '2024-03-01'), 2);
  });

  it('should return correct difference across non-leap year', () => {
    // 2023 is not a leap year, so Feb has 28 days
    assert.strictEqual(getDaysDiff('2023-02-28', '2023-03-01'), 1);
  });

  it('should return 1 for a negative difference (end date before start date)', () => {
    assert.strictEqual(getDaysDiff('2023-10-20', '2023-10-15'), 1);
  });
});
