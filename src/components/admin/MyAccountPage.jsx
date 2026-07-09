import React, { useState } from 'react';
import { formatDate, getDaysUntilExpiry, getExpiryStatus, roleLabel } from '../../data/demoData';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

function MyAccountPage({ currentUser, projects, auditLog, onRenewAccess, onUpdateMyAccount }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [renewMonths, setRenewMonths] = useState('');
  const [customDays, setCustomDays] = useState('');
  const [showRenewPanel, setShowRenewPanel] = useState(false);

  const assignedProjects = projects.filter((p) =>
    currentUser.projectIds?.includes(p.id) || p.memberUids?.includes(currentUser.uid) || p.tenantAdminUid === currentUser.uid
  );

  const myAuditLog = auditLog.filter((entry) =>
    entry.detail?.includes(currentUser.uid)
  ).slice(0, 8);

  const expiryStatus = getExpiryStatus(currentUser);
  const daysLeft = getDaysUntilExpiry(currentUser.expiryDate);

  // Password change lock: once per month
  const lastChanged = currentUser.lastPasswordChangeDate;
  const daysSinceChange = lastChanged
    ? Math.floor((Date.now() - new Date(lastChanged).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const canChangePassword = daysSinceChange === null || daysSinceChange >= 30;
  const daysUntilNextChange = daysSinceChange !== null ? Math.max(0, 30 - daysSinceChange) : 0;

  const handleRenew = () => {
    let days = 0;
    if (renewMonths === 'custom') {
      days = parseInt(customDays, 10);
      if (!days || days < 1) return;
    } else {
      days = parseInt(renewMonths, 10) * 30;
    }
    if (onRenewAccess) onRenewAccess(currentUser.uid, days);
    setShowRenewPanel(false);
    setRenewMonths('');
    setCustomDays('');
  };

  const beginEdit = () => {
    setEditForm({
      phone: currentUser.phone || '',
      email: currentUser.email || '',
      address: currentUser.address || '',
    });
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (!onUpdateMyAccount) return;
    onUpdateMyAccount(currentUser.uid, {
      phone: editForm.phone,
      email: editForm.email,
      address: editForm.address,
    });
    setIsEditing(false);
  };

  const handlePasswordChange = () => {
    if (!canChangePassword) return;
    if (!newPassword || newPassword.length < 6) return;
    if (newPassword !== confirmPassword) return;
    if (!onUpdateMyAccount) return;
    onUpdateMyAccount(currentUser.uid, { password: newPassword });
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordSection(false);
  };

  const passwordMismatch = confirmPassword && newPassword !== confirmPassword;
  const passwordTooShort = newPassword && newPassword.length < 6;

  const fieldStyle = {
    display: 'flex', flexDirection: 'column', gap: 6,
    fontSize: 12, fontWeight: 800, color: 'var(--ink-dim)'
  };
  const inputStyle = {
    minHeight: 38, border: '1px solid var(--line)',
    borderRadius: 'var(--radius-md)', padding: '0 12px',
    background: 'var(--surface)', color: 'var(--ink)', fontSize: 13
  };

  return (
    <>
      <section className="page-title-band">
        <div>
          <h2>My Account</h2>
          <p>Your profile, contact details, password, assigned projects, and recent activity.</p>
        </div>
      </section>

      <div className="my-account-grid">

        {/* ── Profile Card ── */}
        <section className="panel my-account-profile">
          <div className="profile-avatar-row">
            <div className="profile-avatar">
              {(currentUser.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <h3>{currentUser.name}</h3>
              <span className={`role-badge ${currentUser.role}`}>{roleLabel(currentUser.role)}</span>
            </div>
          </div>

          {/* Read-only fields */}
          <div className="profile-fields">
            <div className="profile-field">
              <span className="profile-label"><i className="ti ti-id-badge"></i> Employee ID</span>
              <span>{currentUser.employeeId || '—'}</span>
            </div>
            <div className="profile-field">
              <span className="profile-label"><i className="ti ti-briefcase"></i> Designation</span>
              <span>{currentUser.designation || '—'}</span>
            </div>
            <div className="profile-field">
              <span className="profile-label"><i className="ti ti-building"></i> Department</span>
              <span>{currentUser.department || '—'}</span>
            </div>
            <div className="profile-field">
              <span className="profile-label"><i className="ti ti-users"></i> Tenant</span>
              <span>{currentUser.tenantId === 'all' ? 'Global (All Tenants)' : currentUser.tenantId}</span>
            </div>
            <div className="profile-field">
              <span className="profile-label"><i className="ti ti-circle-check"></i> Status</span>
              <span className={`status-badge ${currentUser.status || 'active'}`}>{currentUser.status || 'active'}</span>
            </div>
            <div className="profile-field">
              <span className="profile-label"><i className="ti ti-calendar"></i> Member Since</span>
              <span>{formatDate(currentUser.created)}</span>
            </div>
            <div className="profile-field">
              <span className="profile-label"><i className="ti ti-calendar-off"></i> Account Expiry</span>
              <span>
                {currentUser.expiryDate ? formatDate(currentUser.expiryDate) : '—'}
                {expiryStatus && (
                  <span className={`expiry-badge expiry-${expiryStatus.color}`} style={{ marginLeft: 8 }}>
                    ⚠ {expiryStatus.label}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Editable contact fields */}
          {!isEditing ? (
            <>
              <div className="profile-fields" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
                <div className="profile-field">
                  <span className="profile-label"><i className="ti ti-mail"></i> Email</span>
                  <span>{currentUser.email || '—'}</span>
                </div>
                <div className="profile-field">
                  <span className="profile-label"><i className="ti ti-phone"></i> Phone</span>
                  <span>{currentUser.phone || '—'}</span>
                </div>
                <div className="profile-field">
                  <span className="profile-label"><i className="ti ti-map-pin"></i> Address</span>
                  <span>{currentUser.address || '—'}</span>
                </div>
              </div>
              <div style={{ paddingTop: 16 }}>
                <button className="btn-primary" style={{ fontSize: 13 }} onClick={beginEdit}>
                  <i className="ti ti-edit"></i> Edit Contact Details
                </button>
              </div>
            </>
          ) : (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-dim)' }}>Edit Contact Details</span>
              <label style={fieldStyle}>
                Email Address
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  style={inputStyle}
                />
              </label>
              <label style={fieldStyle}>
                Phone Number
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  style={inputStyle}
                />
              </label>
              <label style={fieldStyle}>
                Address
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="e.g. 123 Main St, City"
                  style={inputStyle}
                />
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                <button className="btn-primary" onClick={saveEdit}>
                  <i className="ti ti-device-floppy"></i> Save Changes
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── Password Management ── */}
        <section className="panel password-placeholder-card">
          <div className="panel-head">
            <div>
              <h3>Password</h3>
              <p>Manage your login credentials</p>
            </div>
          </div>
          <div className="password-placeholder-body">
            {!canChangePassword ? (
              <>
                <i className="ti ti-lock password-placeholder-icon"></i>
                <p style={{ color: 'var(--ink-dim)', fontSize: 13 }}>
                  You changed your password recently.
                </p>
                <p style={{ color: 'var(--ink-faint)', fontSize: 12 }}>
                  You can change it again in <strong>{daysUntilNextChange} day{daysUntilNextChange !== 1 ? 's' : ''}</strong> (limit: once per month).
                </p>
                {lastChanged && (
                  <p style={{ color: 'var(--ink-faint)', fontSize: 11, marginTop: 4 }}>
                    Last changed: {formatDate(lastChanged)}
                  </p>
                )}
                <button className="btn-secondary" disabled style={{ marginTop: 8 }}>
                  <i className="ti ti-lock"></i> Change Password — Available in {daysUntilNextChange}d
                </button>
              </>
            ) : !showPasswordSection ? (
              <>
                <i className="ti ti-lock-open password-placeholder-icon"></i>
                <p style={{ color: 'var(--ink-dim)', fontSize: 13 }}>
                  {lastChanged
                    ? `Last changed: ${formatDate(lastChanged)}`
                    : 'You have not changed your password yet.'}
                </p>
                <button className="btn-primary" style={{ marginTop: 8 }} onClick={() => setShowPasswordSection(true)}>
                  <i className="ti ti-key"></i> Change Password
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
                <label style={fieldStyle}>
                  New Password
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn-secondary icon-only"
                      onClick={() => setShowNewPw((v) => !v)}
                      title={showNewPw ? 'Hide' : 'Show'}
                      style={{ minHeight: 38, padding: '0 12px' }}
                    >
                      {showNewPw ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  {passwordTooShort && (
                    <span style={{ color: 'var(--red)', fontSize: 11, fontWeight: 400 }}>
                      Password must be at least 6 characters.
                    </span>
                  )}
                </label>
                <label style={fieldStyle}>
                  Confirm New Password
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type={showConfirmPw ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      style={{ ...inputStyle, flex: 1, borderColor: passwordMismatch ? 'var(--red)' : undefined }}
                    />
                    <button
                      type="button"
                      className="btn-secondary icon-only"
                      onClick={() => setShowConfirmPw((v) => !v)}
                      title={showConfirmPw ? 'Hide' : 'Show'}
                      style={{ minHeight: 38, padding: '0 12px' }}
                    >
                      {showConfirmPw ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  {passwordMismatch && (
                    <span style={{ color: 'var(--red)', fontSize: 11, fontWeight: 400 }}>
                      Passwords do not match.
                    </span>
                  )}
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn-secondary"
                    onClick={() => { setShowPasswordSection(false); setNewPassword(''); setConfirmPassword(''); }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handlePasswordChange}
                    disabled={!newPassword || passwordTooShort || passwordMismatch}
                  >
                    <i className="ti ti-key"></i> Update Password
                  </button>
                </div>
                <p style={{ fontSize: 11, color: 'var(--ink-faint)', margin: 0 }}>
                  Note: You can change your password once per month.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ── Assigned Projects ── */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Assigned Projects</h3>
              <p>{assignedProjects.length} project{assignedProjects.length !== 1 ? 's' : ''} in your scope</p>
            </div>
          </div>
          {assignedProjects.length === 0 ? (
            <div className="empty-state compact">No projects assigned to your account.</div>
          ) : (
            <div className="account-project-list">
              {assignedProjects.map((project) => (
                <div key={project.id} className="account-project-row">
                  <div>
                    <strong>{project.name}</strong>
                    <small>{project.clientName} · {project.tenantId}</small>
                  </div>
                  <span className={`status-pill ${project.status.toLowerCase().replaceAll(' ', '-')}`}>
                    {project.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Recent Activity ── */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Recent Activity</h3>
              <p>Audit events involving your account</p>
            </div>
          </div>
          <div className="audit-mini" style={{ paddingTop: 18, borderTop: 'none', marginTop: 0 }}>
            {myAuditLog.length === 0 ? (
              <div className="empty-state compact">No recent activity.</div>
            ) : myAuditLog.map((item, index) => (
              <div key={`${item.ts}-${index}`}>
                <span className={`audit-dot ${item.type}`}></span>
                <strong>{item.event}</strong>
                <small>{item.detail}</small>
              </div>
            ))}
          </div>
        </section>

        {/* ── Renew Access ── */}
        {onRenewAccess && (
          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>Renew Access</h3>
                <p>Extend your account expiry date</p>
              </div>
            </div>
            <div style={{ padding: '20px 22px' }}>
              {!showRenewPanel ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
                      {daysLeft !== null
                        ? daysLeft < 0 ? 'Your account has expired.' : `Your account expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`
                        : 'No expiry date set.'}
                    </p>
                  </div>
                  <button className="btn-primary" onClick={() => setShowRenewPanel(true)}>
                    <i className="ti ti-refresh"></i>
                    Renew Access
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12, fontWeight: 800, color: 'var(--ink-dim)' }}>
                    Extension Period
                    <select
                      value={renewMonths}
                      onChange={(e) => setRenewMonths(e.target.value)}
                      style={{ minHeight: 42, border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '0 12px' }}
                    >
                      <option value="">Select duration...</option>
                      <option value="1">1 Month</option>
                      <option value="2">2 Months</option>
                      <option value="3">3 Months</option>
                      <option value="6">6 Months</option>
                      <option value="12">12 Months</option>
                      <option value="custom">Custom</option>
                    </select>
                  </label>
                  {renewMonths === 'custom' && (
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12, fontWeight: 800, color: 'var(--ink-dim)' }}>
                      Number of Days
                      <input
                        type="number"
                        min="1"
                        max="730"
                        value={customDays}
                        onChange={(e) => setCustomDays(e.target.value)}
                        placeholder="e.g. 45"
                        style={{ minHeight: 42, border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '0 12px' }}
                      />
                    </label>
                  )}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-secondary" onClick={() => { setShowRenewPanel(false); setRenewMonths(''); setCustomDays(''); }}>Cancel</button>
                    <button className="btn-primary" onClick={handleRenew} disabled={!renewMonths || (renewMonths === 'custom' && !customDays)}>
                      <i className="ti ti-refresh"></i>
                      Apply Extension
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

export default MyAccountPage;
