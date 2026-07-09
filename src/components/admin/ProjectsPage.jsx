import React, { useMemo, useRef, useState } from 'react';
import { formatDate, roleLabel } from '../../data/demoData';

const emptyProject = {
  name: '',
  clientName: '',
  description: '',
  startDate: '',
  endDate: '',
  status: 'Planning',
  priority: 'Medium',
  tenantName: '',
  tenantId: '',
  tenantAdminUid: '',
  transitionManagerUid: '',
  memberUids: []
};

function ProjectsPage({ users, allUsers, projects, currentUser, onSaveProject, onDeleteProject }) {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [draftProject, setDraftProject] = useState(null);
  const [query, setQuery] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [justJumped, setJustJumped] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const editorPanelRef = useRef(null);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) || projects[0];
  const activeDraft = draftProject || selectedProject || emptyProject;
  const isCreating = Boolean(draftProject && !draftProject.id);

  // Feature 8: Filter suspended users from all project assignment lists
  const activeUsers = allUsers.filter((u) => (u.status || 'active') !== 'suspended');
  const activeUsersInScope = users.filter((u) => (u.status || 'active') !== 'suspended');

  const tenantAdmins = activeUsers.filter((user) => user.role === 'tenant_admin');
  const scopedManagers = activeUsersInScope.filter((user) => user.role === 'manager');

  // Feature 2: Searchable, filtered member list
  const memberNeedle = memberSearch.trim().toLowerCase();
  const scopedEditableUsers = activeUsersInScope.filter((user) =>
    (user.role === 'manager' || user.role === 'user') &&
    (!memberNeedle || [user.name, user.email, user.uid, user.department || '', user.employeeId || ''].some(
      (v) => String(v).toLowerCase().includes(memberNeedle)
    ))
  );

  const filteredProjects = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return projects;
    return projects.filter((project) => (
      project.name.toLowerCase().includes(needle) ||
      project.clientName.toLowerCase().includes(needle) ||
      project.description.toLowerCase().includes(needle) ||
      project.tenantName.toLowerCase().includes(needle)
    ));
  }, [projects, query]);

  const managerName = (project) => allUsers.find((user) => user.uid === project.transitionManagerUid)?.email || 'Unassigned';
  const tenantAdminName = (project) => allUsers.find((user) => user.uid === project.tenantAdminUid)?.name || 'Unassigned';

  const beginCreateProject = () => {
    const tenantAdminUid = currentUser.role === 'tenant_admin' ? currentUser.uid : tenantAdmins[0]?.uid || '';
    const tenantAdmin = allUsers.find((user) => user.uid === tenantAdminUid);
    setDraftProject({
      ...emptyProject,
      tenantAdminUid,
      tenantId: tenantAdmin?.tenantId || currentUser.tenantId || '',
      tenantName: tenantAdmin?.name || '',
      memberUids: []
    });
    setSelectedProjectId('');
    jumpToEditor();
  };

  const jumpToEditor = () => {
    editorPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setJustJumped(true);
    setTimeout(() => setJustJumped(false), 1100);
  };

  const beginEditProject = (project) => {
    setDraftProject({ ...project, memberUids: project.memberUids || [] });
    setSelectedProjectId(project.id);
    jumpToEditor();
  };

  const cancelDraft = () => {
    setDraftProject(null);
    if (!selectedProjectId && projects[0]) setSelectedProjectId(projects[0].id);
  };

  const updateDraft = (field, value) => {
    setDraftProject((prev) => {
      const base = prev || selectedProject || emptyProject;
      if (field === 'tenantAdminUid') {
        const tenantAdmin = allUsers.find((user) => user.uid === value);
        return {
          ...base,
          tenantAdminUid: value,
          tenantId: tenantAdmin?.tenantId || base.tenantId,
          tenantName: tenantAdmin?.name || base.tenantName
        };
      }
      if (field === 'memberUids') return { ...base, memberUids: value };
      return { ...base, [field]: value };
    });
  };

  const saveDraft = () => {
    if (!activeDraft.name.trim() || !activeDraft.clientName.trim()) return;
    const saved = onSaveProject(activeDraft);
    if (saved) {
      setDraftProject(null);
      setSelectedProjectId(activeDraft.id || activeDraft.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  const requestDeleteProject = (project) => {
    setDeleteTarget(project);
  };

  const confirmDeleteProject = () => {
    if (!deleteTarget || !onDeleteProject) return;
    const deletedId = deleteTarget.id;
    const removed = onDeleteProject(deletedId);
    if (removed !== false) {
      if (draftProject?.id === deletedId) setDraftProject(null);
      if (selectedProjectId === deletedId) {
        const remaining = projects.filter((project) => project.id !== deletedId);
        setSelectedProjectId(remaining[0]?.id || '');
      }
    }
    setDeleteTarget(null);
  };

  return (
    <>
      <section className="page-title-band">
        <div>
          <h2>Projects</h2>
          <p>Create, open, search, and edit transition projects inside your permission scope.</p>
        </div>
        <button className="add-btn" onClick={beginCreateProject}>
          <i className="ti ti-plus"></i>
          Create Project
        </button>
      </section>

      <section className="panel project-browser">
        <div className="panel-head">
          <div>
            <h3>Transition Projects</h3>
            <p>{currentUser.role === 'super_admin' ? 'All tenant workspaces' : 'Your assigned tenant workspace'}</p>
          </div>
          <div className="search-box">
            <i className="ti ti-search"></i>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects" />
          </div>
        </div>

        <div className="project-grid">
          {filteredProjects.length === 0 ? (
            <div className="empty-state compact">No projects match your search.</div>
          ) : filteredProjects.map((project) => (
            <article
              className={`project-card ${selectedProject?.id === project.id ? 'selected' : ''}`}
              key={project.id}
              role="button"
              tabIndex={0}
              onClick={() => beginEditProject(project)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  beginEditProject(project);
                }
              }}
            >
              <header>
                <h4>{project.name}</h4>
                <span className={`status-pill ${project.status.toLowerCase().replaceAll(' ', '-')}`}>{project.status}</span>
              </header>
              <p>{project.description}</p>
              <dl>
                <div><dt>Client Name</dt><dd>{project.clientName}</dd></div>
                <div><dt>Transition Start Date</dt><dd>{formatDate(project.startDate)}</dd></div>
                <div><dt>Transition End Date</dt><dd>{formatDate(project.endDate)}</dd></div>
                <div><dt>Tenant Admin</dt><dd>{tenantAdminName(project)}</dd></div>
                <div><dt>Transition Manager</dt><dd>{managerName(project)}</dd></div>
              </dl>
              <div className="progress-line">
                <span style={{ width: `${project.progress}%` }}></span>
              </div>
              <div className="project-card-actions project-card-actions-row">
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    beginEditProject(project);
                  }}
                >
                  <i className="ti ti-edit"></i>
                  Edit
                </button>
                <button
                  className="danger-outline"
                  onClick={(event) => {
                    event.stopPropagation();
                    requestDeleteProject(project);
                  }}
                >
                  <i className="ti ti-trash"></i>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={`panel editor-panel ${justJumped ? 'panel-jump-highlight' : ''}`} ref={editorPanelRef}>
        <div className="panel-head">
          <div>
            <h3>{isCreating ? 'Create Project' : 'Project Control'}</h3>
            <p>{activeDraft.name || 'Select or create a project'}</p>
          </div>
          {draftProject && <button className="row-action" type="button" onClick={cancelDraft}>Cancel</button>}
        </div>

        <div className="editor-grid">
          <label>Project Name<input value={activeDraft.name || ''} onChange={(event) => updateDraft('name', event.target.value)} /></label>
          <label>Client Name<input value={activeDraft.clientName || ''} onChange={(event) => updateDraft('clientName', event.target.value)} /></label>
          <label className="wide">Description<textarea value={activeDraft.description || ''} onChange={(event) => updateDraft('description', event.target.value)} /></label>
          <label>Start Date<input type="date" value={activeDraft.startDate || ''} onChange={(event) => updateDraft('startDate', event.target.value)} /></label>
          <label>End Date<input type="date" value={activeDraft.endDate || ''} onChange={(event) => updateDraft('endDate', event.target.value)} /></label>
          <label>Status<select value={activeDraft.status || 'Planning'} onChange={(event) => updateDraft('status', event.target.value)}><option>Planning</option><option>In Progress</option><option>Verifying</option><option>Completed</option></select></label>
          <label>Priority<select value={activeDraft.priority || 'Medium'} onChange={(event) => updateDraft('priority', event.target.value)}><option>Low</option><option>Medium</option><option>High</option></select></label>
          <label>Tenant Admin<select value={activeDraft.tenantAdminUid || ''} disabled={currentUser.role === 'tenant_admin'} onChange={(event) => updateDraft('tenantAdminUid', event.target.value)}><option value="">Unassigned</option>{tenantAdmins.map((user) => <option key={user.uid} value={user.uid}>{user.name}</option>)}</select></label>
          <label>Transition Manager<select value={activeDraft.transitionManagerUid || ''} onChange={(event) => updateDraft('transitionManagerUid', event.target.value)}><option value="">Unassigned</option>{scopedManagers.map((user) => <option key={user.uid} value={user.uid}>{user.name} ({user.email})</option>)}</select></label>
        </div>

        <div className="member-picker">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h4>Project Users <small style={{ fontWeight: 400, color: 'var(--ink-dim)', fontSize: 12 }}>Active only</small></h4>
            <div className="search-box" style={{ maxWidth: 240, minHeight: 34 }}>
              <i className="ti ti-search"></i>
              <input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search by name, email, ID..."
                style={{ fontSize: 12 }}
              />
            </div>
          </div>
          <div>
            {scopedEditableUsers.map((user) => {
              const checked = activeDraft.memberUids?.includes(user.uid) || activeDraft.transitionManagerUid === user.uid;
              return (
                <label key={user.uid}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const currentMembers = new Set(activeDraft.memberUids || []);
                      if (event.target.checked) currentMembers.add(user.uid);
                      else currentMembers.delete(user.uid);
                      updateDraft('memberUids', Array.from(currentMembers));
                    }}
                  />
                  <span>{user.name}</span>
                  <small>{roleLabel(user.role)}</small>
                </label>
              );
            })}
          </div>
        </div>

        <div className="editor-footer">
          <button className="btn-primary save-project" onClick={saveDraft}>
            <i className="ti ti-device-floppy"></i>
            Save Project
          </button>
          {!isCreating && activeDraft.id && (
            <button
              className="btn-secondary danger-outline"
              type="button"
              onClick={() => requestDeleteProject(activeDraft)}
            >
              <i className="ti ti-trash"></i>
              Delete Project
            </button>
          )}
        </div>
      </section>

      {deleteTarget && (
        <div className="modal-overlay show" onClick={() => setDeleteTarget(null)}>
          <div className="modal-box confirm-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Delete project</h3>
            <p className="sub">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong> ({deleteTarget.clientName})?
              This removes it from every user it's assigned to and cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn-primary" style={{ background: 'var(--red)' }} onClick={confirmDeleteProject}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ProjectsPage;
