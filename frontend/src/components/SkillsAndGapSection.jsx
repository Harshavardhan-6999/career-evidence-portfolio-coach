import React, { useState } from 'react';
import { skillApi } from '../api/client.js';

export default function SkillsAndGapSection({
  userId,
  userSkills = [],
  roleGap = null,
  catalogSkills = [],
  evidenceList = [],
  onReloadSkills,
  onReloadRoleGap
}) {
  const [selectedSkillId, setSelectedSkillId] = useState(catalogSkills[0]?.id || '');
  const [selectedEvidenceId, setSelectedEvidenceId] = useState(evidenceList[0]?.id || '');
  const [mappingLoading, setMappingLoading] = useState(false);

  const handleCreateMapping = async (e) => {
    e.preventDefault();
    if (!selectedSkillId || !selectedEvidenceId) return;

    setMappingLoading(true);
    try {
      await skillApi.createMapping(userId, selectedSkillId, selectedEvidenceId);
      onReloadSkills();
      if (onReloadRoleGap) onReloadRoleGap();
    } catch (err) {
      alert(`Could not create mapping: ${err.message}`);
    } finally {
      setMappingLoading(false);
    }
  };

  const handleDeleteMapping = async (mappingId) => {
    try {
      await skillApi.deleteMapping(userId, mappingId);
      onReloadSkills();
      if (onReloadRoleGap) onReloadRoleGap();
    } catch (err) {
      alert(`Could not delete mapping: ${err.message}`);
    }
  };

  return (
    <div>
      {/* Role Gap Analysis Card */}
      {roleGap && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">🎯 Target Role Gap Analysis</div>
              <div className="card-subtitle">
                Comparing your demonstrable evidence against the catalog expectations for{' '}
                <strong>{roleGap.roleName}</strong>
              </div>
            </div>
            <span className="tag tag-cyan">Target Role</span>
          </div>

          <div className="disclaimer-banner">
            <span>ℹ️</span>
            <div>{roleGap.disclaimer}</div>
          </div>

          <div className="grid-2" style={{ marginTop: '1.25rem' }}>
            {/* Skills with Evidence */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem'
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: 'var(--accent-green)',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem'
                }}
              >
                <span>✓</span> Demonstrable Skills With Evidence ({roleGap.skillsWithEvidence.length})
              </div>

              {roleGap.skillsWithEvidence.length === 0 ? (
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  No target role skills currently have mapped evidence records.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {roleGap.skillsWithEvidence.map((s) => (
                    <div
                      key={s.skillId}
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        padding: '0.6rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.85rem'
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{s.skillName}</span>
                      <span className="tag tag-green">{s.evidenceCount} evidence items</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Skills Lacking Evidence */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem'
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: 'var(--accent-amber)',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem'
                }}
              >
                <span>⚠️</span> Target Role Skills Lacking Evidence ({roleGap.skillsLackingEvidence.length})
              </div>

              {roleGap.skillsLackingEvidence.length === 0 ? (
                <p style={{ fontSize: '0.8125rem', color: 'var(--accent-green)' }}>
                  Outstanding! You have documented evidence mapped to all expected role skills.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {roleGap.skillsLackingEvidence.map((s) => (
                    <div
                      key={s.skillId}
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        padding: '0.6rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.85rem'
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{s.skillName}</span>
                      <span className="tag tag-amber">Needs evidence</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mapped Skills & Evidence Links */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">⚡ Evidence-Backed Skills</div>
            <div className="card-subtitle">
              Verified mappings connecting catalog technical competencies to your documented projects
            </div>
          </div>
        </div>

        {/* Manual Mapping Form */}
        {evidenceList.length > 0 && catalogSkills.length > 0 && (
          <form
            onSubmit={handleCreateMapping}
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              marginBottom: '1.5rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              alignItems: 'flex-end'
            }}
          >
            <div style={{ flex: '1 1 200px' }}>
              <label className="form-label">Select Skill</label>
              <select
                className="form-select"
                value={selectedSkillId}
                onChange={(e) => setSelectedSkillId(e.target.value)}
              >
                {catalogSkills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: '1 1 240px' }}>
              <label className="form-label">Map to Evidence Record</label>
              <select
                className="form-select"
                value={selectedEvidenceId}
                onChange={(e) => setSelectedEvidenceId(e.target.value)}
              >
                {evidenceList.map((e) => (
                  <option key={e.id} value={e.id}>
                    [{e.type.toUpperCase()}] {e.title}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn btn-primary" disabled={mappingLoading}>
              {mappingLoading ? 'Mapping...' : '+ Link Skill'}
            </button>
          </form>
        )}

        {/* Mapped Skills List */}
        {userSkills.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
            No skills mapped yet. Use the link form above or click <strong>AI Suggest Skills</strong> on an evidence card.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {userSkills.map((s) => (
              <div
                key={s.skillId}
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.skillName}</span>
                  <span className="tag tag-cyan">{s.evidenceCount} records</span>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  SUPPORTED BY:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {(s.supportingEvidence || []).map((e) => (
                    <div
                      key={e.mappingId}
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        padding: '0.35rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.75rem'
                      }}
                    >
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                        {e.title}
                      </span>
                      <button
                        onClick={() => handleDeleteMapping(e.mappingId)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                        title="Remove mapping"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
