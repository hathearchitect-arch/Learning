import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { getFormattedDateTime } from '../helpers';

// Define a custom fixture to manage organization setup and cleanup
interface OrganizationFixture {
  organizationId: string;
  request: APIRequestContext;
}

const test = base.extend<OrganizationFixture>({
  organizationId: [
    async ({ request }, use) => {
      const ts = getFormattedDateTime();
      const organizationName = `Playwright Test Organization ${ts}`;
      const createOrganizationResponse = await request.post(
        '/api/auth/organization/create',
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: JSON.stringify({
            name: organizationName,
            slug: `playwright-test-org-${ts}`, // Ensure unique slug
          }),
        },
      );

      expect(createOrganizationResponse.ok()).toBeTruthy();
      const organization = await createOrganizationResponse.json();
      expect(organization).toHaveProperty('id');
      const organizationId = organization.id;

      // Provide the organizationId to tests
      await use(organizationId);

      // Cleanup after all tests
      const deleteOrganizationResponse = await request.post(
        '/api/auth/organization/delete',
        {
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify({
            organizationId,
          }),
        },
      );
      expect(deleteOrganizationResponse.ok()).toBeTruthy();
    },
    { scope: 'test' },
  ],
});

// Use test.describe.serial to ensure tests run sequentially in one worker
test.describe
  .serial('Organization API Tests', () => {
    test('list organizations', async ({ request, organizationId }) => {
      expect(organizationId).toBeDefined();
      const listOrganizationsResponse = await request.get(
        '/api/auth/organization/list',
        {
          headers: {
            Accept: 'application/json',
          },
        },
      );

      expect(listOrganizationsResponse.ok()).toBeTruthy();
      const organizationList: Array<any> =
        await listOrganizationsResponse.json();
      expect(
        organizationList.some((org) => org.id === organizationId),
      ).toBeTruthy();
    });

    test('update organization', async ({ request, organizationId }) => {
      expect(organizationId).toBeDefined();
      const updateOrganizationResponse = await request.post(
        '/api/auth/organization/update',
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: JSON.stringify({
            organizationId,
            data: {
              name: `Playwright Test Organization - UPDATED NAME ${Date.now()}`,
            },
          }),
        },
      );

      expect(updateOrganizationResponse.ok()).toBeTruthy();
      const updatedOrganization = await updateOrganizationResponse.json();
      expect(updatedOrganization.name).toContain('UPDATED NAME');
    });
  });
