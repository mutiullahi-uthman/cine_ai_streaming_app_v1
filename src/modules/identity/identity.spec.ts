import assert from 'node:assert/strict';
import test from 'node:test';

import { User } from './domain/entities/user.entity';
import { UserRole } from './domain/enums/user-role.enum';

test('public registration normalizes email and assigns viewer role', () => {
  const user = User.registerViewer('  Viewer@Example.COM ', 'password-hash');

  assert.equal(user.email, 'viewer@example.com');
  assert.equal(user.passwordHash, 'password-hash');
  assert.equal(user.role, UserRole.VIEWER);
});
