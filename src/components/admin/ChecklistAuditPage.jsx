import React, { useEffect, useState } from 'react';

function ChecklistAuditPage({ allUsers, projects, auditLog, onToggleTouchpoint }) {
  // 'all' means global view; otherwise a specific project id
  const [selectedProjectId, setSelectedProjectId] = useState('all');

  useEffect(() => {
    if (selectedProjectId !== 'all' && !projects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId('all');
    }
  }, [projects, selectedProjectId]);

  const selectedProject = selectedProjectId !== 'all'
    ? projects.find((project) => project.id === selectedProjectId)
    : null;

  // Filter audit log: when a project is selected, filter by project name or id
  const filteredAudit = selectedProject
    ? auditLog.filter((item) =>
        item.detail?.toLowerCase().includes(selectedProject.id.toLowerCase()) ||
        item.detail?.toLowerCase().includes(selectedProject.name.toLowerCase())
      )
    : auditLog;

  const visibleAudit = filteredAudit.slice(0, 20);

  const managerName = (project) =>
    allUsers.find((user) => user.uid === project?.transitionManagerUid)?.email || 'Unassigned';

  return (
    <>
      <section className="page-title-band">
        <div>
          <h2>Checklist & Audit</h2>
          <p>
            {selectedProjectId === 'all'
              ? 'Viewing all projects. Click a project to filter the checklist and audit log.'
              : 'Showing checklist and audit entries for the selected project.'}
          </p>
        </div>
        {selectedProjectId !== 'all' && (
          <button
            className="btn-secondary"
            style={{ fontSize: 13 }}
            onClick={() => setSelectedProjectId('all')}
          >
            <i className="ti ti-list"></i> View All Projects
          </button>
        )}
      </section>

      <section className="split-layout">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>Project Selector</h3>
              <p>Choose a project or view all at once.</p>
            </div>
          </div>
          <div className="project-list">
            {/* All Projects option */}
            <button
              className={selectedProjectId === 'all' ? 'active' : ''}
              onClick={() => setSelectedProjectId('all')}
              style={{ background: selectedProjectId === 'all' ? undefined : 'transparent' }}
            >
              <span>
                <strong>All Projects</strong>
                <small>{projects.length} project{projects.length !== 1 ? 's' : ''} · Global view</small>
              </span>
              <em>{projects.reduce((sum, p) => sum + (p.progress || 0), 0) / Math.max(projects.length, 1) | 0}%</em>
            </button>

            {/* Individual projects */}
            {projects.map((project) => (
              <button
                key={project.id}
                className={selectedProject?.id === project.id ? 'active' : ''}
                onClick={() => setSelectedProjectId(project.id)}
              >
                <span>
                  <strong>{project.name}</strong>
                  <small>{project.clientName} - {project.status}</small>
                </span>
                <em>{project.progress}%</em>
              </button>
            ))}
          </div>
        </div>

        <div className="panel project-detail-panel">
          <div className="panel-head">
            <div>
              <h3>{selectedProject ? 'Project Checklist & Audit' : 'All Checklists & Audit'}</h3>
              <p>{selectedProject ? selectedProject.name : `Aggregated view across ${projects.length} projects`}</p>
            </div>
          </div>

          {selectedProject ? (
            /* ── Single Project View ── */
            <>
              <div className="audit-project-summary">
                <div><span>Client</span><strong>{selectedProject.clientName}</strong></div>
                <div><span>Manager</span><strong>{managerName(selectedProject)}</strong></div>
                <div><span>Progress</span><strong>{selectedProject.progress}%</strong></div>
              </div>
              <div className="touchpoint-list">
                {selectedProject.touchpoints.map((item, index) => (
                  <button key={item.label} onClick={() => onToggleTouchpoint(selectedProject.id, index)}>
                    <i className={`ti ${item.done ? 'ti-circle-check-filled' : 'ti-circle'}`}></i>
                    <span>{item.label}</span>
                  </button>
                ))}
                {selectedProject.touchpoints.length === 0 && (
                  <div className="empty-state compact">No checklist items for this project.</div>
                )}
              </div>

              <div className="audit-section-label">
                Audit Log — {selectedProject.name}
                <span style={{ float: 'right', fontSize: 11, color: 'var(--ink-faint)', fontWeight: 400 }}>
                  {visibleAudit.length} event{visibleAudit.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="audit-mini">
                {visibleAudit.length > 0 ? visibleAudit.map((item, index) => (
                  <div key={`${item.ts}-${index}`}>
                    <span className={`audit-dot ${item.type}`}></span>
                    <strong>{item.event}</strong>
                    <small>{item.detail}</small>
                  </div>
                )) : (
                  <div className="empty-state compact">No audit events found for this project.</div>
                )}
              </div>
            </>
          ) : (
            /* ── All Projects View ── */
            <>

              {/* All audit log */}
              <div className="audit-section-label">
                Audit Log — All Projects
                <span style={{ float: 'right', fontSize: 11, color: 'var(--ink-faint)', fontWeight: 400 }}>
                  {visibleAudit.length} event{visibleAudit.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="audit-mini">
                {visibleAudit.length > 0 ? visibleAudit.map((item, index) => (
                  <div key={`${item.ts}-${index}`}>
                    <span className={`audit-dot ${item.type}`}></span>
                    <strong>{item.event}</strong>
                    <small>{item.detail}</small>
                  </div>
                )) : (
                  <div className="empty-state compact">No audit events yet.</div>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}

export default ChecklistAuditPage;
