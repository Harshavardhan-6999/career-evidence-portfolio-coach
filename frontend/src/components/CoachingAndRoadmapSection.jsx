import React, { useState, useEffect } from 'react';
import { coachingApi } from '../api/client.js';

export default function CoachingAndRoadmapSection({ userId, portfolio = null }) {
  const [coaching, setCoaching] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  const loadLatestCoaching = async () => {
    setLoading(true);
    try {
      const res = await coachingApi.getLatest(userId);
      if (res.data) {
        setCoaching(res.data);
      }
    } catch (err) {
      // 404 is normal if no coaching generated yet
      setCoaching(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) loadLatestCoaching();
  }, [userId]);

  const handleGenerateCoaching = async () => {
    if (!portfolio || !portfolio.selectedEvidence || portfolio.selectedEvidence.length === 0) {
      alert('Your portfolio must contain at least one selected evidence item before coaching can be generated.');
      return;
    }

    setGenerating(true);
    try {
      const res = await coachingApi.generate(userId);
      setCoaching(res.data);
    } catch (err) {
      alert(`Could not generate coaching: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    if (!coaching || !coaching.id) return;
    setUpdatingTaskId(taskId);

    try {
      const res = await coachingApi.updateRoadmapTask(userId, coaching.id, taskId, newStatus);
      setCoaching(res.data);
    } catch (err) {
      alert(`Failed to update task progress: ${err.message}`);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Compute roadmap metrics
  const roadmapTasks = coaching?.roadmap || [];
  const completedCount = roadmapTasks.filter((t) => t.status === 'completed').length;
  const inProgressCount = roadmapTasks.filter((t) => t.status === 'in_progress').length;
  const progressPercent = roadmapTasks.length > 0 ? Math.round((completedCount / roadmapTasks.length) * 100) : 0;

  const getPriorityTag = (p) => {
    switch (p) {
      case 'high':
        return <span className="tag tag-rose">HIGH PRIORITY</span>;
      case 'medium':
        return <span className="tag tag-amber">MEDIUM</span>;
      default:
        return <span className="tag tag-cyan">LOW</span>;
    }
  };

  return (
    <div>
      {/* Coaching Header Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">🚀 AI Career Coaching & Roadmap</div>
            <div className="card-subtitle">
              Evidence-based feedback generated specifically for your curated portfolio against your target role
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleGenerateCoaching}
            disabled={generating}
          >
            {generating ? '🤖 Analyzing with Gemini...' : '⚡ Generate New Coaching'}
          </button>
        </div>

        {/* Staleness Banner */}
        {coaching?.isStale && (
          <div className="staleness-banner">
            <div>
              <strong>⚠️ Inputs Have Changed:</strong> Your portfolio evidence or mapped skills were modified since this
              coaching was generated ({coaching.staleReasons?.join('; ')}).
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleGenerateCoaching}
              disabled={generating}
            >
              Re-run Coaching
            </button>
          </div>
        )}

        {/* Mandatory Disclaimer */}
        <div className="disclaimer-banner">
          <span>ℹ️</span>
          <div>
            Evaluates what the supplied evidence supports; does not claim to verify qualifications, guarantee job
            placement, or predict hiring success. Missing evidence does not prove lack of ability.
          </div>
        </div>

        {!coaching ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎯</div>
            <p style={{ fontSize: '1.05rem', fontWeight: 600 }}>No Coaching Feedback Generated Yet</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Assemble your portfolio with at least one evidence item, then click <strong>Generate New Coaching</strong>.
            </p>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span>Evaluation Engine: <strong>{coaching.source === 'ai' ? 'Gemini AI' : 'Deterministic Rules'}</strong></span>
              <span>•</span>
              <span>Generated: <strong>{new Date(coaching.createdAt).toLocaleString()}</strong></span>
            </div>

            {/* Strengths & Evidence Gaps Grid */}
            <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
              {/* Strengths */}
              <div
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem'
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--accent-green)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                  ✓ Validated Strengths
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {coaching.strengths.map((str, idx) => (
                    <div key={idx} style={{ backgroundColor: 'var(--bg-primary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{str.statement}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evidence Gaps */}
              <div
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem'
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--accent-amber)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                  ⚠️ Evidence Gaps
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {coaching.evidenceGaps.map((gap, idx) => (
                    <div key={idx} style={{ backgroundColor: 'var(--bg-primary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{gap.statement}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Next Steps */}
            {coaching.nextSteps && coaching.nextSteps.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div className="card-title" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
                  📋 Prioritized Strategic Guidance
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {coaching.nextSteps.map((step, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.85rem 1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1rem'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{step.action}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          {step.reason}
                        </div>
                      </div>
                      {getPriorityTag(step.priority)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interactive Career Roadmap Card */}
      {coaching && roadmapTasks.length > 0 && (
        <div className="card" style={{ border: '1px solid var(--border-focus)' }}>
          <div className="card-header">
            <div>
              <div className="card-title">🗺️ Interactive Career Roadmap Checklist</div>
              <div className="card-subtitle">
                Track your active progress addressing evidence gaps ({completedCount} of {roadmapTasks.length} tasks completed)
              </div>
            </div>
            <span className="tag tag-cyan">{progressPercent}% Progress</span>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
              margin: '0.5rem 0 1.5rem'
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                backgroundColor: 'var(--accent-green)',
                transition: 'width 0.3s ease'
              }}
            />
          </div>

          {/* Roadmap Tasks List */}
          <div className="roadmap-list">
            {roadmapTasks.map((task) => (
              <div
                key={task.id}
                className={`roadmap-card ${task.status === 'completed' ? 'completed' : ''}`}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    {getPriorityTag(task.priority)}
                    <span className="task-title" style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {task.task}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{task.reason}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <select
                    className="form-select"
                    style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                    value={task.status}
                    onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                    disabled={updatingTaskId === task.id}
                  >
                    <option value="todo">⏳ To Do</option>
                    <option value="in_progress">🔄 In Progress</option>
                    <option value="completed">✓ Completed</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
