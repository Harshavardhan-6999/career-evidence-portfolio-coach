/**
 * Concurrency and Serialization Integration Tests
 * Owners: M. Harshavardhan (25071A66B1) & P. Sasikanth (25071A66C3)
 *
 * Verifies that concurrent HTTP write operations
 * are completely preserved without race conditions or lost updates.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  setupTestDb,
  teardownTestDb,
  createTestServer,
  createAuthenticatedUser
} from './testHelper.js';
import { Evidence } from '../src/models/Evidence.js';

describe('Concurrency and Transaction Serialization', () => {
  let server;
  let baseUrl;
  let student;

  before(async () => {
    await setupTestDb();
    server = await createTestServer();
    baseUrl = server.baseUrl;

    student = await createAuthenticatedUser({
      name: 'Concurrent Test Subject',
      email: 'concurrent@college.edu',
      targetRoleId: 'role-backend-dev'
    });
  });

  after(async () => {
    if (server) await server.close();
    await teardownTestDb();
  });

  test('preserves all concurrent writes without lost updates', async () => {
    // Fire 15 concurrent evidence additions
    const totalConcurrentWrites = 15;
    const writePromises = [];

    for (let i = 1; i <= totalConcurrentWrites; i++) {
      const p = fetch(`${baseUrl}/api/users/${student.user.id}/evidence`, {
        method: 'POST',
        headers: student.authHeaders,
        body: JSON.stringify({
          type: 'project',
          title: `Concurrent Project #${i}`,
          description: `Description for concurrency test item #${i} to verify atomic persistence.`,
          date: '2026-05-01'
        })
      }).then(async (res) => {
        const body = await res.json();
        return { status: res.status, id: body?.data?.id };
      });

      writePromises.push(p);
    }

    const results = await Promise.all(writePromises);

    // Verify all 15 requests received HTTP 201
    assert.equal(results.length, totalConcurrentWrites);
    for (const r of results) {
      assert.equal(r.status, 201);
      assert.ok(r.id);
    }

    // Verify all 15 items are physically present in MongoDB
    const userEvidenceInDb = await Evidence.find({ userId: student.user.id });
    assert.equal(userEvidenceInDb.length, totalConcurrentWrites);

    // Ensure all 15 unique titles exist in MongoDB
    const titles = new Set(userEvidenceInDb.map((e) => e.title));
    assert.equal(titles.size, totalConcurrentWrites);
  });
});
