import test from 'node:test';
import assert from 'node:assert/strict';
import { findMatchingSupabaseTransaction } from './transactionSync.js';

test('findMatchingSupabaseTransaction matches a pending deposit by firestore_id and user', () => {
  const tx = {
    id: 'firestore-123',
    userId: 'user-42',
    amount: 100,
    type: 'deposit',
    paymentMethod: 'nowpayments'
  };

  const rows = [{
    id: 'supabase-999',
    user_id: 'user-42',
    amount: 100,
    type: 'deposit',
    status: 'pending',
    payment_method: 'nowpayments',
    firestore_id: 'firestore-123'
  }];

  assert.equal(findMatchingSupabaseTransaction(rows, tx)?.id, 'supabase-999');
});

test('findMatchingSupabaseTransaction falls back to user/amount/status when firestore_id is missing', () => {
  const tx = {
    userId: 'user-7',
    amount: 250,
    type: 'deposit',
    paymentMethod: 'nowpayments'
  };

  const rows = [{
    id: 'supabase-777',
    user_id: 'user-7',
    amount: 250,
    type: 'deposit',
    status: 'pending',
    payment_method: 'nowpayments'
  }];

  assert.equal(findMatchingSupabaseTransaction(rows, tx)?.id, 'supabase-777');
});

test('findMatchingSupabaseTransaction prefers the newest matching pending deposit when duplicates exist', () => {
  const tx = {
    userId: 'user-99',
    amount: 50,
    type: 'deposit',
    paymentMethod: 'nowpayments'
  };

  const rows = [{
    id: 'supabase-old',
    user_id: 'user-99',
    amount: 50,
    type: 'deposit',
    status: 'pending',
    payment_method: 'nowpayments',
    timestamp: '2024-01-01T00:00:00.000Z'
  }, {
    id: 'supabase-new',
    user_id: 'user-99',
    amount: 50,
    type: 'deposit',
    status: 'pending',
    payment_method: 'nowpayments',
    timestamp: '2024-01-02T00:00:00.000Z'
  }];

  assert.equal(findMatchingSupabaseTransaction(rows, tx)?.id, 'supabase-new');
});
