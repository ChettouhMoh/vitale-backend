/**
 * Every actor the platform will ever authenticate. All five are declared so the
 * type is stable and guards can reference them, but only `Doctor` is wired in
 * this build (admin/patient/guardian auth arrive with their own contexts).
 *
 * `SuperAdmin` is a wildcard granted inside `RolesGuard` before any role match —
 * it is NEVER listed in a `@RequireRoles(...)` call. `Guardian` is a permission
 * over another patient's record rather than a plain login role; that design
 * belongs with the mobile app.
 */
export enum Role {
  SuperAdmin = 'superadmin',
  Admin = 'admin',
  Doctor = 'doctor',
  Patient = 'patient',
  Guardian = 'guardian',
}
