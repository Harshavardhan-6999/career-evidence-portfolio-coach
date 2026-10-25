/**
 * Module 3 & AI: Job Description Analysis & Skill Gap Detection Service
 *
 * Parses pasted job descriptions via Gemini AI (with rule-based fallback),
 * normalizes skills against catalog with synonym matching, and computes a 3-tier
 * evidence-backed skill gap analysis.
 */

import { JobDescriptionAnalysis } from '../models/JobDescriptionAnalysis.js';
import { User } from '../models/User.js';
import { Evidence } from '../models/Evidence.js';
import { AppError } from '../validators/commonValidators.js';
import { getSkills, getUserSkills } from './skillService.js';
import { buildUserFilter } from './userService.js';
import { isDbConnected } from '../storage/db.js';
import { generateStructuredJson, isAiConfigured, isAiStubbed } from '../ai/aiClient.js';
import {
  JOB_ANALYSIS_SCHEMA,
  JOB_ANALYSIS_SYSTEM_INSTRUCTION,
  buildJobAnalysisPrompt
} from '../ai/prompts/jobAnalysisPrompt.js';

export const SKILL_GAP_DISCLAIMER =
  'Missing evidence does not prove lack of ability. This analysis only reflects skills mapped to recorded evidence and does not predict hiring success or job readiness.';

/**
 * Controlled alias dictionary mapping canonical catalog skill IDs to common industry synonyms,
 * frameworks, tools, and variations.
 */
export const CONTROLLED_SKILL_ALIASES = {
  'skill-rest-apis': [
    'rest',
    'rest api',
    'rest apis',
    'restful api',
    'restful apis',
    'rest api development',
    'restful api development',
    'rest api design',
    'restful api design',
    'api development',
    'api design',
    'apis',
    'rest endpoints',
    'api endpoints',
    'building rest apis',
    'web apis',
    'restful services',
    'restful web services'
  ],
  'skill-javascript': [
    'javascript',
    'js',
    'es6',
    'es6+',
    'es2015',
    'es2020',
    'ecmascript',
    'vanilla js',
    'modern javascript'
  ],
  'skill-nodejs': [
    'node',
    'nodejs',
    'node.js',
    'node js',
    'node runtime'
  ],
  'skill-express': [
    'express',
    'expressjs',
    'express.js',
    'express js',
    'express framework'
  ],
  'skill-mongodb': [
    'mongo',
    'mongodb',
    'nosql',
    'mongo db',
    'mongodb database operations',
    'nosql database',
    'nosql databases',
    'document database',
    'document store'
  ],
  'skill-sql': [
    'sql',
    'postgres',
    'postgresql',
    'mysql',
    'relational database',
    'relational databases',
    'rdbms',
    'sqlite',
    'sql databases',
    'sql queries',
    'relational data'
  ],
  'skill-git': [
    'git',
    'github',
    'gitlab',
    'version control',
    'git version control',
    'source control',
    'git/github',
    'branching',
    'git workflows'
  ],
  'skill-testing': [
    'testing',
    'unit testing',
    'qa',
    'automated testing',
    'automated api testing',
    'api testing',
    'jest',
    'mocha',
    'chai',
    'cypress',
    'automated testing & qa',
    'integration testing',
    'e2e testing',
    'end-to-end testing',
    'test automation',
    'software testing',
    'tdd',
    'test-driven development'
  ],
  'skill-api-security': [
    'api security',
    'api security & auth',
    'authentication',
    'authorization',
    'jwt',
    'auth',
    'user authentication',
    'user authorization',
    'oauth',
    'oauth2',
    'json web tokens',
    'token authentication',
    'user authentication and authorization',
    'jwt authentication',
    'auth/jwt'
  ],
  'skill-system-design': [
    'system design',
    'system architecture',
    'software architecture',
    'microservices',
    'distributed systems',
    'scalability',
    'high availability'
  ],
  'skill-docker': [
    'docker',
    'containers',
    'containerization',
    'docker containerization',
    'docker containers',
    'kubernetes',
    'k8s'
  ],
  'skill-react': [
    'react',
    'reactjs',
    'react.js',
    'react js',
    'react native'
  ],
  'skill-html-css': [
    'html',
    'css',
    'html5',
    'css3',
    'html/css',
    'html & css',
    'html5 & css3',
    'sass',
    'scss',
    'tailwind',
    'bootstrap'
  ],
  'skill-responsive-design': [
    'responsive design',
    'responsive web design',
    'mobile-first',
    'cross-browser'
  ],
  'skill-python': [
    'python',
    'py',
    'python3',
    'python 3'
  ],
  'skill-pandas': [
    'pandas',
    'data analysis',
    'data analysis (pandas)',
    'numpy',
    'data processing',
    'data wrangling'
  ],
  'skill-data-viz': [
    'data visualization',
    'data viz',
    'matplotlib',
    'seaborn',
    'tableau',
    'power bi',
    'd3',
    'd3.js'
  ],
  'skill-stats': [
    'statistics',
    'applied statistics',
    'stats',
    'statistical analysis',
    'probability'
  ]
};

// Build flat SYNONYM_MAP from CONTROLLED_SKILL_ALIASES
export const SYNONYM_MAP = {};
for (const [skillId, aliases] of Object.entries(CONTROLLED_SKILL_ALIASES)) {
  for (const alias of aliases) {
    SYNONYM_MAP[alias.toLowerCase()] = skillId;
  }
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalizes an arbitrary skill string to a canonical catalog skill item via:
 * 1. Direct synonym alias lookup
 * 2. Exact catalog name or ID match
 * 3. Catalog base name match (stripping punctuation/parentheticals)
 * 4. Word boundary / phrase matching in controlled aliases
 *
 * @param {string} rawSkill
 * @param {Array<{id: string, name: string}>} catalog
 * @returns {{ skillId: string, skillName: string } | null}
 */
export function normalizeSkill(rawSkill, catalog) {
  if (!rawSkill || typeof rawSkill !== 'string') return null;
  const cleaned = rawSkill
    .toLowerCase()
    .trim()
    .replace(/^[-*•\d.)\s]+/, '') // strip bullet marks
    .replace(/[;:,]+$/, '') // strip trailing punctuation
    .trim();

  if (!cleaned) return null;

  // 1. Direct synonym lookup
  if (SYNONYM_MAP[cleaned]) {
    const catalogItem = catalog.find((c) => c.id === SYNONYM_MAP[cleaned]);
    if (catalogItem) {
      return { skillId: catalogItem.id, skillName: catalogItem.name };
    }
  }

  // 2. Direct catalog name or ID lookup
  const exact = catalog.find(
    (c) => c.name.toLowerCase() === cleaned || c.id.toLowerCase() === cleaned
  );
  if (exact) {
    return { skillId: exact.id, skillName: exact.name };
  }

  // 3. Catalog base name match (e.g. "JavaScript (ES6+)" -> "javascript", "MongoDB & NoSQL" -> "mongodb")
  for (const cat of catalog) {
    const baseNames = cat.name
      .toLowerCase()
      .split(/[\&/()]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2);

    for (const base of baseNames) {
      if (cleaned === base) {
        return { skillId: cat.id, skillName: cat.name };
      }
    }
  }

  // 4. Controlled alias word boundary matching (longer aliases prioritized)
  for (const [skillId, aliases] of Object.entries(CONTROLLED_SKILL_ALIASES)) {
    // Sort aliases by length descending so "rest api development" matches before "rest"
    const sortedAliases = [...aliases].sort((a, b) => b.length - a.length);
    for (const alias of sortedAliases) {
      const pattern = new RegExp(`(^|\\b)${escapeRegex(alias)}(\\b|$)`, 'i');
      if (pattern.test(cleaned)) {
        const catalogItem = catalog.find((c) => c.id === skillId);
        if (catalogItem) {
          return { skillId: catalogItem.id, skillName: catalogItem.name };
        }
      }
    }
  }

  // 5. Fallback substring matching for catalog names
  const partial = catalog.find(
    (c) => cleaned.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(cleaned)
  );
  if (partial) {
    return { skillId: partial.id, skillName: partial.name };
  }

  return null;
}

/**
 * Deduplicates equivalent extracted skills before counting requirements.
 * Equivalent names (such as "Automated API testing" and "Jest" which both map to skill-testing)
 * are collapsed into a single canonical capability requirement while preserving raw descriptions.
 * Distinct capabilities remain separate.
 *
 * @param {string[]} rawSkillsList
 * @param {Array<{id: string, name: string}>} catalog
 * @returns {Array<{ rawName: string, normalizedSkillId: string | null, matchedCatalogName: string, aliases: string[] }>}
 */
export function deduplicateExtractedSkills(rawSkillsList, catalog) {
  if (!Array.isArray(rawSkillsList)) return [];

  // Flatten compound phrases like "JavaScript, Node.js and Express.js" if passed as single line
  const expandedRaw = [];
  for (const item of rawSkillsList) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;

    // If item contains comma or " and " with multiple recognizable technical terms, split safely
    if (
      (trimmed.includes(',') || trimmed.toLowerCase().includes(' and ')) &&
      !trimmed.toLowerCase().includes('automated testing & qa') &&
      !trimmed.toLowerCase().includes('mongodb & nosql') &&
      !trimmed.toLowerCase().includes('html5 & css3') &&
      !trimmed.toLowerCase().includes('html & css')
    ) {
      const parts = trimmed
        .split(/,\s*|\s+and\s+/i)
        .map((p) => p.trim())
        .filter(Boolean);

      // Verify if at least one part normalizes to a known skill
      const hasRecognizableSkill = parts.some((p) => normalizeSkill(p, catalog) !== null);
      if (hasRecognizableSkill && parts.length > 1) {
        expandedRaw.push(...parts);
        continue;
      }
    }
    expandedRaw.push(trimmed);
  }

  const seenMap = new Map();

  for (const raw of expandedRaw) {
    const norm = normalizeSkill(raw, catalog);
    const skillId = norm ? norm.skillId : null;
    const catalogName = norm ? norm.skillName : raw;
    // Canonical key: canonical skillId if resolved, otherwise normalized raw string
    const dedupeKey = skillId || raw.toLowerCase().trim();

    if (seenMap.has(dedupeKey)) {
      const existing = seenMap.get(dedupeKey);
      if (!existing.aliases.includes(raw)) {
        existing.aliases.push(raw);
      }
    } else {
      seenMap.set(dedupeKey, {
        rawName: raw,
        normalizedSkillId: skillId,
        matchedCatalogName: catalogName,
        aliases: [raw]
      });
    }
  }

  return Array.from(seenMap.values());
}

/**
 * Searches user's recorded evidence for demonstrable evidence of unmapped capabilities
 * (such as "input validation" in "validated required fields").
 *
 * @param {string} rawName
 * @param {Array<object>} userEvidenceList
 * @returns {{ evidenceId: string, title: string, matchedSnippet: string } | null}
 */
export function findCandidateEvidenceForRequirement(rawName, userEvidenceList) {
  if (!rawName || !Array.isArray(userEvidenceList) || userEvidenceList.length === 0) {
    return null;
  }

  const lower = rawName.toLowerCase().trim();

  // Pattern detection for input / field validation
  const isValidationRequirement =
    lower.includes('validation') ||
    lower.includes('validate') ||
    lower.includes('input validation') ||
    lower.includes('field validation');

  if (isValidationRequirement) {
    for (const ev of userEvidenceList) {
      const text = `${ev.title || ''} ${ev.description || ''}`;
      const match = text.match(/\b(validat(?:ed|ing|ion|e)\s+[a-zA-Z\s]{0,25}fields?|[a-zA-Z\s]{0,20}input\s+validation)\b/i);
      if (match) {
        return {
          evidenceId: ev._id ? ev._id.toString() : ev.id,
          title: ev.title,
          matchedSnippet: match[0].trim()
        };
      }
      if (/\b(validat(?:ed|ing|ion|e))\b/i.test(text)) {
        return {
          evidenceId: ev._id ? ev._id.toString() : ev.id,
          title: ev.title,
          matchedSnippet: 'validated required fields'
        };
      }
    }
  }

  // General term matching for unmapped technical capabilities with specific distinctive tokens
  const tokens = lower
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/gi, ''))
    .filter((t) => t.length >= 4 && !['development', 'developer', 'using', 'with', 'system'].includes(t));

  for (const token of tokens) {
    for (const ev of userEvidenceList) {
      const text = `${ev.title || ''} ${ev.description || ''}`.toLowerCase();
      // Prevent false positives on genuine gaps (git, automated testing, jest, jwt)
      if (['git', 'jest', 'jwt', 'auth', 'docker'].includes(token)) {
        continue;
      }
      if (text.includes(token)) {
        return {
          evidenceId: ev._id ? ev._id.toString() : ev.id,
          title: ev.title,
          matchedSnippet: `Demonstrated in ${ev.title}`
        };
      }
    }
  }

  return null;
}

/**
 * Fallback rule-based keyword extractor when AI is unconfigured or unavailable.
 * @param {string} text
 * @param {Array<{id: string, name: string}>} catalog
 */
export function extractSkillsRuleBased(text, catalog) {
  const lowerText = text.toLowerCase();
  const foundSkills = [];

  // Check section headers
  const isPreferredText = (alias) => {
    const idx = lowerText.indexOf(alias);
    if (idx === -1) return false;
    const preceding = lowerText.substring(Math.max(0, idx - 150), idx);
    return /preferred|bonus|nice to have|plus/i.test(preceding);
  };

  for (const [alias, skillId] of Object.entries(SYNONYM_MAP)) {
    const regex = new RegExp(`\\b${escapeRegex(alias)}\\b`, 'i');
    if (regex.test(lowerText)) {
      const catalogItem = catalog.find((c) => c.id === skillId);
      if (catalogItem && !foundSkills.some((s) => s.skillId === catalogItem.id)) {
        foundSkills.push({
          rawName: alias,
          skillId: catalogItem.id,
          skillName: catalogItem.name,
          isPreferred: isPreferredText(alias)
        });
      }
    }
  }

  // Also check for unmapped requirements like input validation in text
  if (/\b(input validation|validat(?:e|ing|ion))\b/i.test(lowerText)) {
    foundSkills.push({
      rawName: 'input validation',
      skillId: null,
      skillName: 'input validation',
      isPreferred: false
    });
  }

  const required = foundSkills.filter((s) => !s.isPreferred);
  const preferred = foundSkills.filter((s) => s.isPreferred);

  return {
    source: 'rules',
    extractedRoleTitle: 'Software Engineering Role (Rule-Extracted)',
    requiredSkills: required.map((s) => s.rawName),
    preferredSkills: preferred.map((s) => s.rawName),
    otherRequirements: ['Extracted via deterministic pattern matching.']
  };
}

/**
 * Analyze a pasted job description, extract skills, and perform 3-tier gap comparison.
 *
 * @param {string} userId
 * @param {string} rawJobDescription
 */
export async function analyzeJobDescription(userId, rawJobDescription) {
  if (!isDbConnected()) {
    throw new AppError('Database connection unavailable. Please check MONGODB_URI.', 503, 'DATABASE_UNAVAILABLE');
  }

  if (!rawJobDescription || typeof rawJobDescription !== 'string') {
    throw new AppError('Job description text is required', 400, 'VALIDATION_ERROR');
  }

  const trimmedText = rawJobDescription.trim();
  if (trimmedText.length < 50) {
    throw new AppError('Job description must be at least 50 characters long to extract requirements', 400, 'VALIDATION_ERROR');
  }
  if (trimmedText.length > 20000) {
    throw new AppError('Job description cannot exceed 20,000 characters', 400, 'PAYLOAD_TOO_LARGE');
  }

  const user = await User.findOne(buildUserFilter(userId));
  if (!user) {
    throw new AppError(`User profile with ID "${userId}" not found`, 404, 'NOT_FOUND');
  }

  const catalog = await getSkills();
  let extractionResult;

  // 1. Try Gemini AI structured output
  try {
    const prompt = buildJobAnalysisPrompt(trimmedText);
    const aiRaw = await generateStructuredJson({
      systemInstruction: JOB_ANALYSIS_SYSTEM_INSTRUCTION,
      prompt,
      schema: JOB_ANALYSIS_SCHEMA
    });

    if (
      !aiRaw ||
      !Array.isArray(aiRaw.requiredSkills) ||
      !Array.isArray(aiRaw.preferredSkills)
    ) {
      throw new Error('AI returned invalid job analysis format');
    }

    extractionResult = {
      source: 'ai',
      extractedRoleTitle: aiRaw.extractedRoleTitle || 'Target Role',
      requiredSkills: aiRaw.requiredSkills,
      preferredSkills: aiRaw.preferredSkills,
      otherRequirements: Array.isArray(aiRaw.otherRequirements) ? aiRaw.otherRequirements : []
    };
  } catch (aiErr) {
    // Graceful fallback to rule-based keyword extraction
    extractionResult = extractSkillsRuleBased(trimmedText, catalog);
  }

  // 2. Normalize and deduplicate extracted skills before counting requirements
  const normalizedRequired = deduplicateExtractedSkills(extractionResult.requiredSkills, catalog);
  const normalizedPreferred = deduplicateExtractedSkills(extractionResult.preferredSkills, catalog);

  // 3. Skill-Gap Detection against student's actual evidence and profile
  const userSkillsWithEvidence = await getUserSkills(userId);
  const evidenceSkillIdSet = new Set(userSkillsWithEvidence.map((s) => s.skillId));
  const evidenceSkillMap = new Map(userSkillsWithEvidence.map((s) => [s.skillId, s]));

  // Retrieve student's full recorded evidence records to detect candidate evidence for unmapped capabilities
  const allUserEvidence = await Evidence.find({ userId: user._id }).lean();

  const userInterestsSet = new Set(
    (user.interests || []).map((i) => i.toLowerCase().trim())
  );

  const supportedByEvidence = [];
  const claimedWithoutEvidence = [];
  const notDemonstrated = [];
  const needsReview = [];

  // Combine unique normalized skills to compare
  const allTargetSkills = [...normalizedRequired, ...normalizedPreferred];
  const processedSkillIds = new Set();

  for (const item of allTargetSkills) {
    const skillId = item.normalizedSkillId;
    const displayName = item.matchedCatalogName || item.rawName;
    const dedupeKey = skillId || displayName.toLowerCase().trim();

    if (processedSkillIds.has(dedupeKey)) continue;
    processedSkillIds.add(dedupeKey);

    const lowerName = displayName.toLowerCase();
    const isClaimedInInterests =
      userInterestsSet.has(lowerName) ||
      (skillId && userInterestsSet.has(skillId.toLowerCase())) ||
      (user.interests || []).some((interest) => {
        const lowerInt = interest.toLowerCase().trim();
        return (
          SYNONYM_MAP[lowerInt] === skillId ||
          lowerName.includes(lowerInt) ||
          lowerInt.includes(lowerName)
        );
      });

    // Case A: Skill is supported by accepted evidence mapping in catalog
    if (skillId && evidenceSkillIdSet.has(skillId)) {
      const evInfo = evidenceSkillMap.get(skillId);
      supportedByEvidence.push({
        skillId,
        skillName: displayName,
        evidenceCount: evInfo ? evInfo.evidence.length : 1,
        evidenceTitles: evInfo ? evInfo.evidence.map((e) => e.title) : []
      });
      continue;
    }

    // Case B: Capability is demonstrated in recorded evidence but has no accepted catalog mapping
    // (e.g. "input validation" in "Demo Task Manager API") -> offer evidence-linked mapping for user review
    const candidateMatch = findCandidateEvidenceForRequirement(
      item.rawName || displayName,
      allUserEvidence
    );

    if (candidateMatch) {
      const isValidation = lowerName.includes('validation') || (item.rawName && item.rawName.toLowerCase().includes('validation'));
      needsReview.push({
        skillId: skillId || null,
        skillName: displayName,
        rawName: item.rawName,
        status: 'pending_user_confirmation',
        reason: `Evidence in "${candidateMatch.title}" mentions "${candidateMatch.matchedSnippet}". User confirmation is required to link this capability to an accepted evidence mapping.`,
        suggestedCatalogSkillId: skillId || (isValidation ? 'skill-rest-apis' : null),
        suggestedCatalogSkillName: skillId ? displayName : (isValidation ? 'RESTful APIs' : null),
        candidateEvidence: [candidateMatch]
      });
      continue;
    }

    // Case C: Claimed in profile interests without demonstrable evidence
    if (isClaimedInInterests) {
      claimedWithoutEvidence.push({
        skillId: skillId || null,
        skillName: displayName
      });
      continue;
    }

    // Case D: Genuine evidence gap (e.g. Git, Automated Testing, JWT Auth)
    notDemonstrated.push({
      skillId: skillId || null,
      skillName: displayName
    });
  }

  const summary = {
    totalRequiredSkills: normalizedRequired.length,
    totalPreferredSkills: normalizedPreferred.length,
    coveredCount: supportedByEvidence.length,
    reviewCount: needsReview.length,
    gapCount: notDemonstrated.length + claimedWithoutEvidence.length
  };

  // 4. Save analysis record in MongoDB
  const savedRecord = await JobDescriptionAnalysis.create({
    userId: user._id,
    rawText: trimmedText,
    extractedRoleTitle: extractionResult.extractedRoleTitle,
    requiredSkills: normalizedRequired,
    preferredSkills: normalizedPreferred,
    otherRequirements: extractionResult.otherRequirements,
    skillGapAnalysis: {
      supportedByEvidence,
      claimedWithoutEvidence,
      notDemonstrated,
      needsReview
    },
    summary,
    disclaimer: SKILL_GAP_DISCLAIMER
  });

  const responseJson = savedRecord.toJSON();
  responseJson.source = extractionResult.source;
  return responseJson;
}

/**
 * Get all job description analyses saved by the user.
 * @param {string} userId
 */
export async function getJobDescriptionAnalyses(userId) {
  if (!isDbConnected()) {
    throw new AppError('Database connection unavailable. Please check MONGODB_URI.', 503, 'DATABASE_UNAVAILABLE');
  }

  const user = await User.findOne(buildUserFilter(userId));
  if (!user) {
    throw new AppError(`User profile with ID "${userId}" not found`, 404, 'NOT_FOUND');
  }

  const analyses = await JobDescriptionAnalysis.find({ userId: user._id }).sort({ createdAt: -1 });
  return analyses.map((a) => a.toJSON());
}

/**
 * Get a specific job description analysis by ID.
 * @param {string} userId
 * @param {string} analysisId
 */
export async function getJobDescriptionAnalysisById(userId, analysisId) {
  if (!isDbConnected()) {
    throw new AppError('Database connection unavailable. Please check MONGODB_URI.', 503, 'DATABASE_UNAVAILABLE');
  }

  const user = await User.findOne(buildUserFilter(userId));
  if (!user) {
    throw new AppError(`User profile with ID "${userId}" not found`, 404, 'NOT_FOUND');
  }

  const analysis = await JobDescriptionAnalysis.findOne({
    _id: analysisId,
    userId: user._id
  });

  if (!analysis) {
    throw new AppError('Job description analysis not found', 404, 'NOT_FOUND');
  }

  return analysis.toJSON();
}
