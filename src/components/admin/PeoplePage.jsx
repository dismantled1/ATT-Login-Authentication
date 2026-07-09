import React, { useMemo, useState } from 'react';
import { formatDate, getExpiryStatus, roleLabel } from '../../data/demoData';

const ROLE_HIERARCHY = ['super_admin', 'tenant_admin', 'manager', 'user'];

function PeoplePage({ users, projects, currentUser, onOpenUserModal, onRemoveUser, onUpdateUser, onSuspendUser, onResumeUser, onPromoteUser, onRenewAccess, isSuperAdmin }) {
  const [identityQuery, setIdentityQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expiryFilter, setExpiryFilter] = useState('all');
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [promoteTarget, setPromoteTarget] = useState(null);
  const [promoteRole, setPromoteRole] = useState('');
  const [renewTarget, setRenewTarget] = useState(null);
  const [renewMonths, setRenewMonths] = useState('');
  const [customDays, setCustomDays] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);
  const [copied, setCopied] = useState(null);
  const PAGE_SIZE = 15;

  // Feature 3: exclude self from table
  const tableUsers = useMemo(() => users.filter((u) => u.uid !== currentUser.uid), [users, currentUser.uid]);

  const projectNamesForUser = (user) => {
    if (user.role === 'super_admin') return 'All projects';
    const names = projects
      .filter((p) => user.projectIds?.includes(p.id) || p.memberUids?.includes(user.uid) || p.tenantAdminUid === user.uid)
      .map((p) => p.name);
    return names.length ? names.join(', ') : 'Unassigned';
  };

  const filteredUsers = useMemo(() => {
    const needle = identityQuery.trim().toLowerCase();
    let result = tableUsers.filter((user) => {
      const userProjectNames = projectNamesForUser(user);
      const matchesSearch = !needle || [
        user.uid, user.name, user.email, roleLabel(user.role), user.role,
        user.tenantId, userProjectNames, user.department || '', user.employeeId || '', user.designation || ''
      ].some((v) => String(v || '').toLowerCase().includes(needle));
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || (user.status || 'active') === statusFilter;
      const matchesProject = projectFilter === 'all' ||
        user.role === 'super_admin' ||
        user.projectIds?.includes(projectFilter) ||
        projects.find((p) => p.id === projectFilter)?.tenantAdminUid === user.uid;
      const expStatus = getExpiryStatus(user);
      const matchesExpiry = expiryFilter === 'all' || (expiryFilter === 'expiring' && expStatus !== null);
      return matchesSearch && matchesRole && matchesProject && matchesStatus && matchesExpiry;
    });

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
  }, [identityQuery, projectFilter, projects, roleFilter, statusFilter, expiryFilter, tableUsers, sortField, sortDir]);

  const paginatedUsers = useMemo(() => filteredUsers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filteredUsers, page]);
  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((prev) => prev === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  // Feature 1: Smart bulk actions based on selection mix
  const selectedUserObjects = useMemo(() => paginatedUsers.filter((u) => selectedUsers.has(u.uid)), [paginatedUsers, selectedUsers]);
  const allSelectedActive = selectedUserObjects.length > 0 && selectedUserObjects.every((u) => (u.status || 'active') === 'active');
  const allSelectedSuspended = selectedUserObjects.length > 0 && selectedUserObjects.every((u) => u.status === 'suspended');
  const showSuspendBulk = selectedUserObjects.length > 0 && !allSelectedSuspended; // Case A and C
  const showResumeBulk = allSelectedSuspended; // Case B only

  const editRoleOptions = isSuperAdmin ? ['tenant_admin', 'manager', 'user'] : ['manager', 'user'];

  const promoteRoleOptions = useMemo(() => {
    if (!promoteTarget) return [];
    const currentIndex = ROLE_HIERARCHY.indexOf(promoteTarget.role);
    if (isSuperAdmin) return ROLE_HIERARCHY.filter((_, i) => i < currentIndex && i > 0);
    return ROLE_HIERARCHY.filter((_, i) => i < currentIndex && i >= 2);
  }, [promoteTarget, isSuperAdmin]);

  const beginEditUser = (user) => {
    if (user.role === 'super_admin') return;
    setEditingUser({
      uid: user.uid,
      name: user.name,
      email: user.email || '',
      role: user.role,
      department: user.department || '',
      designation: user.designation || '',
      phone: user.phone || '',
      employeeId: user.employeeId || '',
      status: user.status || 'active',
      expiryDate: user.expiryDate || '',
      password: '',
      projectIds: user.projectIds?.length
        ? user.projectIds
        : projects.filter((p) => p.tenantAdminUid === user.uid).map((p) => p.id)
    });
  };

  const updateEditingUser = (field, value) => setEditingUser((prev) => ({ ...prev, [field]: value }));

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
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const selectable = paginatedUsers.filter((u) => u.role !== 'super_admin').map((u) => u.uid);
    if (selectedUsers.size === selectable.length) setSelectedUsers(new Set());
    else setSelectedUsers(new Set(selectable));
  };

  const executeBulkAction = () => {
    if (!bulkAction || selectedUsers.size === 0) return;
    selectedUsers.forEach((uid) => {
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
    if (onPromoteUser) onPromoteUser(promoteTarget.uid, promoteRole);
    else onUpdateUser({ ...promoteTarget, role: promoteRole });
    setPromoteTarget(null);
    setPromoteRole('');
  };

  const handleRenew = () => {
    if (!renewTarget || !renewMonths) return;
    let days = renewMonths === 'custom' ? parseInt(customDays, 10) : parseInt(renewMonths, 10) * 30;
    if (!days || days < 1) return;
    if (onRenewAccess) onRenewAccess(renewTarget.uid, days);
    setRenewTarget(null);
    setRenewMonths('');
    setCustomDays('');
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const userStatus = (user) => user.status || 'active';

  const SortTh = ({ field, label }) => (
    <th onClick={() => toggleSort(field)} style={{ cursor: 'pointer', userSelect: 'none' }}>
      {label} {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  );

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
            <p>{currentUser.role === 'super_admin' ? 'Every role across tenants' : 'Users attached to your assigned projects'}</p>
          </div>
          <div className="identity-tools">
            <div className="search-box identity-search">
              <i className="ti ti-search"></i>
              <input
                value={identityQuery}
                onChange={(e) => { setIdentityQuery(e.target.value); setPage(0); }}
                placeholder="Search name, email, ID, department, project..."
              />
            </div>
          </div>
        </div>

        <div className="filter-bar">
          <label>Role
            <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}>
              <option value="all">All roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="tenant_admin">Tenant Admin</option>
              <option value="manager">Transition Manager</option>
              <option value="user">User</option>
            </select>
          </label>
          <label>Project
            <select value={projectFilter} onChange={(e) => { setProjectFilter(e.target.value); setPage(0); }}>
              <option value="all">All projects</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label>Status
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>
          <label>Expiry
            <select value={expiryFilter} onChange={(e) => { setExpiryFilter(e.target.value); setPage(0); }}>
              <option value="all">All</option>
              <option value="expiring">Expiring Soon</option>
            </select>
          </label>
          <button className="row-action" onClick={() => {
            setIdentityQuery(''); setRoleFilter('all'); setProjectFilter('all'); setStatusFilter('all'); setExpiryFilter('all'); setPage(0);
          }}>Clear filters</button>
          <span style={{ marginLeft: 'auto', color: 'var(--ink-faint)', fontSize: 12 }}>
            {filteredUsers.length} result{filteredUsers.length !== 1 ? 's' : ''}
          </span>
        </div>

        {selectedUsers.size > 0 && (
          <div className="bulk-actions-bar">
            <span><strong>{selectedUsers.size}</strong> user{selectedUsers.size !== 1 ? 's' : ''} selected</span>
            <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
              <option value="">Choose action...</option>
              {showSuspendBulk && <option value="suspend">Suspend</option>}
              {showResumeBulk && <option value="resume">Resume</option>}
              <option value="revoke">Revoke</option>
            </select>
            <button className="btn-primary" disabled={!bulkAction} onClick={executeBulkAction}>Apply</button>
            <button className="btn-secondary" onClick={() => setSelectedUsers(new Set())}>Cancel</button>
          </div>
        )}

        {editingUser && (
          <div className="identity-editor" style={{ display: 'block', padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <span className="eyebrow">Edit Identity</span>
                <h3 style={{ marginTop: 4 }}>{editingUser.uid}</h3>
              </div>
              <button className="btn-secondary" onClick={() => setEditingUser(null)}>Cancel</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {[
                { field: 'name', label: 'Full Name', type: 'input' },
                { field: 'email', label: 'Email', type: 'input' },
                { field: 'employeeId', label: 'Employee ID', type: 'input' },
                { field: 'phone', label: 'Phone', type: 'input' },
                { field: 'designation', label: 'Designation', type: 'input' },
                { field: 'department', label: 'Department', type: 'input' },
              ].map(({ field, label, type }) => (
                <label key={field} style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12, fontWeight: 800, color: 'var(--ink-dim)' }}>
                  {label}
                  <input value={editingUser[field] || ''} onChange={(e) => updateEditingUser(field, e.target.value)}
                    style={{ minHeight: 38, border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '0 10px' }} />
                </label>
              ))}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12, fontWeight: 800, color: 'var(--ink-dim)' }}>
                New Password <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--ink-faint)' }}>(leave blank to keep current)</span>
                <input
                  type="password"
                  value={editingUser.password || ''}
                  onChange={(e) => updateEditingUser('password', e.target.value)}
                  placeholder="Enter new password..."
                  style={{ minHeight: 38, border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '0 10px' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12, fontWeight: 800, color: 'var(--ink-dim)' }}>
                Role
                <select value={editingUser.role} onChange={(e) => updateEditingUser('role', e.target.value)}
                  style={{ minHeight: 38, border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '0 10px' }}>
                  {editRoleOptions.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12, fontWeight: 800, color: 'var(--ink-dim)' }}>
                Status
                <select value={editingUser.status} onChange={(e) => updateEditingUser('status', e.target.value)}
                  style={{ minHeight: 38, border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '0 10px' }}>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12, fontWeight: 800, color: 'var(--ink-dim)' }}>
                Expiry Date <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--ink-faint)' }}>(edit to renew access)</span>
                <input type="date" value={editingUser.expiryDate || ''} onChange={(e) => updateEditingUser('expiryDate', e.target.value)}
                  style={{ minHeight: 38, border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '0 10px' }} />
              </label>
            </div>
            <div className="edit-project-scope" style={{ marginTop: 16 }}>
              <strong>Project Scope</strong>
              <div>
                {projects.map((p) => (
                  <button key={p.id} type="button"
                    className={editingUser.projectIds?.includes(p.id) ? 'selected' : ''}
                    onClick={() => toggleEditingProject(p.id)}>
                    <i className={`ti ${editingUser.projectIds?.includes(p.id) ? 'ti-check' : 'ti-plus'}`}></i>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="editor-actions" style={{ marginTop: 16 }}>
              <button className="btn-secondary" onClick={() => setEditingUser(null)}>Cancel</button>
              <button className="btn-primary" onClick={saveEditingUser}>Save changes</button>
            </div>
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input type="checkbox" onChange={toggleSelectAll}
                    checked={selectedUsers.size > 0 && selectedUsers.size === paginatedUsers.filter((u) => u.role !== 'super_admin').length} />
                </th>
                <SortTh field="uid" label="User ID" />
                <SortTh field="name" label="Name" />
                <SortTh field="role" label="Role" />
                <th>Status</th>
                <th>Projects</th>
                <SortTh field="email" label="Email" />
                <th>Expiry</th>
                <SortTh field="created" label="Created" />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr><td colSpan={10} className="empty-state compact">No users match your filters.</td></tr>
              ) : paginatedUsers.map((user) => {
                const expStatus = getExpiryStatus(user);
                return (
                  <tr key={user.uid}>
                    <td>
                      <input type="checkbox" checked={selectedUsers.has(user.uid)}
                        onChange={() => toggleSelectUser(user.uid)} disabled={user.role === 'super_admin'} />
                    </td>
                    <td className="uid-cell">
                      <span
                        title="Click to copy"
                        style={{ cursor: 'pointer' }}
                        onClick={() => copyToClipboard(user.uid, `uid-${user.uid}`)}
                      >
                        {user.uid}
                        <i className={`ti ${copied === `uid-${user.uid}` ? 'ti-check' : 'ti-copy'}`}
                          style={{ marginLeft: 4, fontSize: 11, color: 'var(--ink-faint)' }}></i>
                      </span>
                    </td>
                    <td>
                      {user.name}
                      {expStatus && (
                        <span className={`expiry-badge expiry-${expStatus.color}`} style={{ marginLeft: 6 }}>
                          ⚠ {expStatus.label}
                        </span>
                      )}
                    </td>
                    <td><span className={`role-badge ${user.role}`}>{roleLabel(user.role)}</span></td>
                    <td><span className={`status-badge ${userStatus(user)}`}>{userStatus(user)}</span></td>
                    <td className="project-count">{projectNamesForUser(user)}</td>
                    <td>
                      <span title="Click to copy" style={{ cursor: 'pointer' }}
                        onClick={() => copyToClipboard(user.email, `email-${user.uid}`)}>
                        {user.email}
                        <i className={`ti ${copied === `email-${user.uid}` ? 'ti-check' : 'ti-copy'}`}
                          style={{ marginLeft: 4, fontSize: 11, color: 'var(--ink-faint)' }}></i>
                      </span>
                    </td>
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {user.expiryDate ? formatDate(user.expiryDate) : '—'}
                    </td>
                    <td>{user.created}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        className="btn-primary"
                        style={{ fontSize: 12, padding: '4px 12px', minHeight: 30, marginRight: 4 }}
                        onClick={() => beginEditUser(user)}
                        disabled={user.role === 'super_admin'}
                        title="Edit user details"
                      >
                        <i className="ti ti-edit" style={{ marginRight: 4 }}></i>Edit
                      </button>
                      {user.role !== 'super_admin' && ROLE_HIERARCHY.indexOf(user.role) > 1 && (
                        <button className="row-action" onClick={() => { setPromoteTarget(user); setPromoteRole(''); }} title="Promote user">
                          <i className="ti ti-arrow-up"></i>
                        </button>
                      )}
                      {userStatus(user) === 'active' && user.role !== 'super_admin' && (
                        <button className="row-action" title="Suspend user"
                          onClick={() => setConfirmAction({ action: 'suspend', uid: user.uid, name: user.name })}>
                          <i className="ti ti-player-pause"></i>
                        </button>
                      )}
                      {userStatus(user) === 'suspended' && (
                        <button className="row-action" title="Resume user"
                          onClick={() => setConfirmAction({ action: 'resume', uid: user.uid, name: user.name })}>
                          <i className="ti ti-player-play"></i>
                        </button>
                      )}
                      {onRenewAccess && (
                        <button className="row-action" title="Renew access" onClick={() => setRenewTarget(user)}>
                          <i className="ti ti-refresh"></i>
                        </button>
                      )}
                      <button className="row-action" title="Revoke user"
                        onClick={() => setConfirmAction({ action: 'revoke', uid: user.uid, name: user.name })}
                        disabled={user.uid === currentUser.uid || user.role === 'super_admin'}>
                        <i className="ti ti-trash"></i>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '14px 22px', borderTop: '1px solid var(--line)' }}>
            <button className="btn-secondary" style={{ minHeight: 34, padding: '0 12px', fontSize: 12 }} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <span style={{ fontSize: 12, color: 'var(--ink-dim)' }}>Page {page + 1} of {totalPages}</span>
            <button className="btn-secondary" style={{ minHeight: 34, padding: '0 12px', fontSize: 12 }} disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </section>

      {/* Confirm Action Modal */}
      {confirmAction && (
        <div className="modal-overlay show" onClick={() => setConfirmAction(null)}>
          <div className="modal-box confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm {confirmAction.action === 'revoke' ? 'Revoke' : confirmAction.action === 'suspend' ? 'Suspend' : 'Resume'}</h3>
            <p className="sub">
              Are you sure you want to {confirmAction.action} <strong>{confirmAction.name}</strong>?
              {confirmAction.action === 'revoke' && ' This action cannot be undone.'}
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setConfirmAction(null)}>Cancel</button>
              <button className="btn-primary"
                style={confirmAction.action === 'revoke' ? { background: 'var(--red)' } : {}}
                onClick={handleConfirmAction}>
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
            <p className="sub">Promote <strong>{promoteTarget.name}</strong> from {roleLabel(promoteTarget.role)}.</p>
            {promoteRoleOptions.length === 0 ? (
              <p style={{ color: 'var(--ink-dim)', fontSize: 13 }}>Cannot promote further within your scope.</p>
            ) : (
              <div className="field">
                <label>New Role</label>
                <select value={promoteRole} onChange={(e) => setPromoteRole(e.target.value)}
                  style={{ width: '100%', minHeight: 44, border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '0 14px' }}>
                  <option value="">Select role...</option>
                  {promoteRoleOptions.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                </select>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setPromoteTarget(null)}>Cancel</button>
              <button className="btn-primary" onClick={handlePromote} disabled={!promoteRole}>Promote</button>
            </div>
          </div>
        </div>
      )}

      {/* Renew Access Modal */}
      {renewTarget && (
        <div className="modal-overlay show" onClick={() => { setRenewTarget(null); setRenewMonths(''); setCustomDays(''); }}>
          <div className="modal-box confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Renew Access</h3>
            <p className="sub">Extend account expiry for <strong>{renewTarget.name}</strong>.</p>
            <div className="field">
              <label>Extension Period</label>
              <select value={renewMonths} onChange={(e) => setRenewMonths(e.target.value)}
                style={{ width: '100%', minHeight: 44, border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '0 14px' }}>
                <option value="">Select duration...</option>
                <option value="1">1 Month</option>
                <option value="2">2 Months</option>
                <option value="3">3 Months</option>
                <option value="6">6 Months</option>
                <option value="12">12 Months</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            {renewMonths === 'custom' && (
              <div className="field">
                <label>Number of Days</label>
                <input type="number" min="1" max="730" value={customDays} onChange={(e) => setCustomDays(e.target.value)} placeholder="e.g. 45"
                  style={{ width: '100%', minHeight: 44, border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '0 14px' }} />
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => { setRenewTarget(null); setRenewMonths(''); setCustomDays(''); }}>Cancel</button>
              <button className="btn-primary" onClick={handleRenew} disabled={!renewMonths || (renewMonths === 'custom' && !customDays)}>
                <i className="ti ti-refresh"></i>
                Apply Extension
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PeoplePage;
