/**
 * Integration Tests: Skills, Role Gap, and Portfolio Assembly
 * Owners: J. Sankarshan (25071A6698), N. Tharun Kumar (25071A66B8), T. Nikhil (25071A66D6)
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

describe('Skills, Role Gap, and Portfolio Integration Tests', () => {
  let server;
  let baseUrl;
  let primaryStudent;
  let foreignStudent;
  let ev1Id;
  let ev2Id;
  let foreignEvId;
  let mappingId;

  before(async () => {
    await setupTestDb();
    server = await createTestServer();
    baseUrl = server.baseUrl;

    // 1. Create primary and foreign authenticated students
    primaryStudent = await createAuthenticatedUser({
      name: 'Taylor Developer',
      email: 'taylor@college.edu',
      targetRoleId: 'role-backend-dev'
    });

    foreignStudent = await createAuthenticatedUser({
      name: 'Foreign Developer',
      email: 'foreign@college.edu',
      targetRoleId: 'role-frontend-dev'
    });

    // 2. Evidence 1 for Primary User
    const ev1 = await Evidence.create({
      userId: primaryStudent.user.id,
      type: 'project',
      title: 'Backend API Service',
      description: 'Constructed REST API using Node.js and SQL relational database.',
      date: '2026-03-01'
    });
    ev1Id = ev1._id.toString();

    // 3. Evidence 2 for Primary User
    const ev2 = await Evidence.create({
      userId: primaryStudent.user.id,
      type: 'certification',
      title: 'Git Version Control Expert',
      description: 'Comprehensive certification in Git workflows.',
      date: '2026-01-15'
    });
    ev2Id = ev2._id.toString();

    // 4. Evidence for Foreign User
    const foreignEv = await Evidence.create({
      userId: foreignStudent.user.id,
      type: 'project',
      title: 'Foreign UI Project',
      description: 'Accessible React UI components',
      date: '2026-02-10'
    });
    foreignEvId = foreignEv._id.toString();
  });

  after(async () => {
    if (server) await server.close();
    await teardownTestDb();
  });

  test('POST /api/users/:userId/skill-mappings maps catalog skill to evidence', async () => {
    const res = await fetch(`${baseUrl}/api/users/${primaryStudent.user.id}/skill-mappings`, {
      method: 'POST',
      headers: primaryStudent.authHeaders,
      body: JSON.stringify({ skillId: 'skill-nodejs', evidenceId: ev1Id })
    });
    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.data.skillId, 'skill-nodejs');
    mappingId = data.data.id;
  });

  test('POST /api/users/:userId/skill-mappings rejects duplicate mapping with 409', async () => {
    const res = await fetch(`${baseUrl}/api/users/${primaryStudent.user.id}/skill-mappings`, {
      method: 'POST',
      headers: primaryStudent.authHeaders,
      body: JSON.stringify({ skillId: 'skill-nodejs', evidenceId: ev1Id })
    });
    assert.equal(res.status, 409);
  });

  test('POST /api/users/:userId/skill-mappings rejects foreign evidence with 400', async () => {
    const res = await fetch(`${baseUrl}/api/users/${primaryStudent.user.id}/skill-mappings`, {
      method: 'POST',
      headers: primaryStudent.authHeaders,
      body: JSON.stringify({ skillId: 'skill-git', evidenceId: foreignEvId })
    });
    assert.equal(res.status, 400);
  });

  test('GET /api/users/:userId/role-gap returns expected coverage and disclaimer', async () => {
    const res = await fetch(`${baseUrl}/api/users/${primaryStudent.user.id}/role-gap`, {
      headers: primaryStudent.authHeaders
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.data.roleName, 'Backend Developer');
    assert.ok(data.data.disclaimer.includes('Missing evidence does not prove lack of ability'));
    assert.ok(data.data.skillsWithEvidence.some((s) => s.skillId === 'skill-nodejs'));
    assert.ok(data.data.skillsLackingEvidence.some((s) => s.skillId === 'skill-sql'));
  });

  test('PUT /api/users/:userId/portfolio upserts portfolio with ordered evidence', async () => {
    const res = await fetch(`${baseUrl}/api/users/${primaryStudent.user.id}/portfolio`, {
      method: 'PUT',
      headers: primaryStudent.authHeaders,
      body: JSON.stringify({
        title: 'Curated Backend Engineer Portfolio',
        selectedEvidenceIds: [ev2Id, ev1Id] // deliberate ordering: ev2 then ev1
      })
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.data.title, 'Curated Backend Engineer Portfolio');
    assert.equal(data.data.selectedEvidenceIds[0], ev2Id);
    assert.equal(data.data.selectedEvidenceIds[1], ev1Id);
  });

  test('GET /api/users/:userId/portfolio assembles portfolio in requested order', async () => {
    const res = await fetch(`${baseUrl}/api/users/${primaryStudent.user.id}/portfolio`, {
      headers: primaryStudent.authHeaders
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.data.selectedEvidence.length, 2);
    assert.equal(data.data.selectedEvidence[0].id, ev2Id);
    assert.equal(data.data.selectedEvidence[1].id, ev1Id);
    // ev1 has skill-nodejs mapped
    assert.equal(data.data.selectedEvidence[1].mappedSkills[0].skillId, 'skill-nodejs');
  });

  test('CASCADE DELETE: deleting evidence purges mapping and updates portfolio', async () => {
    // Delete ev1
    const delRes = await fetch(`${baseUrl}/api/users/${primaryStudent.user.id}/evidence/${ev1Id}`, {
      method: 'DELETE',
      headers: primaryStudent.authHeaders
    });
    assert.equal(delRes.status, 200);

    // Verify mapping is gone
    const skillsRes = await fetch(`${baseUrl}/api/users/${primaryStudent.user.id}/skills`, {
      headers: primaryStudent.authHeaders
    });
    const skillsData = await skillsRes.json();
    assert.equal(skillsData.data.length, 0);

    // Verify portfolio no longer contains ev1
    const portRes = await fetch(`${baseUrl}/api/users/${primaryStudent.user.id}/portfolio`, {
      headers: primaryStudent.authHeaders
    });
    const portData = await portRes.json();
    assert.equal(portData.data.selectedEvidence.length, 1);
    assert.equal(portData.data.selectedEvidence[0].id, ev2Id);
  });
});
