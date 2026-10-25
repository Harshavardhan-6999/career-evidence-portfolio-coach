import React, { useState } from 'react';
import { userApi } from '../api/client.js';

export default function ProfileSection({ user, onProfileUpdated, roles = [] }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [education, setEducation] = useState(user.education);
  const [targetRoleId, setTargetRoleId] = useState(user.targetRoleId);
  const [interests, setInterests] = useState((user.interests || []).join(', '));
  const [bio, setBio] = useState(user.bio || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const currentRole = roles.find((r) => r.id === user.targetRoleId);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const interestsArray = interests
        .split(',')
        .map((i) => i.trim())
        .filter(Boolean);

      const res = await userApi.updateProfile(user.id, {
        name,
        education,
        targetRoleId,
        interests: interestsArray,
        bio
      });

      onProfileUpdated(res.data);
      setIsEditing(false);
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(`Error updating profile: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">👤 Student Career Profile</div>
          <div className="card-subtitle">Manage your educational baseline and target career trajectory</div>
        </div>
        {!isEditing && (
          <button className="btn btn-secondary btn-sm" onClick={() => setIsEditing(true)}>
            ✏️ Edit Profile
          </button>
        )}
      </div>

      {message && (
        <div style={{ color: 'var(--accent-green)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          ✓ {message}
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleSave}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                className="form-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Target Role</label>
              <select
                className="form-select"
                value={targetRoleId}
                onChange={(e) => setTargetRoleId(e.target.value)}
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Education</label>
            <input
              className="form-input"
              type="text"
              required
              value={education}
              onChange={(e) => setEducation(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Interests (comma separated)</label>
            <input
              className="form-input"
              type="text"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Bio / Career Aspiration</label>
            <textarea
              className="form-textarea"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsEditing(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        <div>
          <div className="grid-2" style={{ marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>STUDENT NAME</div>
              <div style={{ fontWeight: 600, fontSize: '1rem' }}>{user.name}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TARGET ROLE</div>
              <span className="tag tag-cyan" style={{ fontSize: '0.85rem' }}>
                🎯 {currentRole ? currentRole.name : user.targetRoleId}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>EDUCATION</div>
            <div style={{ fontSize: '0.9rem' }}>{user.education}</div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              TECHNICAL INTERESTS
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {(user.interests || []).length > 0 ? (
                user.interests.map((interest, idx) => (
                  <span key={idx} className="tag">
                    {interest}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No interests listed</span>
              )}
            </div>
          </div>

          {user.bio && (
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>BIOGRAPHY</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {user.bio}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
