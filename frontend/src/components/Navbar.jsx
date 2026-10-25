import React from 'react';

export default function Navbar({ user, activeTab, setActiveTab, onLogout, onOpenAuth }) {
  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'evidence', label: '📁 Evidence' },
    { id: 'skills', label: '⚡ Skills & Gap' },
    { id: 'portfolio', label: '💼 Portfolio' },
    { id: 'job-analysis', label: '🎯 Job Match' },
    { id: 'coaching', label: '🚀 Coaching & Roadmap' }
  ];

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="brand" onClick={() => setActiveTab('dashboard')} style={{ cursor: 'pointer' }}>
          <span>🎯</span>
          <span>Career Coach</span>
          <span className="brand-badge">CAPSTONE</span>
        </div>

        {user && (
          <nav className="nav-links">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user ? (
            <div className="user-badge">
              <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{user.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                  {user.targetRoleId || 'Student'}
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={onLogout}
                style={{ marginLeft: '0.5rem', padding: '0.2rem 0.5rem' }}
                title="Log out"
              >
                Logout
              </button>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={onOpenAuth}>
              Sign In / Register
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
