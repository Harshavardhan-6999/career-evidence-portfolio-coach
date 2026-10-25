/**
 * Validators Unit Tests
 * Owner: P. Sasikanth (25071A66C3)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidUUID,
  isValidUrl,
  isValidDate,
  AppError
} from '../src/validators/commonValidators.js';
import {
  validateCreateUser,
  validateUpdateUser
} from '../src/validators/userValidators.js';
import {
  validateCreateEvidence,
  validateUpdateEvidence
} from '../src/validators/evidenceValidators.js';
import { validateUpsertPortfolio } from '../src/validators/portfolioValidators.js';
import {
  validateAiSkillAnalysisOutput,
  validateAiCoachingOutput
} from '../src/validators/aiOutputValidators.js';

describe('Validators Module', () => {
  describe('Common Validators', () => {
    test('isValidUUID validates RFC 4122 v4 UUIDs', () => {
      assert.equal(isValidUUID('8d4edf52-2451-4b35-b248-4bb87c76e98a'), true);
      assert.equal(isValidUUID('invalid-uuid-format'), false);
      assert.equal(isValidUUID(12345), false);
      assert.equal(isValidUUID(null), false);
    });

    test('isValidUrl validates HTTP and HTTPS URLs without external calls', () => {
      assert.equal(isValidUrl('https://github.com/project'), true);
      assert.equal(isValidUrl('http://localhost:3000/demo'), true);
      assert.equal(isValidUrl('ftp://example.com/file'), false);
      assert.equal(isValidUrl('not-a-url'), false);
    });

    test('isValidDate validates reasonable calendar dates', () => {
      assert.equal(isValidDate('2026-05-20'), true);
      assert.equal(isValidDate('2026-05-20T12:00:00Z'), true);
      assert.equal(isValidDate('not-a-date'), false);
      assert.equal(isValidDate('1850-01-01'), false); // out of range
    });
  });

  describe('User Profile Validators', () => {
    const roles = [{ id: 'role-backend-dev', name: 'Backend Developer' }];

    test('accepts valid user creation payload', () => {
      const result = validateCreateUser(
        {
          name: 'Jane Doe',
          education: 'B.Tech CSE',
          interests: ['APIs', 'Testing'],
          targetRoleId: 'role-backend-dev',
          bio: 'Student developer'
        },
        roles
      );
      assert.equal(result.name, 'Jane Doe');
      assert.equal(result.targetRoleId, 'role-backend-dev');
    });

    test('rejects unrecognized targetRoleId', () => {
      assert.throws(
        () => {
          validateCreateUser(
            {
              name: 'Jane Doe',
              education: 'B.Tech CSE',
              targetRoleId: 'unknown-role'
            },
            roles
          );
        },
        (err) => {
          assert.equal(err.code, 'VALIDATION_ERROR');
          assert.ok(err.details[0].includes('not recognized'));
          return true;
        }
      );
    });

    test('rejects unknown fields in user update', () => {
      assert.throws(
        () => {
          validateUpdateUser({ role: 'admin', name: 'New Name' }, roles);
        },
        (err) => {
          assert.equal(err.code, 'VALIDATION_ERROR');
          assert.ok(err.message.includes('Unknown update fields'));
          return true;
        }
      );
    });
  });

  describe('Evidence Validators', () => {
    test('accepts valid evidence with optional URL', () => {
      const valid = validateCreateEvidence({
        type: 'project',
        title: 'Microservice Gateway',
        description: 'Engineered an API gateway with rate limiting and logging.',
        date: '2026-03-01',
        supportingUrl: 'https://github.com/example/gateway'
      });
      assert.equal(valid.type, 'project');
      assert.equal(valid.supportingUrl, 'https://github.com/example/gateway');
    });

    test('rejects disallowed evidence types', () => {
      assert.throws(
        () => {
          validateCreateEvidence({
            type: 'hackathon_trophy', // invalid type
            title: 'Title',
            description: 'Long enough description for test',
            date: '2026-01-01'
          });
        },
        (err) => {
          assert.equal(err.code, 'VALIDATION_ERROR');
          return true;
        }
      );
    });
  });

  describe('Portfolio Validators', () => {
    test('rejects duplicate evidence IDs in portfolio selection', () => {
      const evId = '8d4edf52-2451-4b35-b248-4bb87c76e98a';
      assert.throws(
        () => {
          validateUpsertPortfolio({
            title: 'My Portfolio',
            selectedEvidenceIds: [evId, evId]
          });
        },
        (err) => {
          assert.equal(err.code, 'VALIDATION_ERROR');
          assert.ok(err.details[0].includes('Duplicate evidence IDs'));
          return true;
        }
      );
    });
  });

  describe('AI Output Schema and Semantic Boundary Validators', () => {
    const catalogSkills = [{ id: 'skill-nodejs', name: 'Node.js' }];
    const targetEvidenceId = '6ad56d06-ee56-4daa-9bbb-d0262311dff0';

    test('validates and sanitizes AI skill analysis output', () => {
      const raw = {
        suggestedSkills: [
          {
            skillId: 'skill-nodejs',
            evidenceId: targetEvidenceId,
            reason: 'Detailed usage of Node.js event loop.'
          }
        ]
      };
      const res = validateAiSkillAnalysisOutput(raw, targetEvidenceId, catalogSkills);
      assert.equal(res.suggestedSkills.length, 1);
      assert.equal(res.suggestedSkills[0].skillId, 'skill-nodejs');
    });

    test('rejects AI skill output that invents non-catalog skill IDs', () => {
      const raw = {
        suggestedSkills: [
          {
            skillId: 'skill-invented-hallucination',
            evidenceId: targetEvidenceId,
            reason: 'Invented'
          }
        ]
      };
      assert.throws(
        () => {
          validateAiSkillAnalysisOutput(raw, targetEvidenceId, catalogSkills);
        },
        (err) => {
          assert.equal(err.code, 'AI_SEMANTIC_VIOLATION');
          return true;
        }
      );
    });

    test('rejects AI coaching that references out-of-scope evidence IDs', () => {
      const allowedIds = ['ev-1', 'ev-2'];
      const raw = {
        strengths: [{ statement: 'Strong architecture', supportingEvidenceIds: ['ev-1'] }],
        evidenceGaps: [{ statement: 'Needs SQL evidence', supportingEvidenceIds: [] }],
        nextSteps: [
          {
            action: 'Add tests',
            reason: 'Improve reliability',
            priority: 'high',
            supportingEvidenceIds: ['ev-foreign-99'] // out of scope!
          }
        ]
      };

      assert.throws(
        () => {
          validateAiCoachingOutput(raw, allowedIds);
        },
        (err) => {
          assert.equal(err.code, 'AI_SEMANTIC_VIOLATION');
          assert.ok(err.message.includes('does not belong to user\'s selected portfolio evidence'));
          return true;
        }
      );
    });
  });
});
