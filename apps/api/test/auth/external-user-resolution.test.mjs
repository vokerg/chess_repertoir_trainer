import assert from 'node:assert/strict';
import prismaModule from '../../dist/prisma.js';
import { CurrentAppUserService } from '../../dist/auth/current-app-user.service.js';

const prisma = prismaModule.default;
const provider = `test-provider-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const externalSubject = 'external-user';
let userId;

try {
  const created = await CurrentAppUserService.resolveExternalUser({
    provider,
    externalSubject,
    email: 'first@example.com',
    displayName: 'First Name',
  });
  userId = created.user.id;
  assert.equal(created.auth.provider, provider);
  assert.equal(created.auth.externalSubject, externalSubject);
  assert.equal(created.user.email, 'first@example.com');
  assert.equal(created.user.displayName, 'First Name');

  const updated = await CurrentAppUserService.resolveExternalUser({
    provider,
    externalSubject,
    email: 'updated@example.com',
    displayName: 'Updated Name',
  });
  assert.equal(updated.user.id, userId);
  assert.equal(updated.user.email, 'updated@example.com');
  assert.equal(updated.user.displayName, 'Updated Name');

  console.log('External user resolution tests passed.');
} finally {
  if (userId) await prisma.appUser.delete({ where: { id: userId } });
  await prisma.$disconnect();
}
