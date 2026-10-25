/**
 * Module 8: Deterministic Rule-Based Coaching Service
 * Owner: R. Suryaprakash (25071A66C5)
 *
 * Provides transparent, rule-based feedback when AI is unavailable, unconfigured, or failing.
 * Clearly labeled with source: "rules". Never masquerades as AI.
 */

/**
 * Generates rule-based coaching feedback based strictly on submitted portfolio evidence.
 *
 * @param {object} params
 * @param {string} params.targetRoleName
 * @param {Array<{id: string, name: string}>} params.expectedSkills
 * @param {Array<{id: string, type: string, title: string, description: string, supportingUrl?: string, mappedSkills: Array<{skillId: string, skillName: string}>}>} params.selectedEvidence
 * @param {string} [params.aiStatus='unavailable']
 * @returns {{ source: 'rules', aiStatus: string, strengths: Array, evidenceGaps: Array, nextSteps: Array, roadmap: Array }}
 */
export function generateRuleBasedCoaching({
  targetRoleName,
  expectedSkills,
  selectedEvidence,
  aiStatus = 'unavailable'
}) {
  const strengths = [];
  const evidenceGaps = [];
  const nextSteps = [];

  const expectedSkillIds = new Set(expectedSkills.map((s) => s.id));
  const expectedSkillMap = new Map(expectedSkills.map((s) => [s.id, s.name]));

  // Track skills covered by the portfolio
  const coveredSkillIds = new Set();
  const evidenceCoveringSkill = new Map();

  for (const ev of selectedEvidence) {
    if (ev.mappedSkills && ev.mappedSkills.length > 0) {
      for (const sk of ev.mappedSkills) {
        coveredSkillIds.add(sk.skillId);
        if (!evidenceCoveringSkill.has(sk.skillId)) {
          evidenceCoveringSkill.set(sk.skillId, []);
        }
        evidenceCoveringSkill.get(sk.skillId).push(ev.id);
      }
    }
  }

  // 1. Identify Strengths from evidenced skills matching target role
  for (const skillId of expectedSkillIds) {
    if (coveredSkillIds.has(skillId)) {
      const skillName = expectedSkillMap.get(skillId) || skillId;
      const supportingIds = evidenceCoveringSkill.get(skillId) || [];
      strengths.push({
        statement: `Documented evidence supports key role skill "${skillName}" through ${supportingIds.length} portfolio record(s).`,
        supportingEvidenceIds: supportingIds
      });
    }
  }

  // Also highlight evidence with verified URLs
  const evidenceWithUrls = selectedEvidence.filter((e) => e.supportingUrl);
  if (evidenceWithUrls.length > 0) {
    strengths.push({
      statement: `${evidenceWithUrls.length} portfolio item(s) include external repository/artifact URLs for inspection.`,
      supportingEvidenceIds: evidenceWithUrls.map((e) => e.id)
    });
  }

  if (strengths.length === 0) {
    strengths.push({
      statement: 'Initial portfolio created with selected evidence entries ready for skill mapping.',
      supportingEvidenceIds: selectedEvidence.map((e) => e.id)
    });
  }

  // 2. Identify Evidence Gaps (expected skills lacking evidence in portfolio)
  for (const skill of expectedSkills) {
    if (!coveredSkillIds.has(skill.id)) {
      evidenceGaps.push({
        statement: `No documented evidence mapped for expected ${targetRoleName} skill: "${skill.name}". Note: Missing evidence does not imply lack of ability.`,
        supportingEvidenceIds: []
      });
    }
  }

  // Check for missing supporting URLs
  const missingUrls = selectedEvidence.filter((e) => !e.supportingUrl);
  if (missingUrls.length > 0) {
    evidenceGaps.push({
      statement: `${missingUrls.length} selected evidence record(s) lack a supporting public URL (e.g. GitHub repository, demo, or credential page).`,
      supportingEvidenceIds: missingUrls.map((e) => e.id)
    });
  }

  // 3. Prioritized Next Steps
  const unevidencedSkills = expectedSkills.filter((s) => !coveredSkillIds.has(s.id));
  if (unevidencedSkills.length > 0) {
    const topGap = unevidencedSkills[0];
    nextSteps.push({
      action: `Build and document a hands-on mini-project demonstrating "${topGap.name}".`,
      reason: `Directly provides verifiable evidence for an expected core skill in the ${targetRoleName} role.`,
      priority: 'high',
      supportingEvidenceIds: []
    });

    if (unevidencedSkills.length > 1) {
      const secondGap = unevidencedSkills[1];
      nextSteps.push({
        action: `Complete a laboratory or open-source module illustrating "${secondGap.name}".`,
        reason: `Expands evidence breadth for ${targetRoleName} competencies.`,
        priority: 'medium',
        supportingEvidenceIds: []
      });
    }
  }

  // Medium priority: add supporting URLs if missing
  if (missingUrls.length > 0) {
    nextSteps.push({
      action: `Attach repository or artifact URLs to existing evidence records (${missingUrls.map((m) => m.title).slice(0, 2).join(', ')}).`,
      reason: 'Allows reviewers to independently inspect code quality, tests, and project scope.',
      priority: 'medium',
      supportingEvidenceIds: missingUrls.map((m) => m.id)
    });
  }

  // Low priority: check description lengths
  const shortDescriptions = selectedEvidence.filter((e) => e.description && e.description.length < 60);
  if (shortDescriptions.length > 0) {
    nextSteps.push({
      action: 'Expand evidence descriptions to detail specific architecture, technologies, and measurable outcomes.',
      reason: 'Clearer technical descriptions enable more accurate skill extraction and portfolio evaluation.',
      priority: 'low',
      supportingEvidenceIds: shortDescriptions.map((e) => e.id)
    });
  }

  // 4. Generate Interactive Roadmap Tasks
  const roadmap = nextSteps.map((step, idx) => ({
    id: `task-${idx + 1}`,
    task: step.action,
    reason: step.reason,
    priority: step.priority,
    status: 'todo',
    supportingEvidenceIds: step.supportingEvidenceIds || []
  }));

  return {
    source: 'rules',
    aiStatus,
    strengths,
    evidenceGaps,
    nextSteps,
    roadmap
  };
}
