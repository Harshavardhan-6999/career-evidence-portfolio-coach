/**
 * Integration Tests: Users and Evidence Modules
 * Owners: M. Rohit Sai (25071A66B2) & T. Jaswanth (25071A66D5)
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  setupTestDb,
  teardownTestDb,
  createTestServer,
  createAuthenticatedUser
} from './testHelper.js';

describe('Users and Evidence Integration Tests', () => {
  let server;
  let baseUrl;
  let student;
  let evidenceId;

  before(async () => {
    await setupTestDb();
    server = await createTestServer();
    baseUrl = server.baseUrl;

    // Create primary test user
    student = await createAuthenticatedUser({
      name: 'Alex Rivera',
      email: 'alex.rivera@college.edu',
      education: 'B.Tech in Computer Science',
      interests: ['Backend', 'Security'],
      targetRoleId: 'role-backend-dev',
      bio: 'Backend focus'
    });
  });

  after(async () => {
    if (server) await server.close();
    await teardownTestDb();
  });

  test('POST /api/users creates a user profile', async () => {
    const res = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Carlos Mendez',
        education: 'B.Tech in Computer Science',
        interests: ['Backend', 'Databases'],
        targetRoleId: 'role-backend-dev',
        bio: 'New profile creation'
      })
    });

    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    assert.equal(data.data.name, 'Carlos Mendez');
    assert.ok(data.data.id);
  });

  test('GET /api/users/:userId retrieves user with targetRole info', async () => {
    const res = await fetch(`${baseUrl}/api/users/${student.user.id}`, {
      headers: student.authHeaders
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.data.id, student.user.id);
    assert.equal(data.data.targetRole.name, 'Backend Developer');
  });

  test('GET /api/users/:userId returns 401 when unauthenticated', async () => {
    const res = await fetch(`${baseUrl}/api/users/${student.user.id}`);
    assert.equal(res.status, 401);
  });

  test('PATCH /api/users/:userId updates profile bio and education', async () => {
    const res = await fetch(`${baseUrl}/api/users/${student.user.id}`, {
      method: 'PATCH',
      headers: student.authHeaders,
      body: JSON.stringify({
        bio: 'Updated bio statement'
      })
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.data.bio, 'Updated bio statement');
  });

  test('POST /api/users/:userId/evidence creates project evidence', async () => {
    const res = await fetch(`${baseUrl}/api/users/${student.user.id}/evidence`, {
      method: 'POST',
      headers: student.authHeaders,
      body: JSON.stringify({
        type: 'project',
        title: 'Authentication Service',
        description: 'Implemented JWT token service with refresh tokens and bcrypt hashing.',
        date: '2026-03-10',
        supportingUrl: 'https://github.com/alex/auth-service'
      })
    });

    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.data.type, 'project');
    assert.ok(data.data.id);
    evidenceId = data.data.id;
  });

  test('GET /api/users/:userId/evidence lists user evidence items', async () => {
    const res = await fetch(`${baseUrl}/api/users/${student.user.id}/evidence`, {
      headers: student.authHeaders
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.data.length, 1);
    assert.equal(data.data[0].id, evidenceId);
  });

  test('GET /api/users/:userId/evidence/:evidenceId returns single item', async () => {
    const res = await fetch(`${baseUrl}/api/users/${student.user.id}/evidence/${evidenceId}`, {
      headers: student.authHeaders
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.data.id, evidenceId);
    assert.equal(data.data.title, 'Authentication Service');
  });

  test('DELETE /api/users/:userId/evidence/:evidenceId removes record', async () => {
    const res = await fetch(`${baseUrl}/api/users/${student.user.id}/evidence/${evidenceId}`, {
      method: 'DELETE',
      headers: student.authHeaders
    });
    assert.equal(res.status, 200);

    const checkRes = await fetch(`${baseUrl}/api/users/${student.user.id}/evidence/${evidenceId}`, {
      headers: student.authHeaders
    });
    assert.equal(checkRes.status, 404);
  });
});
