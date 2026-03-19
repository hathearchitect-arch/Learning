import { readApiSetupJson } from './apis/read-api-setup';
import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';

test('Tear down api access control testing resources', async ({ request }) => {
  const filePath = `${__dirname}/apis/access-control-resources.json`;
  const accessControlResources = readApiSetupJson(filePath);
  expect(accessControlResources).not.toBeNull();

  // delete organization
  const deleteOrganizationResponse = await request.post(
    '/api/auth/organization/delete',
    {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        organizationId: accessControlResources?.organization.id,
      }),
    },
  );
  expect(deleteOrganizationResponse.ok()).toBeTruthy();

  // delete header org regular user
  const deleteHeaderOrgRegularUserResponse = await request.post(
    '/api/auth/admin/remove-user',
    {
      headers: {
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({
        userId: accessControlResources?.headerOrgRegularUser.id,
      }),
    },
  );
  expect(deleteHeaderOrgRegularUserResponse.ok()).toBeTruthy();

  // delete new org regular user
  const deleteNewOrgRegularUserResponse = await request.post(
    '/api/auth/admin/remove-user',
    {
      headers: {
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({
        userId: accessControlResources?.newOrgRegularUser.id,
      }),
    },
  );
  expect(deleteNewOrgRegularUserResponse.ok()).toBeTruthy();

  //delete access-control-resources.json file
  fs.unlinkSync(filePath);
});