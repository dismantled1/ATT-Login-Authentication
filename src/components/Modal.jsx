import React, { useEffect, useMemo, useState } from 'react';
import { roleLabel } from '../data/demoData';
import { FaEye, FaEyeSlash, FaSyncAlt } from "react-icons/fa";

const genRandomPassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pw = '';
  for (let i = 0; i < 10; i += 1) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw.slice(0, 4) + '-' + pw.slice(4, 8) + '-' + pw.slice(8);
};

// default Active Duration = 3 months from today, formatted for <input type="date">
const getDefaultActiveDuration = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  return d.toISOString().slice(0, 10);
};

function Modal({ isOpen, onClose, onCreateUser, currentUser, projects }) {
  const [name, setName] = useState('');
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('manager');
  const [password, setPassword] = useState('');
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeDuration, setActiveDuration] = useState('');

  const roleOptions = useMemo(() => {
    if (currentUser?.role === 'super_admin') {
      return ['tenant_admin', 'manager', 'user'];
    }
    return ['manager', 'user'];
  }, [currentUser]);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setUserId('');
      setRole(roleOptions[0] || 'manager');
      setPassword(genRandomPassword());
      setSelectedProjectIds(projects[0] ? [projects[0].id] : []);
      setActiveDuration(getDefaultActiveDuration());
      setIsSaving(false);
      setShowPassword(false);
    }
  }, [isOpen, projects, roleOptions]);

  const toggleProject = (projectId) => {
    setSelectedProjectIds((prev) => {
      if (prev.includes(projectId)) return prev.filter((id) => id !== projectId);
      return [...prev, projectId];
    });
  };

  const handleCreate = async () => {
    const trimmedName = name.trim();
    const trimmedUid = userId.trim();

    if (!trimmedName || !trimmedUid || selectedProjectIds.length === 0) return;

    setIsSaving(true);
    const success = await onCreateUser({
      name: trimmedName,
      uid: trimmedUid,
      role,
      password,
      projectIds: selectedProjectIds,
      activeDuration
    });
    setIsSaving(false);
    if (success) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${isOpen ? 'show' : ''}`} onClick={onClose}>
      <div className="modal-box" onClick={(event) => event.stopPropagation()}>
        <h3>Create scoped account</h3>
        <p className="sub">Assign the account to one or more projects inside your allowed scope.</p>

        <div className="field">
          <label>Full name</label>
          <input
            type="text"
            placeholder="e.g. Aayushman Pratap Singh"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="field">
          <label>User ID</label>
          <input
            type="text"
            placeholder="e.g. aps-0142"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
          />
        </div>

        <div className="field">
          <label>Role</label>
          <select value={role} onChange={(event) => setRole(event.target.value)}>
            {roleOptions.map((option) => (
              <option key={option} value={option}>{roleLabel(option)}</option>
            ))}
          </select>
        </div>

        <div className={`role-note ${role}`}>
          <strong>{roleLabel(role)}: </strong>
          {role === 'tenant_admin' && 'Owns assigned projects and controls managers/users for those projects.'}
          {role === 'manager' && 'Can update transition checklists only for assigned projects.'}
          {role === 'user' && 'Can view assigned transition projects in read-only mode.'}
        </div>

        <div className="field">
          <label>Project Scope</label>
          <div className="project-scope-list">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                className={selectedProjectIds.includes(project.id) ? 'selected' : ''}
                onClick={() => toggleProject(project.id)}
              >
                <i className={`ti ${selectedProjectIds.includes(project.id) ? 'ti-check' : 'ti-plus'}`}></i>
                <span>{project.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Expiry Date</label> 
          <input
            type="date"
            value={activeDuration}
            onChange={(event) => setActiveDuration(event.target.value)}
          />
        </div>

        <div className="field">
          <label>Password</label>
          <p className="password-helper-text">
            Generate strong password or create custom
          </p>
          <div className="password-row">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Type password or generate one"
            />
            <button
              className="btn-secondary icon-only"
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              title={showPassword ? 'Hide password' : 'Show password'}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
            <button className="btn-secondary icon-only" onClick={(event) => {
              event.preventDefault();
              setPassword(genRandomPassword());
            }} title="Generate random password">
              <FaSyncAlt />
            </button>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleCreate}
            disabled={isSaving || !name.trim() || !userId.trim() || selectedProjectIds.length === 0}
          >
            {isSaving ? 'Creating...' : 'Create account'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Modal;
