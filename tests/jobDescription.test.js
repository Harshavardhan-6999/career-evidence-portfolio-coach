/**
 * Job Description Analysis & 3-Tier Skill Gap Integration Tests
 * Verifies skill normalization, synonym resolution, 3-tier matrix classification, and disclaimer enforcement.
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
import {
  normalizeSkill,
  deduplicateExtractedSkills,
  CONTROLLED_SKILL_ALIASES
} from '../src/services/jobDescriptionService.js';
import { getSkills } from '../src/services/skillService.js';

describe('Job Description Analysis & Skill Gap API Tests', () => {
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

  test('POST /api/job-descriptions/analyze parses requirements and categorizes 3-tier skill gap', async () => {
    // 1. Create student claiming React in interests
    const student = await createAuthenticatedUser({
      name: 'Rohan Developer',
      email: 'rohan@college.edu',
      targetRoleId: 'role-backend-dev',
      interests: ['React', 'User Experience']
    });

    // 2. Add demonstrable evidence for Node.js and SQL
    const nodeEvidence = await Evidence.create({
      userId: student.user.id,
      type: 'project',
      title: 'Scalable Microservices Gateway',
      description: 'Built high-throughput Express REST API with token authentication',
      date: '2026-03-15'
    });

    // Map skill-nodejs to this evidence
    await SkillMapping.create({
      userId: student.user.id,
      skillId: 'skill-nodejs',
      evidenceId: nodeEvidence._id
    });

    // 3. Post a job description requiring Node.js, React, and Docker
    const rawJobDescription = `
      Position: Full-Stack Cloud Engineer
      Requirements:
      - 2+ years experience building backend services with Node.js
      - Familiarity with frontend interfaces in React
      - Hands-on experience with Docker containerization
      Preferred:
      - Knowledge of SQL databases
    `;

    const res = await fetch(`${baseUrl}/api/job-descriptions/analyze`, {
      method: 'POST',
      headers: student.authHeaders,
      body: JSON.stringify({ rawText: rawJobDescription })
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);

    const analysis = body.data;
    assert.ok(analysis.id);
    assert.ok(analysis.disclaimer.includes('Missing evidence does not prove lack of ability'));

    // Check 3-Tier Classification:
    // a) Node.js -> Supported by Evidence (has mapped evidence)
    const supported = analysis.skillGapAnalysis.supportedByEvidence;
    assert.ok(supported.some((s) => s.skillId === 'skill-nodejs' || s.skillName.toLowerCase().includes('node')));

    // b) React -> Claimed without Evidence (in profile interests, no evidence)
    const claimed = analysis.skillGapAnalysis.claimedWithoutEvidence;
    assert.ok(claimed.some((s) => s.skillName.toLowerCase().includes('react')));

    // c) Docker -> Not Demonstrated (neither evidence nor claimed interest)
    const notDemonstrated = analysis.skillGapAnalysis.notDemonstrated;
    assert.ok(notDemonstrated.some((s) => s.skillName.toLowerCase().includes('docker')));
  });

  test('POST /api/job-descriptions/analyze rejects empty or short text with 400', async () => {
    const student = await createAuthenticatedUser();

    const res = await fetch(`${baseUrl}/api/job-descriptions/analyze`, {
      method: 'POST',
      headers: student.authHeaders,
      body: JSON.stringify({ rawText: 'Too short' })
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  test('GET /api/job-descriptions returns user analysis history', async () => {
    const student = await createAuthenticatedUser();

    // Create an analysis
    await fetch(`${baseUrl}/api/job-descriptions/analyze`, {
      method: 'POST',
      headers: student.authHeaders,
      body: JSON.stringify({
        rawText: 'Junior Backend Engineer. Requires Node.js and SQL experience for database operations.'
      })
    });

    const res = await fetch(`${baseUrl}/api/job-descriptions`, {
      headers: student.authHeaders
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(Array.isArray(body.data), true);
    assert.ok(body.data.length >= 1);
  });

  test('Unit: normalizeSkill resolves controlled aliases to canonical skill IDs', async () => {
    const catalog = await getSkills();

    // REST API aliases
    const rest1 = normalizeSkill('REST API development', catalog);
    assert.equal(rest1?.skillId, 'skill-rest-apis');
    assert.equal(rest1?.skillName, 'RESTful APIs');

    const rest2 = normalizeSkill('RESTful API design', catalog);
    assert.equal(rest2?.skillId, 'skill-rest-apis');

    const rest3 = normalizeSkill('Building REST APIs', catalog);
    assert.equal(rest3?.skillId, 'skill-rest-apis');

    // Testing aliases vs QA
    const test1 = normalizeSkill('Automated API testing', catalog);
    assert.equal(test1?.skillId, 'skill-testing');
    assert.equal(test1?.skillName, 'Automated Testing & QA');

    const test2 = normalizeSkill('Jest', catalog);
    assert.equal(test2?.skillId, 'skill-testing');

    // Security & Auth
    const auth1 = normalizeSkill('User authentication and authorization using JWT', catalog);
    assert.equal(auth1?.skillId, 'skill-api-security');
    assert.equal(auth1?.skillName, 'API Security & Auth');

    // Database & Git
    const mongo1 = normalizeSkill('MongoDB database operations', catalog);
    assert.equal(mongo1?.skillId, 'skill-mongodb');

    const git1 = normalizeSkill('Git version control', catalog);
    assert.equal(git1?.skillId, 'skill-git');

    // Unmapped skill returns null (does not invent false catalog mappings)
    const unmapped = normalizeSkill('input validation', catalog);
    assert.equal(unmapped, null);
  });

  test('Unit: deduplicateExtractedSkills collapses equivalent skills and preserves distinct capabilities', async () => {
    const catalog = await getSkills();

    const rawList = [
      'JavaScript',
      'Node.js',
      'Express.js',
      'REST API development',
      'RESTful APIs', // duplicate alias for skill-rest-apis
      'input validation', // unmapped
      'MongoDB database operations',
      'Git version control',
      'Automated API testing', // skill-testing
      'Jest', // duplicate alias for skill-testing
      'User authentication', // skill-api-security
      'JWT' // duplicate alias for skill-api-security
    ];

    const deduplicated = deduplicateExtractedSkills(rawList, catalog);

    // Verify deduplicated count: 12 raw entries collapse to 9 unique capabilities
    // (skill-javascript, skill-nodejs, skill-express, skill-rest-apis, input validation,
    //  skill-mongodb, skill-git, skill-testing, skill-api-security)
    assert.equal(deduplicated.length, 9);

    // Verify skill-testing appears exactly once with merged aliases
    const testingItem = deduplicated.find((d) => d.normalizedSkillId === 'skill-testing');
    assert.ok(testingItem);
    assert.equal(testingItem.matchedCatalogName, 'Automated Testing & QA');
    assert.ok(testingItem.aliases.includes('Automated API testing'));
    assert.ok(testingItem.aliases.includes('Jest'));

    // Verify skill-rest-apis appears once
    const restItem = deduplicated.find((d) => d.normalizedSkillId === 'skill-rest-apis');
    assert.ok(restItem);
    assert.equal(restItem.matchedCatalogName, 'RESTful APIs');

    // Verify unmapped input validation is preserved as its own capability
    const unmappedItem = deduplicated.find((d) => d.rawName === 'input validation');
    assert.ok(unmappedItem);
    assert.equal(unmappedItem.normalizedSkillId, null);
  });

  test('Integration: Job Match correctly resolves aliases, reviews unmapped input validation, and preserves genuine gaps', async () => {
    const student = await createAuthenticatedUser({
      name: 'Task Manager Student',
      email: 'student.taskmanager@example.edu',
      targetRoleId: 'role-backend-dev',
      interests: ['Node.js', 'Databases']
    });

    // Create evidence matching Demo Task Manager API
    const taskManagerEvidence = await Evidence.create({
      userId: student.user.id,
      type: 'project',
      title: 'Demo Task Manager API',
      description: 'Built a REST API using JavaScript, Node.js and Express. Added task creation, viewing, updating and deletion. Stored tasks in MongoDB and validated required fields. Tested the endpoints using Postman',
      date: '2026-03-20'
    });

    // Map the 5 accepted catalog skills
    const acceptedSkillIds = [
      'skill-rest-apis',
      'skill-nodejs',
      'skill-express',
      'skill-javascript',
      'skill-mongodb'
    ];

    for (const skillId of acceptedSkillIds) {
      await SkillMapping.create({
        userId: student.user.id,
        skillId,
        evidenceId: taskManagerEvidence._id
      });
    }

    // Post job description with aliases and unmapped input validation
    const jobDescriptionText = `
      Position: Junior Backend Developer
      Requirements:
      - JavaScript, Node.js and Express.js
      - REST API development and input validation
      - MongoDB database operations
      - Git version control
      - Automated API testing using Jest or a similar framework
      - User authentication and authorization using JWT
    `;

    const res = await fetch(`${baseUrl}/api/job-descriptions/analyze`, {
      method: 'POST',
      headers: student.authHeaders,
      body: JSON.stringify({ rawText: jobDescriptionText })
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);

    const { skillGapAnalysis, summary } = body.data;

    // 1. Verify "REST API development" matches canonical "RESTful APIs" and is supported by evidence
    const supportedSkills = skillGapAnalysis.supportedByEvidence;
    const restMatch = supportedSkills.find((s) => s.skillId === 'skill-rest-apis');
    assert.ok(restMatch, 'REST API development must normalize to skill-rest-apis and appear in supportedByEvidence');
    assert.equal(restMatch.skillName, 'RESTful APIs');
    assert.ok(restMatch.evidenceTitles.includes('Demo Task Manager API'));

    // Verify all 5 accepted skills are supported
    const supportedIds = supportedSkills.map((s) => s.skillId);
    assert.ok(supportedIds.includes('skill-javascript'));
    assert.ok(supportedIds.includes('skill-nodejs'));
    assert.ok(supportedIds.includes('skill-express'));
    assert.ok(supportedIds.includes('skill-rest-apis'));
    assert.ok(supportedIds.includes('skill-mongodb'));

    // 2. Verify "input validation" is offered for review under needsReview with candidate evidence
    const reviewItems = skillGapAnalysis.needsReview;
    assert.ok(Array.isArray(reviewItems) && reviewItems.length > 0, 'Must provide needsReview items');
    const validationReview = reviewItems.find((r) => r.skillName.toLowerCase().includes('validation'));
    assert.ok(validationReview, 'input validation must be offered for user review');
    assert.equal(validationReview.status, 'pending_user_confirmation');
    assert.ok(validationReview.candidateEvidence.length > 0);
    assert.equal(validationReview.candidateEvidence[0].title, 'Demo Task Manager API');
    assert.ok(validationReview.candidateEvidence[0].matchedSnippet.toLowerCase().includes('validated'));

    // Ensure input validation is NOT falsely marked in notDemonstrated claiming no evidence exists
    const notDemonstrated = skillGapAnalysis.notDemonstrated;
    assert.equal(
      notDemonstrated.some((s) => s.skillName.toLowerCase().includes('validation')),
      false,
      'input validation must NOT be marked as missing without evidence'
    );

    // 3. Preserve genuine gaps: Git, Automated testing (Jest), and JWT/Auth have no evidence
    const notDemonstratedIds = notDemonstrated.map((s) => s.skillId);
    assert.ok(notDemonstratedIds.includes('skill-git'), 'Git must remain a genuine gap');
    assert.ok(notDemonstratedIds.includes('skill-testing'), 'Automated Testing (Jest) must remain a genuine gap');
    assert.ok(notDemonstratedIds.includes('skill-api-security'), 'JWT Authentication must remain a genuine gap');

    // 4. Verify summary counts integrity: totalRequiredSkills === coveredCount + reviewCount + gapCount
    assert.equal(
      summary.totalRequiredSkills,
      summary.coveredCount + summary.reviewCount + summary.gapCount,
      'Deduplicated requirement count must equal the sum of supported, review, and gaps'
    );
  });
});
