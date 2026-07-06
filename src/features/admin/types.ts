/**
 * Admin domain types (Phase 3).
 *
 * The catalog shapes (`Item`, `ItemUnit`, `Category`) are reused as-is from the
 * catalog feature — the admin screens read and write the same entities, just
 * with write access and inactive items included. Only the admin-specific rows
 * (the admin roster and the audit log) live here.
 */

export type AdminRole = 'owner' | 'staff';

/** Row of `public.admins` (see `src/db/0006_admins.sql`). Presence = admin. */
export type Admin = {
  id: string;
  role: AdminRole;
  created_at: string;
};

/** Row of `public.admin_audit_log` (see `src/db/0007_admin_audit_log.sql`). */
export type AuditLogEntry = {
  id: string;
  actor_id: string | null;
  action: 'insert' | 'update' | 'delete';
  table_name: string;
  record_id: string | null;
  changes: unknown;
  created_at: string;
};
