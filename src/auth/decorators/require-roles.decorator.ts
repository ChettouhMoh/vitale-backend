import { SetMetadata } from '@nestjs/common';
import { Role } from '@/auth/domain';

export const ROLES_KEY = 'auth:roles';

/**
 * Restricts an endpoint to the listed roles. `SuperAdmin` is a wildcard granted
 * inside `RolesGuard` before any role match, so NEVER list it here — listing it
 * on some endpoints but not others is the exact inconsistency the wildcard
 * exists to prevent. Declare the intended role only:
 *
 *   @RequireRoles(Role.Admin)   // ✅ superadmin passes via the guard
 */
export const RequireRoles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
