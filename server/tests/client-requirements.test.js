import test from 'node:test';
import assert from 'node:assert/strict';
import { validationResult } from 'express-validator';
import { createUserValidationRules } from '../validators/userValidator.js';
import { playGameValidationRules, completeSessionValidationRules } from '../validators/gameValidator.js';
import { payoutFor } from '../../client/src/components/game/casinoConfig.ts';
import { isPresettableScore, nearestPresettableScore } from '../utils/casinoOutcomes.js';
import pool from '../database/connection.js';
import { completeSession } from '../repositories/gameRepository.js';

async function errors(rules, body) {
  const req = { body };
  for (const rule of rules) await rule.run(req);
  return validationResult(req).array();
}

test('accounts accept omitted/empty email and reject invalid supplied email', async () => {
  const account = { username: 'player-one', password: 'password123', role: 'player' };
  for (const email of [undefined, '', 'person@example.com']) {
    assert.deepEqual(await errors(createUserValidationRules, { ...account, email }), []);
  }
  assert.ok((await errors(createUserValidationRules, { ...account, email: 'invalid' })).length);
});

test('stakes accept half-point increments and reject invalid amounts', async () => {
  for (const stake of [undefined, 0.5, 1, 1.5, 100]) {
    assert.deepEqual(await errors(playGameValidationRules, { stake }), []);
  }
  for (const stake of [-1, 0, 0.25, 0.75, 'NaN', Infinity, 1000000.5]) {
    assert.ok((await errors(playGameValidationRules, { stake })).length, String(stake));
  }
  assert.deepEqual(await errors(completeSessionValidationRules, { score: 0.25 }), []);
  assert.ok((await errors(completeSessionValidationRules, { score: -1 })).length);
});

test('fractional payouts agree with server outcomes and preserve small wins', () => {
  assert.equal(payoutFor(0.5, 0.5), 0.25);
  assert.equal(payoutFor(0.5, 1.5), 0.75);
  for (const stake of [0.5, 1, 1.5, 10]) {
    for (const multiplier of [0, 0.5, 1, 1.5, 2, 3, 5, 10, 100]) {
      const score = payoutFor(stake, multiplier);
      assert.ok(isPresettableScore('Lucky Wheel', stake, score));
      assert.equal(nearestPresettableScore('Lucky Wheel', stake, score), score);
    }
  }
});

test('completion credits a fractional win once and rolls back failed ledger writes', async (t) => {
  let completed = false;
  let credits = 0;
  let failLedger = false;
  const statements = [];
  const original = pool.connect;
  pool.connect = async () => ({
    release() {},
    async query(sql, args = []) {
      statements.push(sql.trim());
      if (sql.includes('UPDATE game_sessions')) {
        if (completed) return { rows: [] };
        completed = true;
        return { rows: [{ id: 'session', user_id: 'player', game_id: 'wheel', score: args[0] }] };
      }
      if (sql.includes('SELECT pays_out')) return { rows: [{ pays_out: true }] };
      if (sql.includes('balance = balance +')) {
        assert.equal(args[0], 0.25);
        credits++;
        return { rows: [{ balance: 10.25 }], rowCount: 1 };
      }
      if (sql.includes("r.name = 'super_admin'")) return { rows: [{ id: 'house' }] };
      if (sql.includes('SELECT balance')) return { rows: [{ balance: 100 }] };
      if (sql.includes('INSERT INTO wallet_transactions') && failLedger) throw new Error('ledger failure');
      return { rows: [], rowCount: 1 };
    },
  });
  t.after(() => { pool.connect = original; });
  assert.equal((await completeSession('session', 0.25)).score, 0.25);
  assert.equal(await completeSession('session', 0.25), null);
  assert.equal(credits, 1);
  assert.ok(statements.includes('COMMIT'));
  completed = false;
  failLedger = true;
  await assert.rejects(completeSession('session', 0.25), /ledger failure/);
  assert.equal(statements.at(-1), 'ROLLBACK');
});

// Additional regressions found during the review.
import { transferValidationRules, adjustBalanceValidationRules } from '../validators/walletValidator.js';
import { updateUserValidationRules } from '../validators/userValidator.js';
import { createUserSchema, updateProfileSchema } from '../../client/src/schemas/users.ts';
import { transferSchema, adjustBalanceSchema } from '../../client/src/schemas/wallet.ts';

test('email validation agrees on blank values and rejects non-string input', async () => {
  for (const email of ['', '   ', undefined, 'user@example.com']) {
    const input = { username: 'new-player', password: 'password123', role: 'player', email };
    assert.deepEqual(await errors(createUserValidationRules, input), []);
    assert.ok(createUserSchema.safeParse(input).success);
    assert.deepEqual(await errors(updateUserValidationRules, { email }), []);
    assert.ok(updateProfileSchema.safeParse({ email }).success);
  }
  for (const email of [false, 0, {}, []]) {
    assert.ok((await errors(createUserValidationRules, { username: 'new-player', password: 'password123', role: 'player', email })).length);
  }
  const req = { body: { fullName: 'Only a name change' } };
  for (const rule of updateUserValidationRules) await rule.run(req);
  assert.equal(req.body.email, undefined);
});

test('wallet UI and API accept cents and reject sub-cent/nonfinite amounts', async () => {
  const userId = 'a1111111-1111-4111-8111-111111111111';
  for (const amount of [0.01, 0.25, 0.29, 0.5, 1.23]) {
    assert.deepEqual(await errors(transferValidationRules, { recipientId: userId, amount }), []);
    assert.ok(transferSchema.safeParse({ recipientId: userId, amount }).success);
    assert.deepEqual(await errors(adjustBalanceValidationRules, { userId, operation: 'remove', amount, reason: 'Test' }), []);
    assert.ok(adjustBalanceSchema.safeParse({ userId, operation: 'remove', amount, reason: 'Test' }).success);
  }
  for (const amount of [0, -1, 0.001, 1e-10, Infinity, NaN]) {
    assert.ok((await errors(transferValidationRules, { recipientId: userId, amount })).length);
    assert.ok(!transferSchema.safeParse({ recipientId: userId, amount }).success);
  }
  assert.deepEqual(await errors(adjustBalanceValidationRules, { userId, operation: 'set', amount: 0, reason: 'Test' }), []);
  for (const score of [0.001, 1e-10, Infinity, NaN]) {
    assert.ok((await errors(completeSessionValidationRules, { score })).length);
  }
});
