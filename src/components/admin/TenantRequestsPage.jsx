import React, { useMemo, useState } from 'react';

const REQUEST_TYPES = ['New Tenant', 'Storage Increase', 'Project Creation', 'User Limit Increase', 'Additional Services'];
const STATUSES = ['pending', 'approved', 'rejected', 'cancelled', 'completed'];

function TenantRequestsPage({ currentUser, tenantRequests, onSubmitTenantRequest, onApproveRequest, onRejectRequest, isSuperAdmin }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [comment, setComment] = useState('');
  const [draft, setDraft] = useState({ type: '', details: '' });

  const isAdmin = isSuperAdmin || currentUser.role === 'tenant_admin';

  const visibleRequests = useMemo(() => {
    let list = isSuperAdmin
      ? tenantRequests
      : tenantRequests.filter((r) => r.requestedBy === currentUser.uid || r.tenantId === currentUser.tenantId);
    const needle = query.trim().toLowerCase();
    if (needle) list = list.filter((r) =>
      [r.requestedByName, r.type, r.details, r.status, r.tenantId].some((v) => String(v || '').toLowerCase().includes(needle))
    );
    if (statusFilter !== 'all') list = list.filter((r) => r.status === statusFilter);
    if (typeFilter !== 'all') list = list.filter((r) => r.type === typeFilter);
    return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [tenantRequests, query, statusFilter, typeFilter, isSuperAdmin, currentUser]);

  const handleSubmit = () => {
    if (!draft.type || !draft.details.trim()) return;
    onSubmitTenantRequest({
      type: draft.type,
      details: draft.details,
      requestedBy: currentUser.uid,
      requestedByName: currentUser.name,
      tenantId: currentUser.tenantId,
    });
    setDraft({ type: '', details: '' });
    setShowForm(false);
  };

  const handleApprove = () => {
    if (!selectedReq) return;
    onApproveRequest(selectedReq.id, comment, currentUser.uid);
    setSelectedReq(null); setComment('');
  };

  const handleReject = () => {
    if (!selectedReq) return;
    onRejectRequest(selectedReq.id, comment, currentUser.uid);
    setSelectedReq(null); setComment('');
  };

  const statusColor = (s) => ({ pending: 'amber', approved: 'green', rejected: 'red', cancelled: 'gray', completed: 'green' }[s] || 'gray');

  return (
    <>
      <section className="page-title-band">
        <div>
          <h2>Tenant Requests</h2>
          <p>{isSuperAdmin ? 'Review and manage all tenant requests.' : 'Submit requests for your tenant needs.'}</p>
        </div>
        {isAdmin && (
          <button className="add-btn" onClick={() => setShowForm((v) => !v)}>
            <i className="ti ti-plus"></i>
            New Request
          </button>
        )}
      </section>

      {showForm && (
        <section className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-head">
            <div><h3>Submit Tenant Request</h3><p>Provide details for your request.</p></div>
            <button className="row-action" onClick={() => setShowForm(false)}><i className="ti ti-x"></i></button>
          </div>
          <div style={{ padding: '0 22px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label className="req-field-label">
              Request Type
              <select value={draft.type} onChange={(e) => setDraft((p) => ({ ...p, type: e.target.value }))} className="req-select">
                <option value="">Select type...</option>
                {REQUEST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="req-field-label">
              Details / Justification
              <textarea
                value={draft.details}
                onChange={(e) => setDraft((p) => ({ ...p, details: e.target.value }))}
                placeholder="Describe your request in detail..."
                rows={3}
                style={{ resize: 'vertical', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontSize: 13, width: '100%' }}
              />
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={!draft.type || !draft.details.trim()}>
                <i className="ti ti-send"></i>
                Submit Request
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Tenant Request Log</h3>
            <p>{visibleRequests.length} request{visibleRequests.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="identity-tools">
            <div className="search-box identity-search">
              <i className="ti ti-search"></i>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search requests..." />
            </div>
          </div>
        </div>

        <div className="filter-bar">
          <label>Status
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </label>
          <label>Type
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All types</option>
              {REQUEST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <button className="row-action" onClick={() => { setQuery(''); setStatusFilter('all'); setTypeFilter('all'); }}>Clear filters</button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Tenant</th>
                <th>Requested By</th>
                <th>Type</th>
                <th>Details</th>
                <th>Status</th>
                {isSuperAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {visibleRequests.length === 0 ? (
                <tr><td colSpan={isSuperAdmin ? 7 : 6} className="empty-state compact">No tenant requests found.</td></tr>
              ) : visibleRequests.map((req) => (
                <tr key={req.id}>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{req.createdAt?.slice(0, 10)}</td>
                  <td style={{ fontSize: 12 }}>{req.tenantId}</td>
                  <td><strong>{req.requestedByName}</strong></td>
                  <td><span className="role-badge" style={{ background: 'rgba(11,31,58,0.07)', color: 'var(--navy)' }}>{req.type}</span></td>
                  <td style={{ maxWidth: 200, fontSize: 12, color: 'var(--ink-dim)' }}>{req.details}</td>
                  <td><span className={`status-badge ${statusColor(req.status)}`}>{req.status}</span></td>
                  {isSuperAdmin && (
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {req.status === 'pending' && (
                        <>
                          <button className="row-action" title="Approve" onClick={() => setSelectedReq({ ...req, action: 'approve' })}>
                            <i className="ti ti-check"></i>
                          </button>
                          <button className="row-action" title="Reject" onClick={() => setSelectedReq({ ...req, action: 'reject' })}>
                            <i className="ti ti-x"></i>
                          </button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedReq && (
        <div className="modal-overlay show" onClick={() => { setSelectedReq(null); setComment(''); }}>
          <div className="modal-box confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{selectedReq.action === 'approve' ? 'Approve' : 'Reject'} Tenant Request</h3>
            <p className="sub"><strong>{selectedReq.type}</strong> from {selectedReq.requestedByName} ({selectedReq.tenantId})</p>
            <p style={{ fontSize: 13, color: 'var(--ink-dim)', margin: '10px 0' }}>{selectedReq.details}</p>
            <label className="req-field-label" style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              Comment (optional)
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
                style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: 13, resize: 'vertical' }} />
            </label>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => { setSelectedReq(null); setComment(''); }}>Cancel</button>
              {selectedReq.action === 'approve'
                ? <button className="btn-primary" onClick={handleApprove}><i className="ti ti-check"></i> Approve</button>
                : <button className="btn-primary" style={{ background: 'var(--red)' }} onClick={handleReject}><i className="ti ti-x"></i> Reject</button>
              }
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default TenantRequestsPage;
