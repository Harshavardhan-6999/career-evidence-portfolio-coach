import React from 'react';

export default function DashboardOverview({
  user,
  roles = [],
  evidenceList = [],
  userSkills = [],
  roleGap = null,
  setActiveTab
}) {
  const currentRole = roles.find((r) => r.id === user.targetRoleId);

  return (
    <div>
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(6, 182, 212, 0.15))',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          marginBottom: '2rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="tag tag-cyan" style={{ marginBottom: '0.5rem' }}>
              🎯 {currentRole ? currentRole.name : user.targetRoleId}
            </span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>
              Welcome back, {user.name}
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: '650px' }}>
              Your demonstrable evidence portfolio substantiates your technical readiness. Evaluate what your evidence
              supports and build an actionable roadmap.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={() => setActiveTab('evidence')}>
              + Add Evidence
            </button>
            <button className="btn btn-secondary" onClick={() => setActiveTab('coaching')}>
              🚀 Coaching
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid-3" style={{ marginBottom: '2rem' }}>
        <div
          className="card"
          onClick={() => setActiveTab('evidence')}
          style={{ cursor: 'pointer', margin: 0 }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>RECORDED EVIDENCE</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-cyan)', margin: '0.25rem 0' }}>
            {evidenceList.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Projects, certifications & internships →
          </div>
        </div>

        <div
          className="card"
          onClick={() => setActiveTab('skills')}
          style={{ cursor: 'pointer', margin: 0 }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>MAPPED SKILLS</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-green)', margin: '0.25rem 0' }}>
            {userSkills.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Competencies supported by evidence →
          </div>
        </div>

        <div
          className="card"
          onClick={() => setActiveTab('skills')}
          style={{ cursor: 'pointer', margin: 0 }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>TARGET ROLE COVERAGE</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', margin: '0.25rem 0' }}>
            {roleGap ? `${roleGap.skillsWithEvidence.length} / ${roleGap.skillsWithEvidence.length + roleGap.skillsLackingEvidence.length}` : '—'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Expected skills demonstrable →
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid-2">
        <div className="card">
          <div className="card-title" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
            🎯 Job Description Analyzer
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Paste a posting for your target role. Gemini will parse required skills and compare them directly against your
            evidence into Supported, Claimed, and Not Demonstrated tiers.
          </p>
          <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('job-analysis')}>
            Open Job Matcher →
          </button>
        </div>

        <div className="card">
          <div className="card-title" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
            🗺️ Career Roadmap Checklist
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Turn detected evidence gaps into actionable development tasks. Mark tasks as To Do, In Progress, and Completed
            as you build new projects.
          </p>
          <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('coaching')}>
            View Career Roadmap →
          </button>
        </div>
      </div>
    </div>
  );
}
