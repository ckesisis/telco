export const ORG_ROLES = ["owner", "admin", "member"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

/** Roles that admins can assign when creating or editing users */
export const ASSIGNABLE_ROLES = ["admin", "member"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Ιδιοκτήτης",
  admin: "Admin",
  member: "Sales Agent",
};

export const ASSIGNABLE_ROLE_LABELS: Record<AssignableRole, string> = {
  admin: ORG_ROLE_LABELS.admin,
  member: ORG_ROLE_LABELS.member,
};

export function isAdminRole(role: string) {
  return role === "owner" || role === "admin";
}

export function canManageSettings(role: string) {
  return isAdminRole(role);
}

export function isAssignableRole(role: string): role is AssignableRole {
  return ASSIGNABLE_ROLES.includes(role as AssignableRole);
}
