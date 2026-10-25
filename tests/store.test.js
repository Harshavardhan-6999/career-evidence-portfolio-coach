/**
 * Storage Unit Tests
 * Owner: M. Harshavardhan (25071A66B1)
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  setStoreFilePath,
  getStore,
  withStoreTransaction,
  resetStore,
  StoreCorruptedError
} from '../src/storage/store.js';
import { createIsolatedTestStore } from './testHelper.js';

describe('Storage Module (store.js)', () => {
  let env;

  beforeEach(async () => {
    env = await createIsolatedTestStore();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  test('initializes empty collections on fresh store', async () => {
    const store = await getStore();
    assert.deepEqual(store.users, []);
    assert.deepEqual(store.evidence, []);
    assert.deepEqual(store.skillMappings, []);
    assert.deepEqual(store.portfolios, []);
    assert.deepEqual(store.coachingResults, []);
  });

  test('serializes transactions and saves modifications atomically', async () => {
    await withStoreTransaction(async (store) => {
      store.users.push({ id: 'u1', name: 'User 1' });
      return { result: true, modified: true };
    });

    const store = await getStore();
    assert.equal(store.users.length, 1);
    assert.equal(store.users[0].name, 'User 1');
  });

  test('detects corrupted JSON and throws StoreCorruptedError without overwriting', async () => {
    // Intentionally corrupt store file with broken JSON
    await fs.writeFile(env.tempStorePath, '{ invalid json: broken', 'utf8');

    await assert.rejects(
      async () => {
        await getStore();
      },
      (err) => {
        assert.equal(err.name, 'StoreCorruptedError');
        assert.equal(err.code, 'STORE_CORRUPTED');
        return true;
      }
    );

    // Verify the file was NOT replaced with an empty store
    const content = await fs.readFile(env.tempStorePath, 'utf8');
    assert.equal(content, '{ invalid json: broken');
  });

  test('failed transaction does not permanently deadlock subsequent operations', async () => {
    // 1. A failed transaction
    await assert.rejects(
      async () => {
        await withStoreTransaction(async () => {
          throw new Error('Intentional transaction failure');
        });
      },
      /Intentional transaction failure/
    );

    // 2. Subsequent transaction must still succeed cleanly
    const outcome = await withStoreTransaction(async (store) => {
      store.users.push({ id: 'u2', name: 'Recovery User' });
      return { result: 'success', modified: true };
    });

    assert.equal(outcome, 'success');
    const store = await getStore();
    assert.equal(store.users.length, 1);
    assert.equal(store.users[0].name, 'Recovery User');
  });
});
