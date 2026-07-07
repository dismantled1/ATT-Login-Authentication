import { DEFAULT_PROJECTS, DEFAULT_USERS } from './demoData';

export const DATA_VERSION = '5';

const readStored = (key) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const mergeRecord = (base, patch) => ({
  ...base,
  ...patch,
  role: patch.role || base.role,
  projectIds: Array.isArray(patch.projectIds) && patch.projectIds.length > 0
    ? patch.projectIds
    : base.projectIds,
  memberUids: Array.isArray(patch.memberUids) && patch.memberUids.length > 0
    ? patch.memberUids
    : base.memberUids,
  tenantAdminUid: patch.tenantAdminUid || base.tenantAdminUid,
  transitionManagerUid: patch.transitionManagerUid ?? base.transitionManagerUid,
  milestones: Array.isArray(patch.milestones) && patch.milestones.length > 0
    ? patch.milestones
    : base.milestones,
  touchpoints: Array.isArray(patch.touchpoints) && patch.touchpoints.length > 0
    ? patch.touchpoints
    : base.touchpoints
});

const mergeWithDefaults = (stored, defaults, getKey) => {
  const merged = new Map(defaults.map((item) => [getKey(item), clone(item)]));

  if (Array.isArray(stored)) {
    stored.forEach((item) => {
      const key = getKey(item);
      if (!key) return;
      const base = merged.get(key) || {};
      merged.set(key, mergeRecord(base, item));
    });
  }

  return Array.from(merged.values());
};

const isUserCatalogComplete = (users) =>
  DEFAULT_USERS.every((entry) => users.some((user) => user.uid === entry.uid));

const isProjectCatalogComplete = (projects) =>
  DEFAULT_PROJECTS.every((entry) => projects.some((project) => project.id === entry.id));

const preserveCustomEntries = (stored, defaults, getKey) => {
  if (!Array.isArray(stored)) return [];
  const defaultKeys = new Set(defaults.map(getKey));
  return stored.filter((item) => {
    const key = getKey(item);
    return key && !defaultKeys.has(key);
  });
};

export const loadUserCatalog = () => {
  const stored = readStored('att_users');
  const version = localStorage.getItem('att_data_version');
  let users = mergeWithDefaults(stored, DEFAULT_USERS, (user) => user.uid);

  if (version !== DATA_VERSION || !isUserCatalogComplete(users)) {
    const customUsers = preserveCustomEntries(stored, DEFAULT_USERS, (user) => user.uid);
    users = [...DEFAULT_USERS.map(clone), ...customUsers];
  }

  return users;
};

export const loadProjectCatalog = () => {
  const stored = readStored('att_projects');
  const version = localStorage.getItem('att_data_version');
  let projects = mergeWithDefaults(stored, DEFAULT_PROJECTS, (project) => project.id);

  if (version !== DATA_VERSION || !isProjectCatalogComplete(projects)) {
    const customProjects = preserveCustomEntries(stored, DEFAULT_PROJECTS, (project) => project.id);
    projects = [...DEFAULT_PROJECTS.map(clone), ...customProjects];
  }

  return projects;
};

export const persistCatalogVersion = () => {
  localStorage.setItem('att_data_version', DATA_VERSION);
};

export const resolveRole = (user) => {
  if (!user) return null;
  if (user.uid === 'super-admin') return 'super_admin';

  const catalogUser = DEFAULT_USERS.find((entry) => entry.uid === user.uid);
  const roleFromList = Array.isArray(user.roles) ? user.roles[0] : null;

  if (user.role === 'super_admin' || roleFromList === 'super_admin') return 'super_admin';
  return user.role || roleFromList || catalogUser?.role || null;
};

export const withResolvedRole = (user) => (
  user ? { ...user, role: resolveRole(user) } : null
);

export const isSuperAdminUser = (user) => resolveRole(user) === 'super_admin';

export const isTenantAdminUser = (user) => resolveRole(user) === 'tenant_admin';

export const isAdminUser = (user) => {
  const role = resolveRole(user);
  return role === 'super_admin' || role === 'tenant_admin';
};

export const getScopedProjects = (user, projects) => {
  if (!user) return [];
  const role = resolveRole(user);
  if (role === 'super_admin') return projects;
  if (role === 'tenant_admin') {
    return projects.filter(
      (project) => project.tenantAdminUid === user.uid || project.tenantId === user.tenantId
    );
  }
  return projects.filter(
    (project) => user.projectIds?.includes(project.id) || project.memberUids?.includes(user.uid)
  );
};

export const getScopedUsers = (user, users, scopedProjects) => {
  if (!user) return [];
  const role = resolveRole(user);
  if (role === 'super_admin') return users;

  const scopedProjectIds = scopedProjects.map((project) => project.id);
  const scopedMemberIds = new Set(scopedProjects.flatMap((project) => [
    project.tenantAdminUid,
    project.transitionManagerUid,
    ...(project.memberUids || [])
  ]));

  return users.filter((candidate) => {
    if (candidate.uid === user.uid) return true;
    if (candidate.role === 'super_admin') return false;
    if (scopedMemberIds.has(candidate.uid)) return true;
    return candidate.projectIds?.some((projectId) => scopedProjectIds.includes(projectId));
  });
};
