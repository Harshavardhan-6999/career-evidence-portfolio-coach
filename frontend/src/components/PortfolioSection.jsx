import React, { useState, useEffect } from 'react';
import { portfolioApi } from '../api/client.js';

export default function PortfolioSection({ userId, evidenceList = [], onReloadPortfolio }) {
  const [portfolio, setPortfolio] = useState(null);
  const [title, setTitle] = useState('My Career Evidence Portfolio');
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const loadPortfolio = async () => {
    setLoading(true);
    try {
      const res = await portfolioApi.get(userId);
      if (res.data) {
        setPortfolio(res.data);
        setTitle(res.data.title || 'My Career Evidence Portfolio');
        setSelectedIds((res.data.selectedEvidence || []).map((e) => e.id));
      }
    } catch (err) {
      // 404 means no portfolio created yet, default to all evidence
      if (evidenceList.length > 0) {
        setSelectedIds(evidenceList.map((e) => e.id));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) loadPortfolio();
  }, [userId]);

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const moveItem = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= selectedIds.length) return;

    const copy = [...selectedIds];
    const temp = copy[index];
    copy[index] = copy[newIndex];
    copy[newIndex] = temp;
    setSelectedIds(copy);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      alert('Please select at least one evidence item to include in your portfolio.');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const res = await portfolioApi.upsert(userId, title, selectedIds);
      setPortfolio(res.data);
      setMessage('✓ Portfolio updated successfully!');
      if (onReloadPortfolio) onReloadPortfolio();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(`Error saving portfolio: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const evidenceMap = new Map(evidenceList.map((e) => [e.id, e]));

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">💼 Curate Career Portfolio</div>
            <div className="card-subtitle">
              Select and order the most relevant evidence to represent your skills to reviewers
            </div>
          </div>
        </div>

        {message && (
          <div style={{ color: 'var(--accent-green)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Portfolio Title</label>
            <input
              type="text"
              className="form-input"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Full-Stack Engineering Capstone Portfolio"
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Selected Evidence & Presentation Order</label>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Use the arrows to adjust presentation priority. Reviewers evaluate items in this sequence.
            </div>

            {selectedIds.length === 0 ? (
              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No evidence selected. Choose from the available records below.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedIds.map((id, idx) => {
                  const ev = evidenceMap.get(id);
                  return (
                    <div
                      key={id}
                      style={{
                        backgroundColor: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--accent-cyan)', width: '20px' }}>
                          #{idx + 1}
                        </span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{ev ? ev.title : id}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {ev ? `${ev.type.toUpperCase()} • ${ev.date?.slice(0, 10)}` : 'Evidence item'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => moveItem(idx, -1)}
                          disabled={idx === 0}
                          title="Move up"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => moveItem(idx, 1)}
                          disabled={idx === selectedIds.length - 1}
                          title="Move down"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => toggleSelect(id)}
                          title="Remove from portfolio"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Unselected Evidence Bank */}
          {evidenceList.filter((e) => !selectedIds.includes(e.id)).length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Available Unselected Evidence Bank:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {evidenceList
                  .filter((e) => !selectedIds.includes(e.id))
                  .map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => toggleSelect(e.id)}
                    >
                      + Include "{e.title}"
                    </button>
                  ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={saving || selectedIds.length === 0}>
              {saving ? 'Saving...' : '💾 Save Portfolio Assembly'}
            </button>
          </div>
        </form>
      </div>

      {/* Live Assembled Preview */}
      {portfolio && portfolio.selectedEvidence && (
        <div className="card" style={{ border: '1px solid var(--border-focus)' }}>
          <div className="card-header">
            <div>
              <div className="card-title">👁️ Live Assembled Portfolio Preview</div>
              <div className="card-subtitle">
                This exact assembled record is evaluated by reviewers and the AI coach
              </div>
            </div>
            <span className="tag tag-green">Assembled Record</span>
          </div>

          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{portfolio.title}</h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Candidate: <strong>{portfolio.user?.name}</strong> • Target Role: <strong>{portfolio.user?.targetRoleId}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {portfolio.selectedEvidence.map((ev, idx) => (
              <div
                key={ev.id}
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span className="tag tag-cyan">#{idx + 1}</span>
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>{ev.title}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ev.date?.slice(0, 10)}</span>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  {ev.description}
                </p>

                {ev.mappedSkills && ev.mappedSkills.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                      DEMONSTRATED SKILLS:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {ev.mappedSkills.map((m, mIdx) => (
                        <span key={mIdx} className="tag tag-green">
                          ✓ {m.skillName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
