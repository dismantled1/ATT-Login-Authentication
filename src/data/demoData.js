const tenants = [
  { id: 'tenant-att', name: 'AT&T' },
  { id: 'tenant-verizon', name: 'Verizon' },
  { id: 'tenant-tmobile', name: 'T-Mobile' },
  { id: 'tenant-vodafone', name: 'Vodafone' }
];

const projectNames = ['AI Touch Transition', 'Finance Platform', 'HR Portal', 'Customer Dashboard', 'Operations Suite'];

export const DEFAULT_PROJECTS = [];
export const DEFAULT_USERS = [];

DEFAULT_USERS.push({
  uid: 'super-admin', name: 'Super Admin', role: 'super_admin', email: 'superadmin@att.com', created: '2026-01-01', tenantId: 'all', projectIds: [], pw: 'admin123'
});

tenants.forEach((t) => {
  const tprefix = t.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const tProjects = [];
  
  projectNames.forEach((pname, j) => {
    const pid = `proj-${tprefix}-${j}`;
    tProjects.push(pid);
    DEFAULT_PROJECTS.push({
      id: pid,
      name: pname,
      tenantId: t.id,
      tenantName: t.name,
      clientName: t.name,
      description: `${pname} for ${t.name}`,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: j % 2 === 0 ? 'In Progress' : 'Planning',
      priority: j === 0 ? 'High' : 'Medium',
      tenantAdminUid: `admin-${tprefix}`,
      transitionManagerUid: `tm-${tprefix}-1`,
      memberUids: [`tm-${tprefix}-1`],
      progress: 50,
      milestones: [],
      touchpoints: []
    });
  });

  DEFAULT_USERS.push({
    uid: `admin-${tprefix}`, name: `${t.name} Admin`, role: 'tenant_admin', email: `admin@${tprefix}.com`, created: '2026-01-01', tenantId: t.id, projectIds: tProjects, pw: 'admin123'
  });

  for (let k = 1; k <= 2; k++) {
    DEFAULT_USERS.push({
      uid: `tm-${tprefix}-${k}`, name: `${t.name} Trans Mgr ${k}`, role: 'manager', email: `tm${k}@${tprefix}.com`, created: '2026-01-01', tenantId: t.id, projectIds: tProjects.slice(0, 2), pw: 'manager123'
    });
  }

  for (let k = 1; k <= 5; k++) {
    DEFAULT_USERS.push({
      uid: `mgr-${tprefix}-${k}`, name: `${t.name} Manager ${k}`, role: 'manager', email: `mgr${k}@${tprefix}.com`, created: '2026-01-01', tenantId: t.id, projectIds: tProjects.slice(2, 4), pw: 'manager123'
    });
  }

  for (let k = 1; k <= 20; k++) {
    DEFAULT_USERS.push({
      uid: `usr-${tprefix}-${k}`, name: `${t.name} User ${k}`, role: 'user', email: `usr${k}@${tprefix}.com`, created: '2026-01-01', tenantId: t.id, projectIds: [tProjects[k % 5]], pw: 'demo123'
    });
  }
});

export const DEFAULT_AUDIT_LOG = [
  { date: '2026-06-22', ts: '09:41:02', event: 'access_granted', detail: 'vg-0210 - login successful', type: 'granted' }
];

export const roleLabel = (role) => {
  switch (role) {
    case 'super_admin': return 'Super Admin';
    case 'tenant_admin': return 'Tenant Admin';
    case 'manager': return 'Transition Manager';
    case 'user': return 'User';
    default: return role;
  }
};

export const formatDate = (date) => {
  if (!date) return '';
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};
