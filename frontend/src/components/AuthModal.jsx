import React, { useState } from 'react';
import { authApi } from '../api/client.js';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, roles = [] }) {
  if (!isOpen) return null;

  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [education, setEducation] = useState('B.Tech in Computer Science, 3rd Year');
  const [targetRoleId, setTargetRoleId] = useState(roles[0]?.id || 'role-backend-dev');
  const [interests, setInterests] = useState('Node.js, Databases, Microservices');
  const [bio, setBio] = useState('Passionate software engineering student.');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await authApi.login(email, password);
        onAuthSuccess(res.data.user);
      } else {
        const interestsArray = interests
          .split(',')
          .map((i) => i.trim())
          .filter(Boolean);

        const res = await authApi.register({
          name,
          email,
          password,
          education,
          targetRoleId,
          interests: interestsArray,
          bio
        });
        onAuthSuccess(res.data.user);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="tabs" style={{ marginBottom: '1.25rem' }}>
          <button
            className={`tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setError('');
            }}
          >
            Student Login
          </button>
          <button
            className={`tab-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setError('');
            }}
          >
            Create Student Profile
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 'var(--radius-md)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              marginBottom: '1rem'
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Career Role</label>
                <select
                  className="form-select"
                  value={targetRoleId}
                  onChange={(e) => setTargetRoleId(e.target.value)}
                  required
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Education / University</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder="Degree, major, year of study"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Technical Interests (comma separated)</label>
                <input
                  type="text"
                  className="form-input"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="e.g. Distributed Systems, APIs, React"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Short Biography</label>
                <textarea
                  className="form-textarea"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about your learning goals..."
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@college.edu"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
