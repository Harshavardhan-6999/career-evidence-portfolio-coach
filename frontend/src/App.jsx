import React, { useState, useEffect } from 'react';
import { authApi, catalogApi, evidenceApi, skillApi, roleGapApi, portfolioApi } from './api/client.js';

import Navbar from './components/Navbar.jsx';
import AuthModal from './components/AuthModal.jsx';
import DashboardOverview from './components/DashboardOverview.jsx';
import ProfileSection from './components/ProfileSection.jsx';
import EvidenceSection from './components/EvidenceSection.jsx';
import SkillsAndGapSection from './components/SkillsAndGapSection.jsx';
import PortfolioSection from './components/PortfolioSection.jsx';
import JobDescriptionSection from './components/JobDescriptionSection.jsx';
import CoachingAndRoadmapSection from './components/CoachingAndRoadmapSection.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [catalogSkills, setCatalogSkills] = useState([]);
  const [evidenceList, setEvidenceList] = useState([]);
  const [userSkills, setUserSkills] = useState([]);
  const [roleGap, setRoleGap] = useState(null);
  const [portfolio, setPortfolio] = useState(null);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [appLoading, setAppLoading] = useState(true);

  // Initialize catalogs and check authentication session
  useEffect(() => {
    async function initApp() {
      try {
        const [rolesRes, skillsRes] = await Promise.all([
          catalogApi.getRoles().catch(() => ({ data: [] })),
          catalogApi.getSkills().catch(() => ({ data: [] }))
        ]);
        setRoles(rolesRes.data || []);
        setCatalogSkills(skillsRes.data || []);

        // Check if session token exists
        const meRes = await authApi.getMe().catch(() => null);
        if (meRes && meRes.data?.user) {
          setUser(meRes.data.user);
        } else {
          setAuthModalOpen(true);
        }
      } catch (err) {
        console.error('App init error:', err);
      } finally {
        setAppLoading(false);
      }
    }

    initApp();
  }, []);

  // Reload user data when user changes
  const reloadUserData = async (currentUser = user) => {
    if (!currentUser || !currentUser.id) return;

    try {
      const [evRes, skRes, gapRes, portRes] = await Promise.all([
        evidenceApi.list(currentUser.id).catch(() => ({ data: [] })),
        skillApi.getUserSkills(currentUser.id).catch(() => ({ data: [] })),
        roleGapApi.getRoleGap(currentUser.id).catch(() => ({ data: null })),
        portfolioApi.get(currentUser.id).catch(() => ({ data: null }))
      ]);

      setEvidenceList(evRes.data || []);
      setUserSkills(skRes.data || []);
      setRoleGap(gapRes.data || null);
      setPortfolio(portRes.data || null);
    } catch (err) {
      console.warn('Error loading student records:', err);
    }
  };

  useEffect(() => {
    if (user) {
      reloadUserData(user);
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('Logout notice:', err);
    }
    localStorage.removeItem('auth_token');
    setUser(null);
    setEvidenceList([]);
    setUserSkills([]);
    setRoleGap(null);
    setPortfolio(null);
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
    setAuthModalOpen(false);
  };

  if (appLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎯</div>
          <div style={{ color: 'var(--text-secondary)' }}>Loading Career Evidence & Portfolio Coach...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      <main className="main-content">
        {!user ? (
          <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Career Evidence & Portfolio Coach
            </h1>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '540px', margin: '0 auto 2rem' }}>
              Substantiate your skills with real projects, certifications, and internships. Map evidence to target career
              expectations and receive AI coaching for interviews and portfolio presentation.
            </p>
            <button className="btn btn-primary" onClick={() => setAuthModalOpen(true)}>
              Sign In / Register Profile
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <>
                <DashboardOverview
                  user={user}
                  roles={roles}
                  evidenceList={evidenceList}
                  userSkills={userSkills}
                  roleGap={roleGap}
                  setActiveTab={setActiveTab}
                />
                <ProfileSection
                  user={user}
                  roles={roles}
                  onProfileUpdated={(updated) => {
                    setUser(updated);
                    reloadUserData(updated);
                  }}
                />
              </>
            )}

            {activeTab === 'evidence' && (
              <EvidenceSection
                userId={user.id}
                evidenceList={evidenceList}
                onReloadEvidence={() => reloadUserData(user)}
                onReloadSkills={() => reloadUserData(user)}
              />
            )}

            {activeTab === 'skills' && (
              <SkillsAndGapSection
                userId={user.id}
                userSkills={userSkills}
                roleGap={roleGap}
                catalogSkills={catalogSkills}
                evidenceList={evidenceList}
                onReloadSkills={() => reloadUserData(user)}
                onReloadRoleGap={() => reloadUserData(user)}
              />
            )}

            {activeTab === 'portfolio' && (
              <PortfolioSection
                userId={user.id}
                evidenceList={evidenceList}
                onReloadPortfolio={() => reloadUserData(user)}
              />
            )}

            {activeTab === 'job-analysis' && <JobDescriptionSection userId={user.id} />}

            {activeTab === 'coaching' && (
              <CoachingAndRoadmapSection userId={user.id} portfolio={portfolio} />
            )}
          </>
        )}
      </main>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        roles={roles}
      />
    </div>
  );
}
