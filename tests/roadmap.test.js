/**
 * Interactive Career Roadmap Task Completion Tests
 * Verifies roadmap progress updates (todo, in_progress, completed) and authorization checks.
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
import { Evidence } from '../src/models/Evidence.js';
import { SkillMapping } from '../src/models/SkillMapping.js';
import { Portfolio } from '../src/models/Portfolio.js';
import { CoachingResult } from '../src/models/CoachingResult.js';

describe('Interactive Career Roadmap API Tests', () => {
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

  test('PATCH updates roadmap task status to in_progress and completed', async () => {
    const student = await createAuthenticatedUser();

    // Create evidence and portfolio
    const ev = await Evidence.create({
      userId: student.user.id,
      type: 'project',
      title: 'Node.js API Platform',
      description: 'Building microservices with Express and SQL',
      date: '2026-04-10'
    });

    const portfolio = await Portfolio.create({
      userId: student.user.id,
      title: 'My Backend Portfolio',
      selectedEvidenceIds: [ev._id]
    });

    // Create coaching record with roadmap tasks
    const coaching = await CoachingResult.create({
      userId: student.user.id,
      portfolioId: portfolio._id,
      source: 'rules',
      strengths: [{ statement: 'Good Node.js foundation', supportingEvidenceIds: [ev._id] }],
      evidenceGaps: [{ statement: 'Add SQL indexing benchmark project' }],
      nextSteps: [{ action: 'Build SQL benchmark', reason: 'Demonstrates database tuning' }],
      roadmap: [
        {
          id: 'task-1',
          task: 'Build SQL benchmark',
          reason: 'Demonstrates database tuning',
          priority: 'high',
          status: 'todo',
          supportingEvidenceIds: []
        }
      ],
      inputSnapshot: {}
    });

    // 1. Update task to in_progress
    const res1 = await fetch(
      `${baseUrl}/api/users/${student.user.id}/coaching/${coaching._id}/tasks/task-1`,
      {
        method: 'PATCH',
        headers: student.authHeaders,
        body: JSON.stringify({ status: 'in_progress' })
      }
    );

    assert.equal(res1.status, 200);
    const body1 = await res1.json();
    assert.equal(body1.success, true);
    const task1 = body1.data.roadmap.find((t) => t.id === 'task-1');
    assert.equal(task1.status, 'in_progress');

    // 2. Update task to completed
    const res2 = await fetch(
      `${baseUrl}/api/users/${student.user.id}/coaching/${coaching._id}/tasks/task-1`,
      {
        method: 'PATCH',
        headers: student.authHeaders,
        body: JSON.stringify({ status: 'completed' })
      }
    );

    assert.equal(res2.status, 200);
    const body2 = await res2.json();
    assert.equal(body2.success, true);
    const task2 = body2.data.roadmap.find((t) => t.id === 'task-1');
    assert.equal(task2.status, 'completed');
  });

  test('PATCH rejects invalid status with 400 Validation Error', async () => {
    const student = await createAuthenticatedUser();

    const portfolio = await Portfolio.create({
      userId: student.user.id,
      title: 'Portfolio',
      selectedEvidenceIds: []
    });

    const coaching = await CoachingResult.create({
      userId: student.user.id,
      portfolioId: portfolio._id,
      source: 'rules',
      strengths: [],
      evidenceGaps: [],
      nextSteps: [],
      roadmap: [
        {
          id: 'task-1',
          task: 'Some task',
          reason: 'Some reason',
          status: 'todo'
        }
      ],
      inputSnapshot: {}
    });

    const res = await fetch(
      `${baseUrl}/api/users/${student.user.id}/coaching/${coaching._id}/tasks/task-1`,
      {
        method: 'PATCH',
        headers: student.authHeaders,
        body: JSON.stringify({ status: 'done_and_dusted' }) // Invalid status
      }
    );

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });
});
