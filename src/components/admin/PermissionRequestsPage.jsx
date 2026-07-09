import React, { useMemo, useState } from 'react';
import { roleLabel } from '../../data/demoData';

const REQUEST_TYPES = ['Additional Project', 'Role Upgrade', 'Access Extension', 'Temporary Access', 'New Permissions'];
const STATUSES = ['pending', 'approved', 'rejected', 'cancelled', 'expired'];

function PermissionRequestsPage({ currentUser, users, projects, permissionRequests, onSubmitRequest, onApproveRequest, onRejectRequest, isSuperAdmin }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [comment, setComment] = useState('');
  const [draft, setDraft] = useState({ type: '', details: '', projectId: '', targetRole: '' });

  const isAdmin = isSuperAdmin || currentUser.role === 'tenant_admin';

  const visibleRequests = useMemo(() => {
    let list = isAdmin ? permissionRequests : permissionRequests.filter((r) => r.requestedBy === currentUser.uid);
    const needle = query.trim().toLowerCase();
    if (needle) list = list.filter((r) =>
      [r.requestedByName, r.type, r.details, r.status].some((v) => String(v || '').toLowerCase().includes(needle))
    );
    if (statusFilter !== 'all') list = list.filter((r) => r.status === statusFilter);
    if (typeFilter !== 'all') list = list.filter((r) => r.type === typeFilter);
    return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [permissionRequests, query, statusFilter, typeFilter, isAdmin, currentUser.uid]);

  const handleSubmit = () => {
    if (!draft.type || !draft.details.trim()) return;
    onSubmitRequest({
      type: draft.type,
      details: draft.details,
      projectId: draft.projectId,
      targetRole: draft.targetRole,
      requestedBy: currentUser.uid,
      requestedByName: currentUser.name,
      tenantId: currentUser.tenantId,
    });
    setDraft({ type: '', details: '', projectId: '', targetRole: '' });
    setShowForm(false);
  };

  const handleApprove = () => {
    if (!selectedReq) return;
    onApproveRequest(selectedReq.id, comment, currentUser.uid);
    setSelectedReq(null);
    setComment('');
  };

  const handleReject = () => {
    if (!selectedReq) return;
    onRejectRequest(selectedReq.id, comment, currentUser.uid);
    setSelectedReq(null);
    setComment('');
  };

  const statusColor = (s) => ({ pending: 'amber', approved: 'green', rejected: 'red', cancelled: 'gray', expired: 'red' }[s] || 'gray');

  return (
    <>
      <section className="page-title-band">
        <div>
          <h2>Permission Requests</h2>
          <p>{isAdmin ? 'Review, approve, or reject user permission requests.' : 'Submit and track your permission requests.'}</p>
        </div>
        <button className="add-btn" onClick={() => setShowForm((v) => !v)}>
          <i className="ti ti-plus"></i>
          New Request
        </button>
      </section>

      {showForm && (
        <section className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-head">
            <div><h3>Submit Permission Request</h3><p>Fill in details and submit for approval.</p></div>
            <button className="row-action" onClick={() => setShowForm(false)}><i className="ti ti-x"></i></button>
          </div>
          <div style={{ padding: '0 22px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <label className="req-field-label">
              Request Type
              <select value={draft.type} onChange={(e) => setDraft((p) => ({ ...p, type: e.target.value }))} className="req-select">
                <option value="">Select type...</option>
                {REQUEST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="req-field-label">
              Project (optional)
              <select value={draft.projectId} onChange={(e) => setDraft((p) => ({ ...p, projectId: e.target.value }))} className="req-select">
                <option value="">— None —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="req-field-label" style={{ gridColumn: '1 / -1' }}>
              Details / Justification
              <textarea
                value={draft.details}
                onChange={(e) => setDraft((p) => ({ ...p, details: e.target.value }))}
                placeholder="Explain why you need this access..."
                rows={3}
                style={{ resize: 'vertical', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontSize: 13, width: '100%' }}
              />
            </label>
            <div style={{ display: 'flex', gap: 10, gridColumn: '1 / -1' }}>
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
            <h3>Request Log</h3>
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
                <th>Requested By</th>
                <th>Type</th>
                <th>Details</th>
                <th>Status</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {visibleRequests.length === 0 ? (
                <tr><td colSpan={isAdmin ? 6 : 5} className="empty-state compact">No requests found.</td></tr>
              ) : visibleRequests.map((req) => (
                <tr key={req.id}>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{req.createdAt?.slice(0, 10)}</td>
                  <td><strong>{req.requestedByName}</strong><br /><small style={{ color: 'var(--ink-dim)' }}>{req.requestedBy}</small></td>
                  <td><span className="role-badge" style={{ background: 'rgba(11,31,58,0.07)', color: 'var(--navy)' }}>{req.type}</span></td>
                  <td style={{ maxWidth: 220, fontSize: 12, color: 'var(--ink-dim)' }}>{req.details}</td>
                  <td>
                    <span className={`status-badge ${statusColor(req.status)}`}>{req.status}</span>
                  </td>
                  {isAdmin && (
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
                      {req.approvalHistory?.length > 0 && (
                        <button className="row-action" title="History" onClick={() => setSelectedReq({ ...req, action: 'view' })}>
                          <i className="ti ti-history"></i>
                        </button>
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
            {selectedReq.action === 'view' ? (
              <>
                <h3>Approval History</h3>
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {selectedReq.approvalHistory.map((entry, i) => (
                    <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
                      <strong>{entry.action}</strong> by {entry.by} on {entry.at?.slice(0, 10)}
                      {entry.comment && <div style={{ color: 'var(--ink-dim)', marginTop: 4 }}>{entry.comment}</div>}
                    </div>
                  ))}
                </div>
                <div className="modal-actions"><button className="btn-secondary" onClick={() => setSelectedReq(null)}>Close</button></div>
              </>
            ) : (
              <>
                <h3>{selectedReq.action === 'approve' ? 'Approve' : 'Reject'} Request</h3>
                <p className="sub"><strong>{selectedReq.type}</strong> from {selectedReq.requestedByName}</p>
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
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default PermissionRequestsPage;
