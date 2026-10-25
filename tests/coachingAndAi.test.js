/**
 * Integration Tests: AI Adapter, Coaching, and Staleness Verification
 * Owners: P. Srihith Reddy (25071A66B9) & R. Suryaprakash (25071A66C5)
 */

import { test, describe, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  setupTestDb,
  teardownTestDb,
  createTestServer,
  createAuthenticatedUser
} from './testHelper.js';
import { setAiStub, clearAiStub, DEFAULT_TIMEOUT_MS } from '../src/ai/aiClient.js';
import { AppError } from '../src/validators/commonValidators.js';
import { Evidence } from '../src/models/Evidence.js';
import { SkillMapping } from '../src/models/SkillMapping.js';
import { Portfolio } from '../src/models/Portfolio.js';

describe('AI and Coaching Integration Tests', () => {
  let server;
  let baseUrl;
  let student;
  let ev1Id;

  before(async () => {
    await setupTestDb();
    server = await createTestServer();
    baseUrl = server.baseUrl;

    // 1. Create authenticated student
    student = await createAuthenticatedUser({
      name: 'Riley Morgan',
      email: 'riley@college.edu',
      education: 'B.Tech CSE',
      targetRoleId: 'role-backend-dev'
    });

    // 2. Add Evidence
    const ev = await Evidence.create({
      userId: student.user.id,
      type: 'project',
      title: 'High-Throughput Redis Cache Layer',
      description: 'Engineered an in-memory caching wrapper for Node.js REST services with connection pooling.',
      date: '2026-04-10'
    });
    ev1Id = ev._id.toString();

    // 3. Map Skill
    await SkillMapping.create({
      userId: student.user.id,
      skillId: 'skill-nodejs',
      evidenceId: ev._id
    });

    // 4. Create Portfolio
    await Portfolio.create({
      userId: student.user.id,
      title: 'Riley Morgan - Backend Portfolio',
      selectedEvidenceIds: [ev._id]
    });
  });

  after(async () => {
    if (server) await server.close();
    await teardownTestDb();
  });

  afterEach(() => {
    clearAiStub();
  });

  test('AI Skill Analysis endpoint succeeds when AI returns valid schema', async () => {
    setAiStub(async () => {
      return {
        suggestedSkills: [
          {
            skillId: 'skill-nodejs',
            evidenceId: ev1Id,
            reason: 'Explicitly mentions Node.js and REST services in description.'
          }
        ]
      };
    });

    const res = await fetch(`${baseUrl}/api/users/${student.user.id}/evidence/${ev1Id}/analyze`, {
      method: 'POST',
      headers: student.authHeaders
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.data.suggestedSkills.length, 1);
    assert.equal(data.data.suggestedSkills[0].skillId, 'skill-nodejs');
  });

  test('AI Skill Analysis returns 503 when AI service fails', async () => {
    setAiStub(async () => {
      throw new AppError('Gemini API quota exhausted', 503, 'AI_SERVICE_UNAVAILABLE');
    });

    const res = await fetch(`${baseUrl}/api/users/${student.user.id}/evidence/${ev1Id}/analyze`, {
      method: 'POST',
      headers: student.authHeaders
    });
    const data = await res.json();
    assert.equal(res.status, 503);
    assert.equal(data.error.code, 'AI_SERVICE_UNAVAILABLE');
  });

  test('Coaching generates AI feedback when stub returns valid schema', async () => {
    setAiStub(async () => {
      return {
        strengths: [
          {
            statement: 'Demonstrated solid Node.js REST backend proficiency.',
            supportingEvidenceIds: [ev1Id]
          }
        ],
        evidenceGaps: [
          {
            statement: 'Missing SQL database evidence for Backend Developer role.',
            supportingEvidenceIds: []
          }
        ],
        nextSteps: [
          {
            action: 'Build a relational database CRUD module with SQL migrations.',
            reason: 'Directly provides evidence for backend database competencies.',
            priority: 'high',
            supportingEvidenceIds: []
          }
        ]
      };
    });

    const res = await fetch(`${baseUrl}/api/users/${student.user.id}/coaching`, {
      method: 'POST',
      headers: student.authHeaders
    });
    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.data.source, 'ai');
    assert.equal(data.data.aiStatus, 'success');
    assert.equal(data.data.strengths.length, 1);
    assert.deepEqual(data.data.strengths[0].supportingEvidenceIds, [ev1Id]);
    assert.ok(data.data.roadmap && data.data.roadmap.length > 0);
  });

  test('Coaching gracefully falls back to labeled rule feedback when AI fails', async () => {
    setAiStub(async () => {
      throw new Error('Simulated network timeout connecting to AI provider');
    });

    const res = await fetch(`${baseUrl}/api/users/${student.user.id}/coaching`, {
      method: 'POST',
      headers: student.authHeaders
    });
    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.data.source, 'rules'); // strictly labeled as rules!
    assert.equal(data.data.aiStatus, 'failed');
    assert.ok(data.data.strengths.length > 0);
    assert.ok(data.data.evidenceGaps.length > 0);
    assert.ok(data.data.roadmap && data.data.roadmap.length > 0);
  });

  test('Coaching staleness tracking flags isStale after target role change', async () => {
    // Check initial freshness
    const latestRes = await fetch(`${baseUrl}/api/users/${student.user.id}/coaching/latest`, {
      headers: student.authHeaders
    });
    const latestData = await latestRes.json();
    assert.equal(latestRes.status, 200);
    assert.equal(latestData.data.isStale, false);

    // Mutate targetRoleId to role-frontend-dev
    await fetch(`${baseUrl}/api/users/${student.user.id}`, {
      method: 'PATCH',
      headers: student.authHeaders,
      body: JSON.stringify({ targetRoleId: 'role-frontend-dev' })
    });

    // Check that coaching is now flagged as stale
    const staleRes = await fetch(`${baseUrl}/api/users/${student.user.id}/coaching/latest`, {
      headers: student.authHeaders
    });
    const staleData = await staleRes.json();
    assert.equal(staleRes.status, 200);
    assert.equal(staleData.data.isStale, true);
    assert.ok(staleData.data.staleReasons.some((r) => r.includes('Target role changed')));
  });

  test('DEFAULT_TIMEOUT_MS is configured to 60000ms by default', () => {
    assert.equal(DEFAULT_TIMEOUT_MS, 60000);
  });

  test('AI timeout handling: throws 503 and returns AI_SERVICE_UNAVAILABLE without fallback data', async () => {
    setAiStub(async () => {
      throw new AppError('AI service request exceeded 60000ms timeout limit', 503, 'AI_SERVICE_UNAVAILABLE');
    });

    const res = await fetch(`${baseUrl}/api/users/${student.user.id}/evidence/${ev1Id}/analyze`, {
      method: 'POST',
      headers: student.authHeaders
    });
    const data = await res.json();
    assert.equal(res.status, 503);
    assert.equal(data.error.code, 'AI_SERVICE_UNAVAILABLE');
    assert.ok(data.error.message.includes('60000ms'));
    assert.equal(data.data, undefined);
  });
});
