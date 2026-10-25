import React, { useState } from 'react';
import { evidenceApi, skillApi } from '../api/client.js';

export default function EvidenceSection({ userId, evidenceList = [], onReloadEvidence, onReloadSkills }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [type, setType] = useState('project');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [supportingUrl, setSupportingUrl] = useState('');

  // AI Skill Suggestion states
  const [analyzingId, setAnalyzingId] = useState(null);
  const [suggestionsModal, setSuggestionsModal] = useState(null); // { evidence, suggestions: [] }
  const [mappingLoading, setMappingLoading] = useState(false);
  const [aiError, setAiError] = useState(null); // { itemId: string, message: string }

  const resetForm = () => {
    setType('project');
    setTitle('');
    setDescription('');
    setDate(new Date().toISOString().slice(0, 10));
    setSupportingUrl('');
    setEditingItem(null);
    setShowAddModal(false);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setType(item.type);
    setTitle(item.title);
    setDescription(item.description);
    setDate(item.date ? item.date.slice(0, 10) : '');
    setSupportingUrl(item.supportingUrl || '');
    setShowAddModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        type,
        title,
        description,
        date,
        supportingUrl: supportingUrl.trim() || undefined
      };

      if (editingItem) {
        await evidenceApi.update(userId, editingItem.id, payload);
      } else {
        await evidenceApi.create(userId, payload);
      }

      resetForm();
      onReloadEvidence();
    } catch (err) {
      alert(`Error saving evidence: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (evidenceId) => {
    if (!confirm('Are you sure you want to delete this evidence record? All associated skill mappings will also be removed.')) {
      return;
    }

    try {
      await evidenceApi.delete(userId, evidenceId);
      onReloadEvidence();
      if (onReloadSkills) onReloadSkills();
    } catch (err) {
      alert(`Error deleting evidence: ${err.message}`);
    }
  };

  const handleAnalyzeSkills = async (item) => {
    if (analyzingId) return; // Prevent duplicate clicks while request is running
    setAnalyzingId(item.id);
    setAiError(null);

    try {
      const res = await evidenceApi.analyzeSkills(userId, item.id);
      setSuggestionsModal({
        evidence: item,
        suggestions: res.data?.suggestedSkills || []
      });
    } catch (err) {
      // Never present fallback data as successful AI response; display clear retry banner
      setAiError({
        itemId: item.id,
        message: err.message || 'AI service request timed out or encountered an error. Please try again.'
      });
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleAcceptSuggestion = async (suggestion) => {
    setMappingLoading(true);
    try {
      await skillApi.createMapping(userId, suggestion.skillId, suggestionsModal.evidence.id);
      alert(`✓ Mapped skill "${suggestion.skillName}" to this evidence!`);
      if (onReloadSkills) onReloadSkills();
      // Remove accepted suggestion from modal list
      setSuggestionsModal((prev) => ({
        ...prev,
        suggestions: prev.suggestions.filter((s) => s.skillId !== suggestion.skillId)
      }));
    } catch (err) {
      alert(`Could not map skill: ${err.message}`);
    } finally {
      setMappingLoading(false);
    }
  };

  const getTypeBadge = (itemType) => {
    switch (itemType) {
      case 'project':
        return <span className="tag tag-cyan">Project</span>;
      case 'certification':
        return <span className="tag tag-green">Certification</span>;
      case 'internship':
        return <span className="tag tag-amber">Internship</span>;
      default:
        return <span className="tag">{itemType}</span>;
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">📁 Career Evidence Records</div>
          <div className="card-subtitle">
            Document projects, certifications, and internships that substantiate your skills
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
          + Add Evidence
        </button>
      </div>

      {evidenceList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📂</div>
          <p>No evidence records found.</p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Add a project, certification, or internship to start mapping your skills.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {evidenceList.map((item) => (
            <div
              key={item.id}
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {getTypeBadge(item.type)}
                  <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{item.title}</h4>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  📅 {item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}
                </div>
              </div>

              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                {item.description}
              </p>

              {item.supportingUrl && (
                <div style={{ marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Link: </span>
                  <a
                    href={item.supportingUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}
                  >
                    {item.supportingUrl} ↗
                  </a>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleAnalyzeSkills(item)}
                  disabled={Boolean(analyzingId)}
                  style={{
                    color: 'var(--accent-cyan)',
                    opacity: analyzingId && analyzingId !== item.id ? 0.6 : 1
                  }}
                  title={analyzingId ? 'Another AI request is currently in progress' : 'Analyze evidence with AI to extract catalog skills'}
                >
                  {analyzingId === item.id ? '⏳ Analyzing with AI (up to 60s)...' : '🤖 AI Suggest Skills'}
                </button>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(item)}>
                    Edit
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}>
                    Delete
                  </button>
                </div>
              </div>

              {/* AI Analysis Failure Banner with Explicit Retry */}
              {aiError && aiError.itemId === item.id && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ color: '#f87171', fontSize: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>⚠️</span>
                    <div>
                      <strong style={{ color: '#ef4444' }}>AI Skill Analysis Failed:</strong> {aiError.message}
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        The AI service timed out or was temporarily unavailable. Never using fallback data.
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setAiError(null)}
                      disabled={Boolean(analyzingId)}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleAnalyzeSkills(item)}
                      disabled={Boolean(analyzingId)}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
                    >
                      🔄 Retry Analysis
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Evidence Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={resetForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="card-title" style={{ marginBottom: '1.25rem' }}>
              {editingItem ? 'Edit Evidence Record' : 'Add New Evidence Record'}
            </div>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Evidence Type</label>
                <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="project">Project</option>
                  <option value="certification">Certification</option>
                  <option value="internship">Internship</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Distributed Task Queue in Node.js"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (Provide details of technologies and problem solved)</label>
                <textarea
                  className="form-textarea"
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your architecture, tools used, results achieved, and technical decisions..."
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Completion / Incident Date</label>
                  <input
                    type="date"
                    className="form-input"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Supporting URL (Optional)</label>
                  <input
                    type="url"
                    className="form-input"
                    value={supportingUrl}
                    onChange={(e) => setSupportingUrl(e.target.value)}
                    placeholder="https://github.com/..."
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Evidence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Skill Suggestion Modal */}
      {suggestionsModal && (
        <div className="modal-backdrop" onClick={() => setSuggestionsModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="card-title" style={{ marginBottom: '0.5rem' }}>
              🤖 AI Skill Suggestions
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Based on evidence: <strong>{suggestionsModal.evidence.title}</strong>
            </div>

            {suggestionsModal.suggestions.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                No additional catalog skills detected from this description.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {suggestionsModal.suggestions.map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{s.skillName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        {s.reason}
                      </div>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleAcceptSuggestion(s)}
                      disabled={mappingLoading}
                    >
                      + Accept & Map
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setSuggestionsModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
