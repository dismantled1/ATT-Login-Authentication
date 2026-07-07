import React, { useMemo, useState } from 'react';
import { roleLabel } from '../../data/demoData';

const ROLE_HIERARCHY = ['super_admin', 'tenant_admin', 'manager', 'user'];

function PeoplePage({ users, projects, currentUser, onOpenUserModal, onRemoveUser, onUpdateUser, onSuspendUser, onResumeUser, onPromoteUser, isSuperAdmin }) {
  const [identityQuery, setIdentityQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [promoteTarget, setPromoteTarget] = useState(null);
  const [promoteRole, setPromoteRole] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  const projectNamesForUser = (user) => {
    if (user.role === 'super_admin') return 'All projects';
    const names = projects
      .filter((project) => user.projectIds?.includes(project.id) || project.memberUids?.includes(user.uid) || project.tenantAdminUid === user.uid)
      .map((project) => project.name);
    return names.length ? names.join(', ') : 'Unassigned';
  };

  const filteredUsers = useMemo(() => {
    const needle = identityQuery.trim().toLowerCase();
    let result = users.filter((user) => {
      const userProjectNames = projectNamesForUser(user);
      const matchesSearch = !needle || [
        user.uid, user.name, user.email, roleLabel(user.role), user.role,
        user.tenantId, userProjectNames, user.department || ''
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || (user.status || 'active') === statusFilter;
      const matchesProject = projectFilter === 'all' ||
        user.role === 'super_admin' ||
        user.projectIds?.includes(projectFilter) ||
        projects.find((p) => p.id === projectFilter)?.tenantAdminUid === user.uid;
      return matchesSearch && matchesRole && matchesProject && matchesStatus;
    });

    // Sort
    result.sort((a, b) => {
      let va = a[sortField] || '';
      let vb = b[sortField] || '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [identityQuery, projectFilter, projects, roleFilter, statusFilter, users, sortField, sortDir]);

  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  }, [filteredUsers, page]);

  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const editRoleOptions = currentUser.role === 'super_admin'
    ? ['tenant_admin', 'manager', 'user']
    : ['manager', 'user'];

  const promoteRoleOptions = useMemo(() => {
    if (!promoteTarget) return [];
    const currentIndex = ROLE_HIERARCHY.indexOf(promoteTarget.role);
    if (isSuperAdmin) return ROLE_HIERARCHY.filter((_, i) => i < currentIndex && i > 0); // can promote up to tenant_admin
    return ROLE_HIERARCHY.filter((_, i) => i < currentIndex && i >= 2); // tenant admin can promote up to manager
  }, [promoteTarget, isSuperAdmin]);

  const beginEditUser = (user) => {
    if (user.role === 'super_admin') return;
    setEditingUser({
      uid: user.uid,
      name: user.name,
      email: user.email || '',
      role: user.role,
      department: user.department || '',
      status: user.status || 'active',
      projectIds: user.projectIds?.length
        ? user.projectIds
        : projects.filter((p) => p.tenantAdminUid === user.uid).map((p) => p.id)
    });
  };

  const updateEditingUser = (field, value) => {
    setEditingUser((prev) => ({ ...prev, [field]: value }));
  };

  const toggleEditingProject = (projectId) => {
    setEditingUser((prev) => {
      const selected = new Set(prev.projectIds || []);
      if (selected.has(projectId)) selected.delete(projectId);
      else selected.add(projectId);
      return { ...prev, projectIds: Array.from(selected) };
    });
  };

  const saveEditingUser = () => {
    if (!editingUser?.name.trim()) return;
    const saved = onUpdateUser(editingUser);
    if (saved) setEditingUser(null);
  };

  const toggleSelectUser = (uid) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === paginatedUsers.filter(u => u.role !== 'super_admin').length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(paginatedUsers.filter(u => u.role !== 'super_admin').map(u => u.uid)));
    }
  };

  const executeBulkAction = () => {
    if (!bulkAction || selectedUsers.size === 0) return;
    selectedUsers.forEach(uid => {
      if (bulkAction === 'suspend' && onSuspendUser) onSuspendUser(uid);
      else if (bulkAction === 'resume' && onResumeUser) onResumeUser(uid);
      else if (bulkAction === 'revoke') onRemoveUser(uid);
    });
    setSelectedUsers(new Set());
    setBulkAction('');
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    const { action, uid } = confirmAction;
    if (action === 'suspend' && onSuspendUser) onSuspendUser(uid);
    else if (action === 'resume' && onResumeUser) onResumeUser(uid);
    else if (action === 'revoke') onRemoveUser(uid);
    setConfirmAction(null);
  };

  const handlePromote = () => {
    if (!promoteTarget || !promoteRole) return;
    if (onPromoteUser) {
      onPromoteUser(promoteTarget.uid, promoteRole);
    } else {
      onUpdateUser({ ...promoteTarget, role: promoteRole });
    }
    setPromoteTarget(null);
    setPromoteRole('');
  };

  const userStatus = (user) => user.status || 'active';

  return (
    <>
      <section className="page-title-band">
        <div>
          <h2>Users & Transition Managers</h2>
          <p>Search, filter, promote roles, edit project scope, and manage people data.</p>
        </div>
        <button className="add-btn" onClick={onOpenUserModal}>
          <i className="ti ti-user-plus"></i>
          Add User
        </button>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Identity Directory</h3>
            <p>{currentUser.role === 'super_admin' ? 'Every role across tenants' : 'Only users attached to your assigned projects'}</p>
          </div>
          <div className="identity-tools">
            <div className="search-box identity-search">
              <i className="ti ti-search"></i>
              <input
                value={identityQuery}
                onChange={(event) => { setIdentityQuery(event.target.value); setPage(0); }}
                placeholder="Search users, managers, roles, projects, departments"
              />
            </div>
          </div>
        </div>

        <div className="filter-bar">
          <label>
            Role
            <select value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setPage(0); }}>
              <option value="all">All roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="tenant_admin">Tenant Admin</option>
              <option value="manager">Transition Manager</option>
              <option value="user">User</option>
            </select>
          </label>
          <label>
            Project
            <select value={projectFilter} onChange={(event) => { setProjectFilter(event.target.value); setPage(0); }}>
              <option value="all">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(0); }}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="paused">Paused</option>
            </select>
          </label>
          <button className="row-action" type="button" onClick={() => {
            setIdentityQuery(''); setRoleFilter('all'); setProjectFilter('all'); setStatusFilter('all'); setPage(0);
          }}>
            Clear filters
          </button>
          <span style={{ marginLeft: 'auto', color: 'var(--ink-faint)', fontSize: 12 }}>
            {filteredUsers.length} result{filteredUsers.length !== 1 ? 's' : ''}
          </span>
        </div>

        {selectedUsers.size > 0 && (
          <div className="bulk-actions-bar">
            <span><strong>{selectedUsers.size}</strong> user{selectedUsers.size !== 1 ? 's' : ''} selected</span>
            <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
              <option value="">Choose action...</option>
              <option value="suspend">Suspend</option>
              <option value="resume">Resume</option>
              <option value="revoke">Revoke</option>
            </select>
            <button className="btn-primary" disabled={!bulkAction} onClick={executeBulkAction}>
              Apply
            </button>
            <button className="btn-secondary" onClick={() => setSelectedUsers(new Set())}>
              Cancel
            </button>
          </div>
        )}

        {editingUser && (
          <div className="identity-editor" style={{ display: 'block', padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <span className="eyebrow">Edit Identity</span>
                <h3 style={{ marginTop: 4 }}>{editingUser.uid}</h3>
              </div>
              <button className="btn-secondary" type="button" onClick={() => setEditingUser(null)}>Cancel</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12, fontWeight: 800, color: 'var(--ink-dim)' }}>
                Name
                <input value={editingUser.name} onChange={(e) => updateEditingUser('name', e.target.value)} style={{ minHeight: 38, border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '0 10px' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12, fontWeight: 800, color: 'var(--ink-dim)' }}>
                Email
                <input value={editingUser.email} onChange={(e) => updateEditingUser('email', e.target.value)} style={{ minHeight: 38, border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '0 10px' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12, fontWeight: 800, color: 'var(--ink-dim)' }}>
                Role
                <select value={editingUser.role} onChange={(e) => updateEditingUser('role', e.target.value)} style={{ minHeight: 38, border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '0 10px' }}>
                  {editRoleOptions.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12, fontWeight: 800, color: 'var(--ink-dim)' }}>
                Department
                <input value={editingUser.department} onChange={(e) => updateEditingUser('department', e.target.value)} placeholder="e.g. Engineering" style={{ minHeight: 38, border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '0 10px' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12, fontWeight: 800, color: 'var(--ink-dim)' }}>
                Status
                <select value={editingUser.status} onChange={(e) => updateEditingUser('status', e.target.value)} style={{ minHeight: 38, border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '0 10px' }}>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="paused">Paused</option>
                </select>
              </label>
            </div>
            <div className="edit-project-scope" style={{ marginTop: 16 }}>
              <strong>Project Scope</strong>
              <div>
                {projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    className={editingUser.projectIds?.includes(project.id) ? 'selected' : ''}
                    onClick={() => toggleEditingProject(project.id)}
                  >
                    <i className={`ti ${editingUser.projectIds?.includes(project.id) ? 'ti-check' : 'ti-plus'}`}></i>
                    {project.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="editor-actions" style={{ marginTop: 16 }}>
              <button className="btn-secondary" type="button" onClick={() => setEditingUser(null)}>Cancel</button>
              <button className="btn-primary" type="button" onClick={saveEditingUser}>Save changes</button>
            </div>
          </div>
        )}

        <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input type="checkbox" onChange={toggleSelectAll} checked={selectedUsers.size > 0 && selectedUsers.size === paginatedUsers.filter(u => u.role !== 'super_admin').length} />
              </th>
              <th onClick={() => toggleSort('uid')} style={{ cursor: 'pointer' }}>
                User ID {sortField === 'uid' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => toggleSort('name')} style={{ cursor: 'pointer' }}>
                Name {sortField === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => toggleSort('role')} style={{ cursor: 'pointer' }}>
                Role {sortField === 'role' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th>Status</th>
              <th>Projects</th>
              <th onClick={() => toggleSort('email')} style={{ cursor: 'pointer' }}>
                Email {sortField === 'email' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-state compact">No users match your filters.</td>
              </tr>
            ) : paginatedUsers.map((user) => (
              <tr key={user.uid}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedUsers.has(user.uid)}
                    onChange={() => toggleSelectUser(user.uid)}
                    disabled={user.role === 'super_admin'}
                  />
                </td>
                <td className="uid-cell">{user.uid}</td>
                <td>{user.name}</td>
                <td><span className={`role-badge ${user.role}`}>{roleLabel(user.role)}</span></td>
                <td>
                  <span className={`status-badge ${userStatus(user)}`}>
                    {userStatus(user)}
                  </span>
                </td>
                <td className="project-count">{projectNamesForUser(user)}</td>
                <td>{user.email}</td>
                <td>{user.created}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="row-action" onClick={() => beginEditUser(user)} disabled={user.role === 'super_admin'} title="Edit user">
                    <i className="ti ti-edit"></i>
                  </button>
                  {user.role !== 'super_admin' && ROLE_HIERARCHY.indexOf(user.role) > 1 && (
                    <button className="row-action" onClick={() => { setPromoteTarget(user); setPromoteRole(''); }} title="Promote user">
                      <i className="ti ti-arrow-up"></i>
                    </button>
                  )}
                  {userStatus(user) === 'active' && user.role !== 'super_admin' && (
                    <button className="row-action" onClick={() => setConfirmAction({ action: 'suspend', uid: user.uid, name: user.name })} title="Suspend user">
                      <i className="ti ti-player-pause"></i>
                    </button>
                  )}
                  {(userStatus(user) === 'suspended' || userStatus(user) === 'paused') && (
                    <button className="row-action" onClick={() => setConfirmAction({ action: 'resume', uid: user.uid, name: user.name })} title="Resume user">
                      <i className="ti ti-player-play"></i>
                    </button>
                  )}
                  <button className="row-action" onClick={() => setConfirmAction({ action: 'revoke', uid: user.uid, name: user.name })} disabled={user.uid === currentUser.uid || user.role === 'super_admin'} title="Revoke user">
                    <i className="ti ti-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '14px 22px', borderTop: '1px solid var(--line)' }}>
            <button className="btn-secondary" style={{ minHeight: 34, padding: '0 12px', fontSize: 12 }} disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              Previous
            </button>
            <span style={{ fontSize: 12, color: 'var(--ink-dim)' }}>
              Page {page + 1} of {totalPages}
            </span>
            <button className="btn-secondary" style={{ minHeight: 34, padding: '0 12px', fontSize: 12 }} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              Next
            </button>
          </div>
        )}
      </section>

      {/* Confirm Action Modal */}
      {confirmAction && (
        <div className="modal-overlay show" onClick={() => setConfirmAction(null)}>
          <div className="modal-box confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm {confirmAction.action === 'revoke' ? 'Revoke' : confirmAction.action === 'suspend' ? 'Suspend' : 'Resume'}</h3>
            <p className="sub">
              Are you sure you want to {confirmAction.action} <strong>{confirmAction.name}</strong> ({confirmAction.uid})?
              {confirmAction.action === 'revoke' && ' This action cannot be undone.'}
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setConfirmAction(null)}>Cancel</button>
              <button
                className="btn-primary"
                style={confirmAction.action === 'revoke' ? { background: 'var(--red)' } : {}}
                onClick={handleConfirmAction}
              >
                {confirmAction.action === 'revoke' ? 'Revoke' : confirmAction.action === 'suspend' ? 'Suspend' : 'Resume'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promote Modal */}
      {promoteTarget && (
        <div className="modal-overlay show" onClick={() => setPromoteTarget(null)}>
          <div className="modal-box confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Promote User</h3>
            <p className="sub">
              Promote <strong>{promoteTarget.name}</strong> from {roleLabel(promoteTarget.role)} to a higher role.
            </p>
            {promoteRoleOptions.length === 0 ? (
              <p style={{ color: 'var(--ink-dim)', fontSize: 13 }}>This user cannot be promoted further within your permission scope.</p>
            ) : (
              <div className="field">
                <label>New Role</label>
                <select value={promoteRole} onChange={(e) => setPromoteRole(e.target.value)} style={{ width: '100%', minHeight: 44, border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '0 14px' }}>
                  <option value="">Select role...</option>
                  {promoteRoleOptions.map(r => (
                    <option key={r} value={r}>{roleLabel(r)}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setPromoteTarget(null)}>Cancel</button>
              <button className="btn-primary" onClick={handlePromote} disabled={!promoteRole}>
                Promote
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PeoplePage;
