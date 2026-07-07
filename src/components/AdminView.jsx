import React, { useEffect, useState } from 'react';
import ProjectsPage from './admin/ProjectsPage';
import ChecklistAuditPage from './admin/ChecklistAuditPage';
import PeoplePage from './admin/PeoplePage';
import TenantPage from './admin/TenantPage';

const ADMIN_ROUTES = {
  dashboard: '#/dashboard',
  projects: '#/projects',
  audit: '#/checklist-audit',
  people: '#/users-managers',
  tenants: '#/tenants'
};

const pageFromHash = () => {
  switch (window.location.hash) {
    case ADMIN_ROUTES.dashboard:
      return 'dashboard';
    case ADMIN_ROUTES.projects:
      return 'projects';
    case ADMIN_ROUTES.audit:
      return 'audit';
    case ADMIN_ROUTES.people:
      return 'people';
    case ADMIN_ROUTES.tenants:
      return 'tenants';
    default:
      return 'dashboard';
  }
};

function AdminView({
  users,
  allUsers,
  projects,
  allProjects = projects,
  isSuperAdmin = false,
  auditLog,
  currentUser,
  sidebarOpen,
  onCloseSidebar,
  onOpenUserModal,
  onRemoveUser,
  onUpdateUser,
  onSaveProject,
  onDeleteProject,
  onToggleTouchpoint,
  onCreateTenant,
  onDeleteTenant,
  onEditTenant,
  onSuspendUser,
  onResumeUser,
  onPromoteUser
}) {
  const directoryUsers = isSuperAdmin ? allUsers : users;
  const directoryProjects = isSuperAdmin ? allProjects : projects;
  const [activePage, setActivePage] = useState(pageFromHash);
  const completedProjects = directoryProjects.filter((project) => project.status === 'Completed').length;
  const inProgressProjects = directoryProjects.filter((project) => project.status === 'In Progress').length;
  const tenantAdminCount = directoryUsers.filter((u) => u.role === 'tenant_admin').length;
  const managerCount = directoryUsers.filter((u) => u.role === 'manager').length;
  const userCount = directoryUsers.filter((u) => u.role === 'user').length;

  useEffect(() => {
    if (!window.location.hash || !Object.values(ADMIN_ROUTES).includes(window.location.hash)) {
      window.location.hash = ADMIN_ROUTES.dashboard;
    }

    const syncRoute = () => setActivePage(pageFromHash());
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  const navigate = (page) => {
    window.location.hash = ADMIN_ROUTES[page];
    setActivePage(page);
  };

  return (
    <div id="adminView" className={`animate-fade-in admin-shell ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <div className="sidebar-header">
          <button
            className="sidebar-close"
            type="button"
            onClick={onCloseSidebar}
            aria-label="Close menu"
            title="Close menu"
          >
            <span className="sidebar-close-icon" aria-hidden="true">×</span>
          </button>
        </div>
        <div className="sidebar-section-label">Overview</div>
        <button className={activePage === 'dashboard' ? 'active' : ''} onClick={() => navigate('dashboard')}>
          <i className="ti ti-dashboard"></i>
          <span>Dashboard</span>
        </button>
        <div className="sidebar-section-label">Project Control</div>
        <button className={activePage === 'projects' ? 'active' : ''} onClick={() => navigate('projects')}>
          <i className="ti ti-layout-grid"></i>
          <span>Projects</span>
        </button>
        <button className={activePage === 'audit' ? 'active' : ''} onClick={() => navigate('audit')}>
          <i className="ti ti-list-check"></i>
          <span>Checklist & Audit</span>
        </button>
        <div className="sidebar-section-label">Access Control</div>
        <button className={activePage === 'people' ? 'active' : ''} onClick={() => navigate('people')}>
          <i className="ti ti-users"></i>
          <span>Users & Managers</span>
        </button>
        {isSuperAdmin && (
          <>
            <div className="sidebar-section-label">Administration</div>
            <button className={activePage === 'tenants' ? 'active' : ''} onClick={() => navigate('tenants')}>
              <i className="ti ti-building"></i>
              <span>Tenant Management</span>
            </button>
          </>
        )}
      </aside>

      <div className="admin-content-viewport">
      <div className="admin-content workspace-grid" key={activePage}>
        {activePage === 'dashboard' && (
          <>
            <section className="workspace-hero">
              <div>
                <span className="eyebrow">{isSuperAdmin ? 'Super Admin Console' : 'Tenant Admin Console'}</span>
                <h1>Command Center</h1>
                <p>
                  {isSuperAdmin
                    ? 'View and control every tenant, project, and user across the platform.'
                    : 'Control users, managers, and projects assigned to your tenant scope.'}
                </p>
              </div>
            </section>

            <section className="stat-row dashboard-grid">
              <div className="stat-card">
                <div className="label">Total Projects</div>
                <div className="val">{directoryProjects.length}</div>
              </div>
              <div className="stat-card">
                <div className="label">In Progress</div>
                <div className="val green">{inProgressProjects}</div>
              </div>
              <div className="stat-card">
                <div className="label">Completed</div>
                <div className="val green">{completedProjects}</div>
              </div>
              <div className="stat-card">
                <div className="label">Total Users</div>
                <div className="val">{directoryUsers.length}</div>
              </div>
            </section>

            {isSuperAdmin && (
              <section className="stat-row dashboard-grid">
                <div className="stat-card">
                  <div className="label">Tenant Admins</div>
                  <div className="val amber">{tenantAdminCount}</div>
                </div>
                <div className="stat-card">
                  <div className="label">Managers</div>
                  <div className="val">{managerCount}</div>
                </div>
                <div className="stat-card">
                  <div className="label">Regular Users</div>
                  <div className="val">{userCount}</div>
                </div>
                <div className="stat-card">
                  <div className="label">Tenants</div>
                  <div className="val">{new Set(directoryUsers.map(u => u.tenantId).filter(t => t && t !== 'all')).size}</div>
                </div>
              </section>
            )}

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h3>Recent Activity</h3>
                  <p>Latest audit events across the platform</p>
                </div>
              </div>
              <div className="audit-mini" style={{ paddingTop: 18, borderTop: 'none', marginTop: 0 }}>
                {auditLog.slice(0, 8).map((item, index) => (
                  <div key={`${item.ts}-${index}`}>
                    <span className={`audit-dot ${item.type}`}></span>
                    <strong>{item.event}</strong>
                    <small>{item.detail}</small>
                  </div>
                ))}
                {auditLog.length === 0 && (
                  <div className="empty-state compact" style={{ gridColumn: '1 / -1' }}>No audit events yet.</div>
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h3>Quick Actions</h3>
                  <p>Jump to common tasks</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, padding: 22, flexWrap: 'wrap' }}>
                <button className="btn-secondary" onClick={() => navigate('people')}>
                  <i className="ti ti-user-plus"></i> Manage Users
                </button>
                <button className="btn-secondary" onClick={() => navigate('projects')}>
                  <i className="ti ti-layout-grid"></i> Manage Projects
                </button>
                {isSuperAdmin && (
                  <button className="btn-secondary" onClick={() => navigate('tenants')}>
                    <i className="ti ti-building"></i> Manage Tenants
                  </button>
                )}
                <button className="btn-secondary" onClick={() => navigate('audit')}>
                  <i className="ti ti-list-check"></i> View Audit Log
                </button>
              </div>
            </section>
          </>
        )}

        {activePage === 'projects' && (
          <ProjectsPage
            users={directoryUsers}
            allUsers={allUsers}
            projects={directoryProjects}
            currentUser={currentUser}
            onSaveProject={onSaveProject}
            onDeleteProject={onDeleteProject}
          />
        )}

        {activePage === 'audit' && (
          <ChecklistAuditPage
            allUsers={allUsers}
            projects={directoryProjects}
            auditLog={auditLog}
            onToggleTouchpoint={onToggleTouchpoint}
          />
        )}

        {activePage === 'people' && (
          <PeoplePage
            users={directoryUsers}
            projects={directoryProjects}
            currentUser={currentUser}
            onOpenUserModal={onOpenUserModal}
            onRemoveUser={onRemoveUser}
            onUpdateUser={onUpdateUser}
            onSuspendUser={onSuspendUser}
            onResumeUser={onResumeUser}
            onPromoteUser={onPromoteUser}
            isSuperAdmin={isSuperAdmin}
          />
        )}

        {activePage === 'tenants' && isSuperAdmin && (
          <TenantPage
            users={allUsers}
            projects={allProjects}
            currentUser={currentUser}
            onCreateTenant={onCreateTenant}
            onDeleteTenant={onDeleteTenant}
            onEditTenant={onEditTenant}
          />
        )}
      </div>
      </div>
    </div>
  );
}

export default AdminView;
