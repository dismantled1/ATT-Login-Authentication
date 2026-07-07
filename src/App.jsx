import React, { useEffect, useMemo, useState } from 'react';
import LoginScreen from './components/LoginScreen';
import AdminView from './components/AdminView';
import UserView from './components/UserView';
import Modal from './components/Modal';
import Toast from './components/Toast';
import { DEFAULT_AUDIT_LOG, DEFAULT_USERS } from './data/demoData';
import {
  getScopedProjects,
  getScopedUsers,
  isAdminUser,
  isSuperAdminUser,
  isTenantAdminUser,
  loadProjectCatalog,
  loadUserCatalog,
  persistCatalogVersion,
  withResolvedRole
} from './data/catalog';

const readStored = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

function App() {
  const [users, setUsers] = useState(loadUserCatalog);
  const [projects, setProjects] = useState(loadProjectCatalog);
  const [auditLog, setAuditLog] = useState(() => readStored('att_audit_log', DEFAULT_AUDIT_LOG));
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('att_current_user');
      return saved ? withResolvedRole(JSON.parse(saved)) : null;
    } catch {
      return null;
    }
  });
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '' });

  useEffect(() => {
    persistCatalogVersion();
    setUsers(loadUserCatalog());
    setProjects(loadProjectCatalog());
  }, []);

  useEffect(() => {
    localStorage.setItem('att_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('att_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('att_audit_log', JSON.stringify(auditLog));
  }, [auditLog]);

  useEffect(() => {
    if (currentUser) {
      const freshUser = users.find((user) => user.uid === currentUser.uid);
      const nextUser = withResolvedRole(freshUser ? { ...freshUser, ...currentUser } : currentUser);
      if (nextUser && JSON.stringify(nextUser) !== JSON.stringify(currentUser)) {
        setCurrentUser(nextUser);
        return;
      }
      sessionStorage.setItem('att_current_user', JSON.stringify(withResolvedRole(currentUser)));
    } else {
      sessionStorage.removeItem('att_current_user');
    }
  }, [currentUser, users]);

  const isSuperAdmin = isSuperAdminUser(currentUser);
  const isTenantAdmin = isTenantAdminUser(currentUser);
  const scopedProjects = useMemo(() => getScopedProjects(currentUser, projects), [currentUser, projects]);
  const scopedUsers = useMemo(() => getScopedUsers(currentUser, users, scopedProjects), [currentUser, users, scopedProjects]);
  const visibleProjects = isSuperAdmin ? projects : scopedProjects;
  const visibleUsers = isSuperAdmin ? users : scopedUsers;

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast({ show: false, message: '' });
    }, 2600);
  };

  const addAuditLog = (event, detail, type) => {
    const d = new Date();
    const dateStr = d.toISOString().slice(0, 10);
    const ts = String(d.getHours()).padStart(2, '0') + ':' +
      String(d.getMinutes()).padStart(2, '0') + ':' +
      String(d.getSeconds()).padStart(2, '0');
    setAuditLog((prev) => [{ date: dateStr, ts, event, detail, type }, ...prev]);
  };

  const handleLoginSuccess = (metadata) => {
    const localUser = users.find((user) => user.uid === metadata.uid);
    const catalogUser = DEFAULT_USERS.find((user) => user.uid === metadata.uid);
    setCurrentUser(withResolvedRole({
      ...(catalogUser || {}),
      ...(localUser || {}),
      ...metadata
    }));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('att_access_token');
  };

  useEffect(() => {
    if (!currentUser) return;

    const inactivityTimeout = 30 * 60 * 1000;
    let timeoutId;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout();
        showToast('Session expired due to 30 minutes of inactivity');
      }, inactivityTimeout);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [currentUser]);

  const createUser = async ({ name, uid, role, password, projectIds, activeDuration }) => {
    if (users.some((user) => user.uid === uid)) {
      showToast('User ID already exists');
      return false;
    }

    const allowedProjectIds = isSuperAdmin
      ? projectIds
      : projectIds.filter((projectId) => scopedProjects.some((project) => project.id === projectId));

    if (isTenantAdmin && role === 'super_admin') {
      showToast('Tenant Admin cannot create Super Admin accounts');
      return false;
    }

    if (isTenantAdmin && role === 'tenant_admin') {
      showToast('Tenant Admin cannot create another Tenant Admin');
      return false;
    }

    const firstProject = projects.find((project) => project.id === allowedProjectIds[0]) || scopedProjects[0];
    const newUser = {
      uid,
      name,
      role,
      email: `${uid}@att.com`,
      created: new Date().toISOString().slice(0, 10),
      tenantId: role === 'super_admin' ? 'all' : firstProject?.tenantId || currentUser?.tenantId || 'tenant-unassigned',
      projectIds: role === 'super_admin' ? [] : allowedProjectIds,
      pw: password,
      activeDuration 
    };

    setUsers((prev) => [...prev, newUser]);
    setProjects((prev) => prev.map((project) => {
      if (!allowedProjectIds.includes(project.id)) return project;
      if (role === 'manager') {
        return {
          ...project,
          transitionManagerUid: newUser.uid,
          memberUids: Array.from(new Set([...(project.memberUids || []), newUser.uid]))
        };
      }
      return {
        ...project,
        memberUids: Array.from(new Set([...(project.memberUids || []), newUser.uid]))
      };
    }));
    setIsUserModalOpen(false);
    showToast('Account created and assigned to scoped projects');
    addAuditLog('identity_created', `${currentUser.uid} created ${uid}`, 'granted');
    return true;
  };

  const removeUser = (uid) => {
    const targetUser = users.find((user) => user.uid === uid);
    if (!targetUser) return;
    if (uid === currentUser?.uid) {
      showToast('Cannot revoke your own active session');
      return;
    }
    if (targetUser.role === 'super_admin') {
      showToast('Super Admin cannot be revoked from this console');
      return;
    }
    if (isTenantAdmin && !scopedUsers.some((user) => user.uid === uid)) {
      showToast('User is outside your project scope');
      return;
    }

    setUsers((prev) => prev.filter((user) => user.uid !== uid));
    setProjects((prev) => prev.map((project) => ({
      ...project,
      transitionManagerUid: project.transitionManagerUid === uid ? '' : project.transitionManagerUid,
      memberUids: (project.memberUids || []).filter((memberUid) => memberUid !== uid)
    })));
    showToast('Account revoked');
    addAuditLog('identity_revoked', `${currentUser.uid} revoked ${uid}`, 'granted');
  };

  const updateUser = ({ uid, name, role, projectIds }) => {
    const targetUser = users.find((user) => user.uid === uid);
    if (!targetUser) return false;

    if (targetUser.role === 'super_admin') {
      showToast('Super Admin role cannot be changed here');
      return false;
    }

    const isScoped = isSuperAdmin || scopedUsers.some((user) => user.uid === uid);
    if (!isScoped) {
      showToast('User is outside your project scope');
      return false;
    }

    if (isTenantAdmin && (role === 'super_admin' || role === 'tenant_admin')) {
      showToast('Tenant Admin can promote users only up to Transition Manager');
      return false;
    }

    const allowedProjectIds = isSuperAdmin
      ? projectIds
      : projectIds.filter((projectId) => scopedProjects.some((project) => project.id === projectId));

    if (role !== 'super_admin' && allowedProjectIds.length === 0) {
      showToast('Assign at least one project');
      return false;
    }

    const firstProject = projects.find((project) => project.id === allowedProjectIds[0]);
    const updatedUser = {
      ...targetUser,
      name: name.trim(),
      role,
      tenantId: role === 'super_admin' ? 'all' : firstProject?.tenantId || targetUser.tenantId,
      projectIds: role === 'super_admin' ? [] : allowedProjectIds
    };

    setUsers((prev) => prev.map((user) => user.uid === uid ? updatedUser : user));
    setProjects((prev) => prev.map((project) => {
      const isAssigned = allowedProjectIds.includes(project.id);
      const members = new Set(project.memberUids || []);

      if (isAssigned && role !== 'tenant_admin') members.add(uid);
      if (!isAssigned || role === 'tenant_admin') members.delete(uid);

      return {
        ...project,
        tenantAdminUid: role === 'tenant_admin' && isAssigned
          ? uid
          : project.tenantAdminUid === uid && role !== 'tenant_admin'
            ? ''
            : project.tenantAdminUid,
        tenantId: role === 'tenant_admin' && isAssigned ? updatedUser.tenantId : project.tenantId,
        tenantName: role === 'tenant_admin' && isAssigned ? updatedUser.name : project.tenantName,
        transitionManagerUid: role === 'manager' && isAssigned
          ? uid
          : project.transitionManagerUid === uid
            ? ''
            : project.transitionManagerUid,
        memberUids: Array.from(members)
      };
    }));
    showToast('Identity role and project scope updated');
    addAuditLog('identity_updated', `${currentUser.uid} updated ${uid}`, 'granted');
    return true;
  };

  const saveProject = (projectInput) => {
    const isNew = !projectInput.id;
    const nextId = isNew
      ? projectInput.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `project-${Date.now()}`
      : projectInput.id;
    const existing = projects.find((project) => project.id === nextId);
    const tenantAdminUid = isTenantAdmin
      ? currentUser.uid
      : projectInput.tenantAdminUid || currentUser.uid;
    const tenantAdmin = users.find((user) => user.uid === tenantAdminUid);

    const savedProject = {
      ...(existing || {}),
      ...projectInput,
      id: nextId,
      tenantAdminUid,
      tenantId: projectInput.tenantId || tenantAdmin?.tenantId || `tenant-${nextId}`,
      tenantName: projectInput.tenantName || tenantAdmin?.name || projectInput.clientName,
      memberUids: Array.from(new Set([
        ...(projectInput.memberUids || existing?.memberUids || []),
        projectInput.transitionManagerUid
      ].filter(Boolean))),
      milestones: existing?.milestones || [
        { name: 'Transition discovery', date: projectInput.startDate, status: 'active' },
        { name: 'Operational handoff', date: projectInput.endDate, status: 'pending' }
      ],
      touchpoints: existing?.touchpoints || [
        { label: 'Confirm tenant admin ownership', done: true },
        { label: 'Assign transition manager', done: Boolean(projectInput.transitionManagerUid) },
        { label: 'Complete transition evidence', done: false }
      ],
      progress: existing?.progress || 20
    };

    if (isTenantAdmin && !isNew && !scopedProjects.some((project) => project.id === nextId)) {
      showToast('Project is outside your tenant scope');
      return false;
    }

    setProjects((prev) => {
      if (existing) return prev.map((project) => project.id === nextId ? savedProject : project);
      return [savedProject, ...prev];
    });
    showToast(isNew ? 'Project created' : 'Project updated');
    addAuditLog(isNew ? 'project_created' : 'project_updated', `${currentUser.uid} saved ${savedProject.name}`, 'granted');
    return true;
  };

  const deleteProject = (projectId) => {
    const target = projects.find((project) => project.id === projectId);
    if (!target) return false;

    if (isTenantAdmin && !scopedProjects.some((project) => project.id === projectId)) {
      showToast('Project is outside your tenant scope');
      return false;
    }

    setProjects((prev) => prev.filter((project) => project.id !== projectId));
    setUsers((prev) => prev.map((user) => ({
      ...user,
      projectIds: (user.projectIds || []).filter((id) => id !== projectId)
    })));
    showToast(`Project "${target.name}" deleted`);
    addAuditLog('project_deleted', `${currentUser.uid} deleted ${target.name}`, 'rejected');
    return true;
  };

  const updateProjectTouchpoint = (projectId, touchpointIndex) => {
    const project = visibleProjects.find((item) => item.id === projectId);
    if (!project) return;
    const canEdit = isSuperAdmin ||
      isTenantAdmin ||
      (currentUser.role === 'manager' && project.transitionManagerUid === currentUser.uid);
    if (!canEdit) {
      showToast('This project is read only for your role');
      return;
    }

    setProjects((prev) => prev.map((item) => {
      if (item.id !== projectId) return item;
      const touchpoints = item.touchpoints.map((touchpoint, index) => (
        index === touchpointIndex ? { ...touchpoint, done: !touchpoint.done } : touchpoint
      ));
      const doneCount = touchpoints.filter((touchpoint) => touchpoint.done).length;
      return {
        ...item,
        touchpoints,
        progress: Math.round((doneCount / touchpoints.length) * 100)
      };
    }));
  };

  // ── Tenant Management ──
  const createTenant = (tenantData) => {
    if (!isSuperAdmin) { showToast('Only Super Admin can create tenants'); return; }
    const existing = users.some((u) => u.tenantId === tenantData.id);
    if (existing) { showToast('Tenant ID already exists'); return; }
    showToast(`Tenant "${tenantData.name}" created`);
    addAuditLog('tenant_created', `${currentUser.uid} created tenant ${tenantData.name}`, 'granted');
  };

  const deleteTenant = (tenantId) => {
    if (!isSuperAdmin) { showToast('Only Super Admin can delete tenants'); return; }
    setUsers((prev) => prev.map((u) => u.tenantId === tenantId ? { ...u, tenantId: 'tenant-unassigned' } : u));
    setProjects((prev) => prev.map((p) => p.tenantId === tenantId ? { ...p, tenantId: 'tenant-unassigned', tenantName: 'Unassigned' } : p));
    showToast('Tenant deleted and resources reassigned');
    addAuditLog('tenant_deleted', `${currentUser.uid} deleted tenant ${tenantId}`, 'granted');
  };

  const editTenant = (tenantData) => {
    if (!isSuperAdmin) { showToast('Only Super Admin can edit tenants'); return; }
    if (tenantData.adminUid) {
      setUsers((prev) => prev.map((u) => {
        if (u.uid === tenantData.adminUid) return { ...u, tenantId: tenantData.id, role: 'tenant_admin' };
        return u;
      }));
    }
    showToast(`Tenant "${tenantData.name}" updated`);
    addAuditLog('tenant_updated', `${currentUser.uid} updated tenant ${tenantData.name}`, 'granted');
  };

  // ── User Suspend / Resume / Promote ──
  const suspendUser = (uid) => {
    const target = users.find((u) => u.uid === uid);
    if (!target) return;
    if (target.role === 'super_admin') { showToast('Cannot suspend Super Admin'); return; }
    setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, status: 'suspended' } : u));
    showToast(`${target.name} suspended`);
    addAuditLog('user_suspended', `${currentUser.uid} suspended ${uid}`, 'rejected');
  };

  const resumeUser = (uid) => {
    const target = users.find((u) => u.uid === uid);
    if (!target) return;
    setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, status: 'active' } : u));
    showToast(`${target.name} resumed`);
    addAuditLog('user_resumed', `${currentUser.uid} resumed ${uid}`, 'granted');
  };

  const promoteUser = (uid, newRole) => {
    const target = users.find((u) => u.uid === uid);
    if (!target) return;
    if (newRole === 'super_admin') { showToast('Cannot promote to Super Admin'); return; }
    if (isTenantAdmin && (newRole === 'super_admin' || newRole === 'tenant_admin')) {
      showToast('Tenant Admin can promote users up to Manager only');
      return;
    }
    setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, role: newRole } : u));
    showToast(`${target.name} promoted to ${newRole.replaceAll('_', ' ')}`);
    addAuditLog('user_promoted', `${currentUser.uid} promoted ${uid} to ${newRole}`, 'granted');
  };

  return (
    <div className="App">
      {!currentUser ? (
        <LoginScreen
          users={users}
          onLoginSuccess={handleLoginSuccess}
          onAddAuditLog={addAuditLog}
        />
      ) : (
        <div id="app-screen">
          <div className="topbar">
            <div className="topbar-left">
              {isAdminUser(currentUser) && !isSidebarOpen && (
                <button
                  className="topbar-menu-toggle"
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  aria-label="Open menu"
                  title="Open menu"
                >
                  <span></span>
                  <span></span>
                  <span></span>
                </button>
              )}
              <div className="brand">
                <span className="brand-dot" aria-hidden="true"></span>
                <div className="brand-copy">
                  <strong className="brand-wordmark">
                    AI<span className="brand-divider">·</span>TOUCH<span className="brand-divider">·</span><span className="brand-accent">TRANSITION</span>
                  </strong>
                  <small>{isSuperAdmin ? 'Global workspace' : currentUser.tenantId}</small>
                </div>
              </div>
            </div>
            <div className="right">
              <span className="topbar-uid">{currentUser.uid}</span>
              <span className="role-chip">
                {currentUser.role?.replaceAll('_', ' ') || 'user'}
              </span>

              <button className="logout-link" onClick={handleLogout}>
                Sign out
              </button>
            </div>
          </div> 

          <div className="main-body">
            {isAdminUser(currentUser) ? (
              <AdminView
                users={visibleUsers}
                allUsers={users}
                projects={visibleProjects}
                allProjects={projects}
                isSuperAdmin={isSuperAdmin}
                auditLog={auditLog}
                currentUser={withResolvedRole(currentUser)}
                sidebarOpen={isSidebarOpen}
                onCloseSidebar={() => setIsSidebarOpen(false)}
                onOpenUserModal={() => setIsUserModalOpen(true)}
                onRemoveUser={removeUser}
                onUpdateUser={updateUser}
                onSaveProject={saveProject}
                onDeleteProject={deleteProject}
                onToggleTouchpoint={updateProjectTouchpoint}
                onCreateTenant={createTenant}
                onDeleteTenant={deleteTenant}
                onEditTenant={editTenant}
                onSuspendUser={suspendUser}
                onResumeUser={resumeUser}
                onPromoteUser={promoteUser}
              />
            ) : (
              <UserView
                currentUser={currentUser}
                users={users}
                projects={scopedProjects}
                onToggleTouchpoint={updateProjectTouchpoint}
              />
            )}
          </div>
        </div>
      )}

      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onCreateUser={createUser}
        currentUser={currentUser}
        projects={visibleProjects}
      />

      <Toast show={toast.show} message={toast.message} />
    </div>
  );
}

export default App;
