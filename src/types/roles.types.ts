// Subset of USER_ROLES used for route-level access control. "moderator" is reserved for future use.
export const ROLES = ["user", "admin"] as const;
export type Role = (typeof ROLES)[number];
