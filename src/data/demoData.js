const tenants = [
  { id: 'tenant-att', name: 'AT&T' },
  { id: 'tenant-verizon', name: 'Verizon' },
  { id: 'tenant-tmobile', name: 'T-Mobile' },
  { id: 'tenant-vodafone', name: 'Vodafone' }
];

const projectNames = ['AI Touch Transition', 'Finance Platform', 'HR Portal', 'Customer Dashboard', 'Operations Suite'];

const addDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const DEFAULT_PROJECTS = [];
export const DEFAULT_USERS = [];

DEFAULT_USERS.push({
  uid: 'super-admin', name: 'Super Admin', role: 'super_admin',
  email: 'superadmin@att.com', created: '2026-01-01', tenantId: 'all',
  projectIds: [], pw: 'admin123', status: 'active',
  employeeId: 'EMP-0001', phone: '+1-800-000-0001', designation: 'Platform Super Admin',
  department: 'Platform Engineering', expiryDate: addDays(365)
});

tenants.forEach((t, ti) => {
  const tprefix = t.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const tProjects = [];

  projectNames.forEach((pname, j) => {
    const pid = `proj-${tprefix}-${j}`;
    tProjects.push(pid);
    DEFAULT_PROJECTS.push({
      id: pid, name: pname, tenantId: t.id, tenantName: t.name,
      clientName: t.name, description: `${pname} for ${t.name}`,
      startDate: '2026-01-01', endDate: '2026-12-31',
      status: j % 2 === 0 ? 'In Progress' : 'Planning',
      priority: j === 0 ? 'High' : 'Medium',
      tenantAdminUid: `admin-${tprefix}`,
      transitionManagerUid: `tm-${tprefix}-1`,
      memberUids: [`tm-${tprefix}-1`],
      progress: 50, milestones: [], touchpoints: []
    });
  });

  DEFAULT_USERS.push({
    uid: `admin-${tprefix}`, name: `${t.name} Admin`, role: 'tenant_admin',
    email: `admin@${tprefix}.com`, created: '2026-01-01', tenantId: t.id,
    projectIds: tProjects, pw: 'admin123', status: 'active',
    employeeId: `EMP-${ti + 2}01`, phone: `+1-800-00${ti + 2}-001`,
    designation: 'Tenant Administrator', department: 'IT Administration',
    expiryDate: addDays(180)
  });

  for (let k = 1; k <= 2; k++) {
    DEFAULT_USERS.push({
      uid: `tm-${tprefix}-${k}`, name: `${t.name} Trans Mgr ${k}`, role: 'manager',
      email: `tm${k}@${tprefix}.com`, created: '2026-01-01', tenantId: t.id,
      projectIds: tProjects.slice(0, 2), pw: 'manager123', status: 'active',
      employeeId: `EMP-${ti + 2}${10 + k}`, phone: `+1-800-00${ti + 2}-${10 + k}`,
      designation: 'Transition Manager', department: 'Project Management',
      expiryDate: addDays(k === 1 ? 10 : 90)
    });
  }

  for (let k = 1; k <= 5; k++) {
    DEFAULT_USERS.push({
      uid: `mgr-${tprefix}-${k}`, name: `${t.name} Manager ${k}`, role: 'manager',
      email: `mgr${k}@${tprefix}.com`, created: '2026-01-01', tenantId: t.id,
      projectIds: tProjects.slice(2, 4), pw: 'manager123', status: 'active',
      employeeId: `EMP-${ti + 2}${20 + k}`, phone: `+1-800-00${ti + 2}-${20 + k}`,
      designation: 'Project Manager', department: 'Operations',
      expiryDate: addDays(k <= 2 ? 5 : 365)
    });
  }

  for (let k = 1; k <= 20; k++) {
    DEFAULT_USERS.push({
      uid: `usr-${tprefix}-${k}`, name: `${t.name} User ${k}`, role: 'user',
      email: `usr${k}@${tprefix}.com`, created: '2026-01-01', tenantId: t.id,
      projectIds: [tProjects[k % 5]], pw: 'demo123', status: 'active',
      employeeId: `EMP-${ti + 2}${30 + k}`, phone: `+1-800-00${ti + 2}-${30 + k}`,
      designation: 'User', department: k % 3 === 0 ? 'Engineering' : k % 3 === 1 ? 'Operations' : 'Finance',
      expiryDate: addDays(k <= 3 ? k * 3 : 365)
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
    default: return role || 'User';
  }
};

export const formatDate = (date) => {
  if (!date) return '';
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};

export const getDaysUntilExpiry = (expiryDate) => {
  if (!expiryDate) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
};

export const getExpiryStatus = (user) => {
  const days = getDaysUntilExpiry(user.expiryDate);
  if (days === null) return null;
  if (days < 0) return { label: 'Expired', color: 'red', days };
  if (days <= 3) return { label: `Expires in ${days}d`, color: 'red', days };
  if (days <= 7) return { label: `Expires in ${days}d`, color: 'orange', days };
  if (days <= 14) return { label: `Expires in ${days}d`, color: 'amber', days };
  return null;
};
