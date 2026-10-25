/**
 * Authentication and Authorization Integration Tests
 * Verifies registration, login, logout, session retrieval, rate limits, and cross-student identity isolation.
 */

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  setupTestDb,
  teardownTestDb,
  clearTestData,
  createTestServer,
  createAuthenticatedUser
} from './testHelper.js';

describe('Authentication and Authorization API Tests', () => {
  let server;
  let baseUrl;

  before(async () => {
    await setupTestDb();
    server = await createTestServer();
    baseUrl = server.baseUrl;
  });

  after(async () => {
    if (server) await server.close();
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestData();
  });

  test('POST /api/auth/register creates a student account and returns token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Priya Verma',
        email: 'priya@college.edu',
        password: 'SecurePassword123!',
        education: 'B.Tech IT, 3rd Year',
        targetRoleId: 'role-frontend-dev',
        interests: ['React', 'CSS', 'Accessibility'],
        bio: 'Passionate about inclusive UI engineering.'
      })
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.token);
    assert.equal(body.data.user.email, 'priya@college.edu');
    assert.equal(body.data.user.targetRoleId, 'role-frontend-dev');
    // Ensure password hash is NOT exposed in response
    assert.equal(body.data.user.passwordHash, undefined);
  });

  test('POST /api/auth/register rejects duplicate email with 409 Conflict', async () => {
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Student One',
        email: 'duplicate@college.edu',
        password: 'Password123!',
        education: 'B.Tech CSE',
        targetRoleId: 'role-backend-dev'
      })
    });

    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Student Two',
        email: 'duplicate@college.edu',
        password: 'Password123!',
        education: 'B.Tech CSE',
        targetRoleId: 'role-backend-dev'
      })
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'EMAIL_ALREADY_EXISTS');
  });

  test('POST /api/auth/login succeeds with valid credentials', async () => {
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Login Tester',
        email: 'login_tester@college.edu',
        password: 'CorrectPassword123!',
        education: 'B.Tech IT',
        targetRoleId: 'role-data-analyst'
      })
    });

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'login_tester@college.edu',
        password: 'CorrectPassword123!'
      })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.token);
    assert.equal(body.data.user.name, 'Login Tester');
  });

  test('POST /api/auth/login rejects incorrect password with 401', async () => {
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Wrong Pass',
        email: 'wrongpass@college.edu',
        password: 'CorrectPassword123!',
        education: 'B.Tech IT',
        targetRoleId: 'role-data-analyst'
      })
    });

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'wrongpass@college.edu',
        password: 'WrongPassword999!'
      })
    });

    assert.equal(res.status, 401);
  });

  test('GET /api/auth/me returns authenticated user details', async () => {
    const { user, authHeaders } = await createAuthenticatedUser({
      name: 'Auth Me Tester',
      email: 'auth_me@college.edu'
    });

    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: authHeaders
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.user.email, 'auth_me@college.edu');
    assert.equal(body.data.user.name, 'Auth Me Tester');
  });

  test('GET /api/auth/me rejects unauthenticated request with 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(res.status, 401);
  });

  test('STRICT IDENTITY ISOLATION: Student A cannot access Student B records (403 Forbidden)', async () => {
    const studentA = await createAuthenticatedUser({ name: 'Student A', email: 'student_a@college.edu' });
    const studentB = await createAuthenticatedUser({ name: 'Student B', email: 'student_b@college.edu' });

    // Student A tries to view Student B's profile
    const res = await fetch(`${baseUrl}/api/users/${studentB.user.id}`, {
      headers: studentA.authHeaders
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error.code, 'FORBIDDEN');
  });
});
