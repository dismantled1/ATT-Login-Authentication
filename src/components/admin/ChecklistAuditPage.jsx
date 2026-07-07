import React, { useEffect, useState } from 'react';

function ChecklistAuditPage({ allUsers, projects, auditLog, onToggleTouchpoint }) {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');

  useEffect(() => {
    if (!projects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(projects[0]?.id || '');
    }
  }, [projects, selectedProjectId]);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) || projects[0];
  const visibleAudit = auditLog.slice(0, 12);
  const managerName = (project) => allUsers.find((user) => user.uid === project?.transitionManagerUid)?.email || 'Unassigned';

  return (
    <>
      <section className="page-title-band">
        <div>
          <h2>Checklist & Audit</h2>
          <p>Open a project, update its checklist, review milestones, and inspect recent security activity.</p>
        </div>
      </section>

      <section className="split-layout">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>Project Selector</h3>
              <p>Choose a project to inspect its transition controls.</p>
            </div>
          </div>
          <div className="project-list">
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
              <h3>Checklist and Audit</h3>
              <p>{selectedProject?.name || 'No project selected'}</p>
            </div>
          </div>

          {selectedProject ? (
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
              </div>

              <div className="audit-section-label">Recent Activity</div>
              <div className="audit-mini">
                {visibleAudit.map((item, index) => (
                  <div key={`${item.ts}-${index}`}>
                    <span className={`audit-dot ${item.type}`}></span>
                    <strong>{item.event}</strong>
                    <small>{item.detail}</small>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">Select a project to manage its checklist and audit trail.</div>
          )}
        </div>
      </section>
    </>
  );
}

export default ChecklistAuditPage;
