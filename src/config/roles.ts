export const ORG_ROLES = ["owner", "admin", "backoffice", "member"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

/** Roles that admins can assign when creating or editing users */
export const ASSIGNABLE_ROLES = ["admin", "backoffice", "member"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Ιδιοκτήτης",
  admin: "Admin",
  backoffice: "Back Office",
  member: "Sales Agent",
};

export const ASSIGNABLE_ROLE_LABELS: Record<AssignableRole, string> = {
  admin: ORG_ROLE_LABELS.admin,
  backoffice: ORG_ROLE_LABELS.backoffice,
  member: ORG_ROLE_LABELS.member,
};

export function isAdminRole(role: string) {
  return role === "owner" || role === "admin";
}

export function isBackOfficeRole(role: string) {
  return role === "backoffice";
}

export function canManageSettings(role: string) {
  return isAdminRole(role);
}

export function canAccessReporting(role: string) {
  return !isBackOfficeRole(role);
}

/** Admins and back office can read and work every sales agent's records. */
export function seesAllRecords(role: string) {
  return isAdminRole(role) || isBackOfficeRole(role);
}

export function isAssignableRole(role: string): role is AssignableRole {
  return ASSIGNABLE_ROLES.includes(role as AssignableRole);
}

function isReportingPath(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Back office matches a sales agent, without the reporting section. */
export function canAccessAppPath(role: string, pathname: string) {
  if (isBackOfficeRole(role) && isReportingPath(pathname, "/reporting")) return false;
  return true;
}

export function canAccessApiPath(role: string, pathname: string) {
  if (isBackOfficeRole(role) && isReportingPath(pathname, "/api/v1/reporting")) return false;
  return true;
}

/**
 * Admins and back office edit every order and application; a sales agent
 * edits only the orders they sold (by seller or their sales code).
 */
export function canEditOrder(
  ctx: { role: string; userId: string; salesCode: string | null },
  order: { sellerId: string | null; salesCode: string | null }
) {
  if (seesAllRecords(ctx.role)) return true;
  if (order.sellerId && order.sellerId === ctx.userId) return true;
  return Boolean(ctx.salesCode && order.salesCode === ctx.salesCode);
}

/** Only admins and back office register courier tracking numbers. */
export function canManageShipments(role: string) {
  return seesAllRecords(role);
}

/**
 * Only admins and back office fill the provider-side fields of an app
 * (Κωδικός Καταχώρησης, Αρ. Αίτησης, Κάρτα SIM).
 */
export function canEditBackOfficeFields(role: string) {
  return seesAllRecords(role);
}
