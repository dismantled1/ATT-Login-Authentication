import React, { useEffect, useState } from 'react';
import { formatDate, roleLabel } from '../data/demoData';
import MyAccountPage from './admin/MyAccountPage';

const USER_ROUTES = {
  console: '#/console',
  myAccount: '#/my-account',
};

const pageFromHash = () => {
  switch (window.location.hash) {
    case USER_ROUTES.myAccount: return 'myAccount';
    case USER_ROUTES.console:
    default:                    return 'console';
  }
};

function UserView({ currentUser, users, projects, onToggleTouchpoint, onUpdateMyAccount, auditLog = [] }) {
  const [activePage, setActivePage] = useState(pageFromHash);
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');

  useEffect(() => {
    if (!window.location.hash || !Object.values(USER_ROUTES).includes(window.location.hash)) {
      window.location.hash = USER_ROUTES.console;
    }
    const syncRoute = () => setActivePage(pageFromHash());
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  useEffect(() => {
    if (!projects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(projects[0]?.id || '');
    }
  }, [projects, selectedProjectId]);

  const navigate = (page) => {
    window.location.hash = USER_ROUTES[page];
    setActivePage(page);
  };

  const selectedProject = projects.find((project) => project.id === selectedProjectId) || projects[0];
  const isManager = currentUser.role === 'manager';
  const canEditSelected = isManager && selectedProject?.transitionManagerUid === currentUser.uid;
  const managerName = users.find((user) => user.uid === selectedProject?.transitionManagerUid)?.name || 'Unassigned';

  return (
    <div id="userView" className="animate-fade-in">
      {/* ── Top nav bar for user view ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 0 18px 0', borderBottom: '1px solid var(--line)', marginBottom: 24
      }}>
        <button
          className={activePage === 'console' ? 'btn-primary' : 'btn-secondary'}
          style={{ fontSize: 13, padding: '6px 18px', minHeight: 36 }}
          onClick={() => navigate('console')}
        >
          <i className="ti ti-layout-grid" style={{ marginRight: 6 }}></i>
          Transition Console
        </button>
        <button
          className={activePage === 'myAccount' ? 'btn-primary' : 'btn-secondary'}
          style={{ fontSize: 13, padding: '6px 18px', minHeight: 36 }}
          onClick={() => navigate('myAccount')}
        >
          <i className="ti ti-user-circle" style={{ marginRight: 6 }}></i>
          My Account
        </button>
      </div>

      {/* ── My Account Page ── */}
      {activePage === 'myAccount' && (
        <MyAccountPage
          currentUser={currentUser}
          projects={projects}
          auditLog={auditLog}
          onRenewAccess={null}
          onUpdateMyAccount={onUpdateMyAccount}
        />
      )}

      {/* ── Transition Console ── */}
      {activePage === 'console' && (
        <div className="workspace-grid">
          <section className="workspace-hero">
            <div>
              <span className="eyebrow">{roleLabel(currentUser.role)}</span>
              <h1>Transition Console</h1>
              <p>
                Your session is scoped to {projects.length} assigned project{projects.length === 1 ? '' : 's'}.
                Managers can update their project checklist; users can inspect progress and milestones.
              </p>
            </div>
          </section>

          <section className="stat-row">
            <div className="stat-card">
              <div className="label">Assigned Projects</div>
              <div className="val">{projects.length}</div>
            </div>
            <div className="stat-card">
              <div className="label">Average Progress</div>
              <div className="val green">
                {projects.length ? Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length) : 0}%
              </div>
            </div>
            <div className="stat-card">
              <div className="label">Editable</div>
              <div className="val amber">{projects.filter((project) => project.transitionManagerUid === currentUser.uid).length}</div>
            </div>
          </section>

          {projects.length === 0 ? (
            <section className="panel empty-state">No projects are assigned to this account yet.</section>
          ) : (
            <section className="split-layout user-console">
              <div className="panel">
                <div className="panel-head">
                  <div>
                    <h3>Assigned Projects</h3>
                    <p>Project visibility follows your tenant/project assignment.</p>
                  </div>
                </div>
                <div className="project-list">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      className={selectedProject?.id === project.id ? 'active' : ''}
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      <span>
                        <strong>{project.name}</strong>
                        <small>{project.clientName} · {project.status}</small>
                      </span>
                      <em>{project.progress}%</em>
                    </button>
                  ))}
                </div>
              </div>

              <div className="panel project-workspace">
                <div className="project-title-row">
                  <div>
                    <span className="eyebrow">{selectedProject.tenantName}</span>
                    <h2>{selectedProject.name}</h2>
                    <p>{selectedProject.description}</p>
                  </div>
                  <span className={`status-pill ${selectedProject.status.toLowerCase().replaceAll(' ', '-')}`}>{selectedProject.status}</span>
                </div>

                <div className="project-facts">
                  <div><span>Client</span><strong>{selectedProject.clientName}</strong></div>
                  <div><span>Start</span><strong>{formatDate(selectedProject.startDate)}</strong></div>
                  <div><span>End</span><strong>{formatDate(selectedProject.endDate)}</strong></div>
                  <div><span>Manager</span><strong>{managerName}</strong></div>
                </div>

                <div className="progress-block">
                  <div>
                    <span>Transition readiness</span>
                    <strong>{selectedProject.progress}%</strong>
                  </div>
                  <div className="progress-line large">
                    <span style={{ width: `${selectedProject.progress}%` }}></span>
                  </div>
                </div>

                <div className="detail-columns">
                  <div>
                    <h3>Milestones</h3>
                    <div className="milestone-list">
                      {selectedProject.milestones.map((milestone) => (
                        <div key={milestone.name}>
                          <span className={`milestone-dot ${milestone.status}`}></span>
                          <div>
                            <strong>{milestone.name}</strong>
                            <small>{formatDate(milestone.date)} · {milestone.status}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="section-title-row">
                      <h3>Checklist</h3>
                      <span>{canEditSelected ? 'Editable' : 'Read only'}</span>
                    </div>
                    <div className="touchpoint-list">
                      {selectedProject.touchpoints.map((touchpoint, index) => (
                        <button
                          key={touchpoint.label}
                          onClick={() => onToggleTouchpoint(selectedProject.id, index)}
                          disabled={!canEditSelected}
                        >
                          <i className={`ti ${touchpoint.done ? 'ti-circle-check-filled' : 'ti-circle'}`}></i>
                          <span>{touchpoint.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default UserView;
