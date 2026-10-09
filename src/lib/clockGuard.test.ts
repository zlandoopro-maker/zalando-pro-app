import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldEnforceClockValidation } from './clockPolicy.ts';
import { evaluateClockDrift, getClockStrikeCount, getClockStrikeKey, clearClockStrikes } from './clockGuard.ts';

test('clock validation is not enforced for unauthenticated new signups', () => {
  assert.equal(shouldEnforceClockValidation(undefined), false);
  assert.equal(shouldEnforceClockValidation('user-123'), true);
  assert.equal(shouldEnforceClockValidation('user-123', true), false);
});

test('minor drift is treated as warning-only and not a permanent block', () => {
  const result = evaluateClockDrift(6 * 60 * 60 * 1000);
  assert.equal(result.shouldBlock, false);
  assert.equal(result.shouldWarn, true);
  assert.equal(result.reason, 'minor-drift');
});

test('serious drift remains block-worthy', () => {
  const result = evaluateClockDrift(30 * 60 * 60 * 1000);
  assert.equal(result.shouldBlock, true);
  assert.equal(result.shouldWarn, true);
  assert.equal(result.reason, 'severe-drift');
});

test('clock strike counts are isolated per user and legacy shared keys are cleared', () => {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, val: string) => { store.set(key, String(val)); },
      removeItem: (key: string) => { store.delete(key); },
      clear: () => { store.clear(); },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() { return store.size; },
    },
    configurable: true,
  });

  store.set('zp_clock_strikes', '99');
  store.set(getClockStrikeKey('old-user') as string, '2');
  store.set(getClockStrikeKey('new-user') as string, '1');

  assert.equal(getClockStrikeCount('old-user'), 2);
  assert.equal(getClockStrikeCount('new-user'), 1);

  clearClockStrikes('new-user');
  assert.equal(getClockStrikeCount('new-user'), 0);
  assert.equal(store.get('zp_clock_strikes'), undefined);
});
