import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateCardServiceFee } from './calculations.ts';

describe('calculateCardServiceFee', () => {
  it('should calculate 4% fee for positive amounts', () => {
    assert.strictEqual(calculateCardServiceFee(100), 4);
  });

  it('should round to nearest integer', () => {
    assert.strictEqual(calculateCardServiceFee(12.5), 1); // 12.5 * 0.04 = 0.5 -> 1
    assert.strictEqual(calculateCardServiceFee(12.4), 0); // 12.4 * 0.04 = 0.496 -> 0
    assert.strictEqual(calculateCardServiceFee(37.5), 2); // 37.5 * 0.04 = 1.5 -> 2
    assert.strictEqual(calculateCardServiceFee(10), 0); // 10 * 0.04 = 0.4 -> 0
  });

  it('should return 0 for zero amount', () => {
    assert.strictEqual(calculateCardServiceFee(0), 0);
  });

  it('should return 0 for negative amounts', () => {
    assert.strictEqual(calculateCardServiceFee(-100), 0);
  });

  it('should handle large numbers', () => {
    assert.strictEqual(calculateCardServiceFee(1000000), 40000);
  });
});
