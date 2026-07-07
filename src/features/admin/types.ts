/**
 * Admin domain types (Phase 3).
 *
 * The catalog shapes (`Item`, `ItemUnit`, `Category`) are reused as-is from the
 * catalog feature — the admin screens read and write the same entities, just
 * with write access and inactive items included. Only the admin-specific rows
 * (the admin roster) live here.
 */

export type AdminRole = 'owner' | 'staff';

/** Row of `public.admins` (see `src/db/0006_admins.sql`). Presence = admin. */
export type Admin = {
  id: string;
  role: AdminRole;
  created_at: string;
};
