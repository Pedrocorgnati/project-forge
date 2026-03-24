// Barrel export for @/lib/auth
// Tests mock this module via vi.mock('@/lib/auth')
export { getServerUser as getAuthUser, getServerUser as getAuthUserOrNull, requireServerUser } from './get-user'
export { withAuth } from './with-auth'
export { withRole } from './with-role'
