import React, { useState, useEffect } from 'react';
import { jobDescriptionApi } from '../api/client.js';

export default function JobDescriptionSection({ userId }) {
  const [rawText, setRawText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await jobDescriptionApi.list(userId);
      if (res.data) {
        setHistory(res.data);
        if (res.data.length > 0 && !currentAnalysis) {
          setCurrentAnalysis(res.data[0]);
        }
      }
    } catch (err) {
      console.warn('Could not load JD history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (userId) loadHistory();
  }, [userId]);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!rawText.trim() || rawText.trim().length < 10) {
      alert('Please paste a substantial job description (at least 10 characters).');
      return;
    }

    setAnalyzing(true);
    try {
      const res = await jobDescriptionApi.analyze(userId, rawText);
      setCurrentAnalysis(res.data);
      setHistory((prev) => [res.data, ...prev]);
    } catch (err) {
      alert(`Job description analysis failed: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const sampleJd = `We are seeking a Backend Software Engineer to join our cloud platform team.
Requirements:
- Strong experience with Node.js and Express
- Solid understanding of SQL and relational databases
- Experience building RESTful APIs and API security (JWT, authentication)
- Familiarity with Git, unit testing, and Docker containerization
Preferred:
- Experience with MongoDB and NoSQL systems
- Knowledge of system design principles
Qualifications:
- Bachelor's degree in Computer Science or equivalent`;

  return (
    <div>
      {/* Input Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">🎯 AI Job Description Match & Skill Gap</div>
            <div className="card-subtitle">
              Paste a real job posting to extract requirements and evaluate what your documented evidence supports
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setRawText(sampleJd)}
          >
            📋 Load Sample JD
          </button>
        </div>

        <form onSubmit={handleAnalyze}>
          <div className="form-group">
            <label className="form-label">Job Posting Text</label>
            <textarea
              className="form-textarea"
              rows={6}
              required
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste job description requirements, responsibilities, and qualifications..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="submit" className="btn btn-primary" disabled={analyzing}>
              {analyzing ? '🤖 Parsing & Evaluating with Gemini...' : '⚡ Analyze Evidence Match'}
            </button>
          </div>
        </form>
      </div>

      {/* Analysis Results */}
      {currentAnalysis && (
        <div className="card" style={{ border: '1px solid var(--border-focus)' }}>
          <div className="card-header">
            <div>
              <div className="card-title">
                📊 Evaluation: {currentAnalysis.extractedRoleTitle || 'Target Role'}
              </div>
              <div className="card-subtitle">
                Engine: {currentAnalysis.source === 'ai' ? 'Gemini AI' : 'Rule-Based Analyzer'} • Analyzed on{' '}
                {new Date(currentAnalysis.createdAt).toLocaleString()}
              </div>
            </div>
            <span className="tag tag-cyan">{currentAnalysis.source?.toUpperCase() || 'EVALUATION'}</span>
          </div>

          {/* Mandatory Disclaimer */}
          <div className="disclaimer-banner">
            <span>ℹ️</span>
            <div>{currentAnalysis.disclaimer}</div>
          </div>

          {/* Metrics summary */}
          {currentAnalysis.summary && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: currentAnalysis.summary.reviewCount > 0 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
              gap: '1rem',
              margin: '1.25rem 0'
            }}>
              <div style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {currentAnalysis.summary.totalRequiredSkills}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>REQUIRED SKILLS IDENTIFIED</div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-green)' }}>
                  {currentAnalysis.summary.coveredCount}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SUPPORTED BY EVIDENCE</div>
              </div>

              {currentAnalysis.summary.reviewCount > 0 && (
                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                    {currentAnalysis.summary.reviewCount}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>REQUIRES CONFIRMATION</div>
                </div>
              )}

              <div style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                  {currentAnalysis.summary.gapCount}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>EVIDENCE GAPS</div>
              </div>
            </div>
          )}

          {/* Evidence-Linked Mappings for Confirmation / Review */}
          {currentAnalysis.skillGapAnalysis?.needsReview && currentAnalysis.skillGapAnalysis.needsReview.length > 0 && (
            <div style={{
              margin: '1.25rem 0',
              padding: '1rem',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--accent-cyan)',
              borderRadius: 'var(--radius-md)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                <span>🔍</span>
                <span>Evidence-Linked Requirements for Review ({currentAnalysis.skillGapAnalysis.needsReview.length})</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                These job requirements lack an accepted catalog skill mapping, but matching demonstrable evidence was identified in your project records:
              </div>
              {currentAnalysis.skillGapAnalysis.needsReview.map((rev, idx) => (
                <div key={idx} style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rev.skillName}</span>
                    <span className="tag tag-cyan">Confirmation Needed</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                    {rev.reason}
                  </div>
                  {rev.candidateEvidence && rev.candidateEvidence.length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginTop: '0.35rem' }}>
                      📁 Candidate Evidence: <strong>{rev.candidateEvidence[0].title}</strong> &mdash; <em>"{rev.candidateEvidence[0].matchedSnippet}"</em>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 3-Tier Skill Gap Matrix */}
          <div style={{ marginTop: '1.5rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              3-Tier Skill Evidence Matrix
            </h4>

            <div className="matrix-container">
              {/* Column 1: Supported by Evidence */}
              <div className="matrix-column" style={{ borderColor: 'rgba(16, 185, 129, 0.4)' }}>
                <div className="matrix-header" style={{ color: 'var(--accent-green)' }}>
                  <span>✓ Supported by Evidence</span>
                  <span>{currentAnalysis.skillGapAnalysis?.supportedByEvidence?.length || 0}</span>
                </div>

                {(!currentAnalysis.skillGapAnalysis?.supportedByEvidence ||
                  currentAnalysis.skillGapAnalysis.supportedByEvidence.length === 0) ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                    No matching demonstrable evidence records.
                  </div>
                ) : (
                  currentAnalysis.skillGapAnalysis.supportedByEvidence.map((item, idx) => (
                    <div key={idx} className="matrix-item">
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.skillName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--accent-green)', marginTop: '0.2rem' }}>
                        Supported by {item.evidenceCount} evidence items
                      </div>
                      {item.evidenceTitles && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          {item.evidenceTitles.join(', ')}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Column 2: Claimed without Evidence */}
              <div className="matrix-column" style={{ borderColor: 'rgba(245, 158, 11, 0.4)' }}>
                <div className="matrix-header" style={{ color: 'var(--accent-amber)' }}>
                  <span>⚠️ Claimed (No Evidence)</span>
                  <span>{currentAnalysis.skillGapAnalysis?.claimedWithoutEvidence?.length || 0}</span>
                </div>

                {(!currentAnalysis.skillGapAnalysis?.claimedWithoutEvidence ||
                  currentAnalysis.skillGapAnalysis.claimedWithoutEvidence.length === 0) ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                    No claimed unevidenced skills.
                  </div>
                ) : (
                  currentAnalysis.skillGapAnalysis.claimedWithoutEvidence.map((item, idx) => (
                    <div key={idx} className="matrix-item">
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.skillName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--accent-amber)', marginTop: '0.2rem' }}>
                        Mentioned in interests/profile, but lacking evidence record
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Column 3: Not Demonstrated */}
              <div className="matrix-column" style={{ borderColor: 'rgba(244, 63, 94, 0.4)' }}>
                <div className="matrix-header" style={{ color: 'var(--accent-rose)' }}>
                  <span>✕ Not Demonstrated</span>
                  <span>{currentAnalysis.skillGapAnalysis?.notDemonstrated?.length || 0}</span>
                </div>

                {(!currentAnalysis.skillGapAnalysis?.notDemonstrated ||
                  currentAnalysis.skillGapAnalysis.notDemonstrated.length === 0) ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                    Zero missing skills!
                  </div>
                ) : (
                  currentAnalysis.skillGapAnalysis.notDemonstrated.map((item, idx) => (
                    <div key={idx} className="matrix-item">
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.skillName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Required skill not found in evidence or claimed interests
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History List */}
      {history.length > 1 && (
        <div className="card">
          <div className="card-title" style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>
            📜 Previous Analyzed Job Postings
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {history.map((h) => (
              <div
                key={h.id}
                onClick={() => setCurrentAnalysis(h)}
                style={{
                  backgroundColor: currentAnalysis?.id === h.id ? 'var(--bg-surface-hover)' : 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.65rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{h.extractedRoleTitle}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(h.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span className="tag tag-cyan">View Analysis</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
