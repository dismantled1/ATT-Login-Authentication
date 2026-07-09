import React, { useMemo, useState } from 'react';
import { roleLabel } from '../../data/demoData';

const emptyTenant = {
  id: '',
  name: '',
  adminUid: '',
  description: '',
  status: 'active',
  maxUsers: 50,
  maxProjects: 10
};

function TenantPage({ users, projects, currentUser, onCreateTenant, onDeleteTenant, onEditTenant }) {
  const [query, setQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [draft, setDraft] = useState({ ...emptyTenant });

  // Derive tenants from users and projects
  const tenants = useMemo(() => {
    const tenantMap = new Map();
    users.forEach((user) => {
      if (user.tenantId && user.tenantId !== 'all') {
        if (!tenantMap.has(user.tenantId)) {
          tenantMap.set(user.tenantId, {
            id: user.tenantId,
            name: '',
            adminUid: '',
            adminName: '',
            userCount: 0,
            projectCount: 0,
            managerCount: 0,
            status: 'active'
          });
        }
        const t = tenantMap.get(user.tenantId);
        t.userCount += 1;
        if (user.role === 'tenant_admin') {
          t.adminUid = user.uid;
          t.adminName = user.name;
          if (!t.name) t.name = user.tenantId.replace('tenant-', '').replace(/^\w/, c => c.toUpperCase());
        }
        if (user.role === 'manager') t.managerCount += 1;
      }
    });
    projects.forEach((project) => {
      if (project.tenantId && tenantMap.has(project.tenantId)) {
        tenantMap.get(project.tenantId).projectCount += 1;
      }
    });
    // Set display names from tenantName in projects
    projects.forEach((project) => {
      if (project.tenantId && project.tenantName && tenantMap.has(project.tenantId)) {
        tenantMap.get(project.tenantId).name = project.tenantName;
      }
    });
    return Array.from(tenantMap.values());
  }, [users, projects]);

  const tenantAdmins = users.filter((u) => u.role === 'tenant_admin');

  const filteredTenants = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tenants;
    return tenants.filter((t) =>
      t.name.toLowerCase().includes(needle) ||
      t.id.toLowerCase().includes(needle) ||
      t.adminName.toLowerCase().includes(needle)
    );
  }, [tenants, query]);

  const beginCreate = () => {
    setIsCreating(true);
    setEditingTenant(null);
    setDraft({ ...emptyTenant });
  };

  const beginEdit = (tenant) => {
    setIsCreating(false);
    setEditingTenant(tenant.id);
    setDraft({
      id: tenant.id,
      name: tenant.name,
      adminUid: tenant.adminUid,
      description: '',
      status: tenant.status,
      maxUsers: 50,
      maxProjects: 10
    });
  };

  const cancelDraft = () => {
    setIsCreating(false);
    setEditingTenant(null);
    setDraft({ ...emptyTenant });
  };

  const saveDraft = () => {
    if (!draft.name.trim()) return;
    if (isCreating) {
      const tenantId = `tenant-${draft.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      if (onCreateTenant) {
        onCreateTenant({ ...draft, id: tenantId });
      }
    } else if (editingTenant) {
      if (onEditTenant) {
        onEditTenant({ ...draft, id: editingTenant });
      }
    }
    cancelDraft();
  };

  const handleDelete = (tenantId) => {
    if (onDeleteTenant) onDeleteTenant(tenantId);
    setConfirmDelete(null);
  };

  return (
    <>
      <section className="page-title-band">
        <div>
          <h2>Tenant Management</h2>
          <p>Create, edit, and manage organizational tenants and their administrators.</p>
        </div>
        <button className="add-btn" onClick={beginCreate}>
          <i className="ti ti-plus"></i>
          Create Tenant
        </button>
      </section>

      <section className="stat-row dashboard-grid">
        <div className="stat-card">
          <div className="label">Total Tenants</div>
          <div className="val">{tenants.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Active Tenants</div>
          <div className="val green">{tenants.filter(t => t.status === 'active').length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Users</div>
          <div className="val">{tenants.reduce((sum, t) => sum + t.userCount, 0)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Projects</div>
          <div className="val amber">{tenants.reduce((sum, t) => sum + t.projectCount, 0)}</div>
        </div>
      </section>

      {(isCreating || editingTenant) && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>{isCreating ? 'Create New Tenant' : 'Edit Tenant'}</h3>
              <p>{isCreating ? 'Set up a new organizational tenant' : `Editing ${draft.name}`}</p>
            </div>
            <button className="row-action" type="button" onClick={cancelDraft}>Cancel</button>
          </div>
          <div className="editor-grid">
            <label>
              Tenant Name <span style={{ color: 'var(--red)' }}>*</span>
              <input
                value={draft.name}
                onChange={(e) => setDraft(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Verizon"
              />
            </label>
            <label>
              Assign Admin
              <select
                value={draft.adminUid}
                onChange={(e) => setDraft(prev => ({ ...prev, adminUid: e.target.value }))}
              >
                <option value="">Unassigned</option>
                {tenantAdmins.map((u) => (
                  <option key={u.uid} value={u.uid}>{u.name} ({u.email})</option>
                ))}
              </select>
            </label>
            <label className="wide">
              Description
              <textarea
                value={draft.description}
                onChange={(e) => setDraft(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description for this tenant"
              />
            </label>
            <label>
              Status
              <select
                value={draft.status}
                onChange={(e) => setDraft(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="paused">Paused</option>
              </select>
            </label>
          </div>
          <button className="btn-primary save-project" onClick={saveDraft}>
            <i className="ti ti-device-floppy"></i>
            {isCreating ? 'Create Tenant' : 'Save Changes'}
          </button>
        </section>
      )}

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>All Tenants</h3>
            <p>Overview of all organizational tenants and their resource utilization.</p>
          </div>
          <div className="search-box">
            <i className="ti ti-search"></i>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tenants"
            />
          </div>
        </div>

        <div className="tenant-grid">
          {filteredTenants.length === 0 ? (
            <div className="empty-state compact">No tenants match your search.</div>
          ) : filteredTenants.map((tenant) => (
            <article className="tenant-card" key={tenant.id}>
              <div className="tenant-card-header">
                <div>
                  <h4>{tenant.name}</h4>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{tenant.id}</span>
                </div>
                <span className={`status-badge ${tenant.status}`}>
                  {tenant.status}
                </span>
              </div>
              <div className="tenant-stats">
                <div>
                  <span className="label">Users</span>
                  <strong>{tenant.userCount}</strong>
                </div>
                <div>
                  <span className="label">Projects</span>
                  <strong>{tenant.projectCount}</strong>
                </div>
                <div>
                  <span className="label">Managers</span>
                  <strong>{tenant.managerCount}</strong>
                </div>
              </div>
              <div style={{ padding: '0 16px 12px', fontSize: 13, color: 'var(--ink-dim)' }}>
                <strong style={{ fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase' }}>Admin: </strong>
                {tenant.adminName || 'Unassigned'}
              </div>
              <div className="tenant-actions">
                <button onClick={() => beginEdit(tenant)}>
                  <i className="ti ti-edit"></i> Edit
                </button>
                <button className="danger" onClick={() => setConfirmDelete(tenant.id)}>
                  <i className="ti ti-trash"></i> Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {confirmDelete && (
        <div className="modal-overlay show" onClick={() => setConfirmDelete(null)}>
          <div className="modal-box confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Tenant</h3>
            <p className="sub">
              Are you sure you want to delete this tenant? This action cannot be undone.
              All associated users and projects will be orphaned.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn-primary" style={{ background: 'var(--red)' }} onClick={() => handleDelete(confirmDelete)}>
                Delete Tenant
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default TenantPage;
