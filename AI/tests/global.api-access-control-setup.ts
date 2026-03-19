import {
  test as base,
  expect,
  type APIRequestContext,
  request as playwrightRequest,
  type TestInfo,
} from '@playwright/test';
import { getFormattedDateTime } from './helpers';
import * as fs from 'node:fs';
import type {
  User,
  AccessControlFixture,
  AccessControlResources,
} from './apis/read-api-setup';

const test = base.extend<AccessControlFixture>({
  organization: async ({ request }, use, testInfo: TestInfo) => {
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
          slug: `test-org-${ts}`,
        }),
      },
    );

    expect(createOrganizationResponse.ok()).toBeTruthy();
    const organizationObject = await createOrganizationResponse.json();
    expect(organizationObject).toHaveProperty('id');
    const organizationId = organizationObject.id;
    const organization = {
      id: organizationId,
      name: organizationName,
    };

    // Provide the organization to tests
    await use(organization);
  },
  headerOrgAgentId: async ({ request }, use) => {
    const ts = getFormattedDateTime();
    const headerOrgAgentName = `Playwright Header Org Agent ${ts}`;
    const createAgentResponse = await request.post('/api/agent', {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({
        name: headerOrgAgentName,
        description: 'playwright test agent created in default header org',
        modelId: 'amazon.nova-pro-v1:0',
      }),
    });

    expect(createAgentResponse.ok()).toBeTruthy();
    const headerOrgAgent = await createAgentResponse.json();
    expect(headerOrgAgent.data).toHaveProperty('id');
    const headerOrgAgentId = headerOrgAgent.data.id;

    // Provide the agent id to tests
    await use(headerOrgAgentId);
  },
  headerOrgRegularUser: async ({ request, organization }, use) => {
    const ts = getFormattedDateTime();
    const regularUserName = `Playwright Header Org Regular User ${ts}`;
    const regularUserEmail = `playwright_header_org_regular_user_${ts}@email.com`;
    const regularUserPassword = 'test-password';
    const createUserResponse = await request.post(
      '/api/auth/admin/create-user',
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Organization-Id': organization.id,
        },
        data: JSON.stringify({
          name: regularUserName,
          email: regularUserEmail,
          password: regularUserPassword,
        }),
      },
    );

    expect(createUserResponse.ok()).toBeTruthy();
    const regularUserObject = await createUserResponse.json();
    expect(regularUserObject.addUserResponse.user).toHaveProperty('id');
    const regularUserId = regularUserObject.addUserResponse.user.id;

    // automatically set email to verified
    const verifyUserEmailResponse = await request.post(
      '/api/auth/admin/update-user',
      {
        headers: {
          'Content-Type': 'application/json',
        },
        data: JSON.stringify({
          userId: regularUserId,
          data: {
            emailVerified: true,
          },
        }),
      },
    );
    expect(verifyUserEmailResponse.ok()).toBeTruthy();

    // add new user to org
    const addUserResponse = await request.post(
      '/api/auth/organization/add-member',
      {
        headers: {
          'Content-Type': 'application/json',
        },
        data: JSON.stringify({
          userId: regularUserId,
        }),
      },
    );
    expect(addUserResponse.ok()).toBeTruthy();
    const addUserResponseObject = await addUserResponse.json();
    expect(addUserResponseObject.data.userId).toBe(regularUserId);

    // Provide the user to tests
    const regularUser: User = {
      id: regularUserId,
      email: regularUserEmail,
      password: regularUserPassword,
    };

    // provide user object to use in tests
    await use(regularUser);
  },
  newOrgAgentId: async ({ request, organization }, use) => {
    const ts = getFormattedDateTime();
    const newOrgAgentName = `Playwright New Org Agent ${ts}`;
    const createAgentResponse = await request.post('/api/agent', {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Organization-Id': organization.id,
      },
      data: JSON.stringify({
        name: newOrgAgentName,
        description: 'playwright test agent created in default header org',
        modelId: 'amazon.nova-pro-v1:0',
      }),
    });

    expect(createAgentResponse.ok()).toBeTruthy();
    const newOrgAgent = await createAgentResponse.json();
    expect(newOrgAgent.data).toHaveProperty('id');
    const newOrgAgentId = newOrgAgent.data.id;

    // Provide the agent id to tests
    await use(newOrgAgentId);
  },
  newOrgRegularUser: async ({ request, organization }, use) => {
    const ts = getFormattedDateTime();
    const newOrgRegularUserName = `Playwright New Org Regular User ${ts}`;
    const newOrgRegularUserEmail = `playwright_new_org_regular_user_${ts}@email.com`;
    const newOrgRegularUserPassword = 'test-password';
    const createUserResponse = await request.post(
      '/api/auth/admin/create-user',
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Organization-Id': organization.id,
        },
        data: JSON.stringify({
          name: newOrgRegularUserName,
          email: newOrgRegularUserEmail,
          password: newOrgRegularUserPassword,
        }),
      },
    );

    expect(createUserResponse.ok()).toBeTruthy();
    const newOrgRegularUserObject = await createUserResponse.json();
    expect(newOrgRegularUserObject.addUserResponse.user).toHaveProperty('id');
    const newOrgRegularUserId = newOrgRegularUserObject.addUserResponse.user.id;

    // automatically set email to verified
    const verifyUserEmailResponse = await request.post(
      '/api/auth/admin/update-user',
      {
        headers: {
          'Content-Type': 'application/json',
        },
        data: JSON.stringify({
          userId: newOrgRegularUserId,
          data: {
            emailVerified: true,
          },
        }),
      },
    );
    expect(verifyUserEmailResponse.ok()).toBeTruthy();

    // add new user to org
    const addUserResponse = await request.post(
      '/api/auth/organization/add-member',
      {
        headers: {
          'Content-Type': 'application/json',
          'X-ORGANIZATION-ID': organization.id,
        },
        data: JSON.stringify({
          userId: newOrgRegularUserId,
        }),
      },
    );
    expect(addUserResponse.ok()).toBeTruthy();
    const addUserResponseObject = await addUserResponse.json();
    expect(addUserResponseObject.data.userId).toBe(newOrgRegularUserId);
    expect(addUserResponseObject.data.organizationId).toBe(organization.id);

    // Provide the user to tests
    const newOrgRegularUser: User = {
      id: newOrgRegularUserId,
      email: newOrgRegularUserEmail,
      password: newOrgRegularUserPassword,
    };

    // provide user object to use in tests
    await use(newOrgRegularUser);
  },
});

test.describe
  .serial('Set Up resources for API Access Control Tests', () => {
    test('populate json state file for API access control tests', async ({
      request,
      organization,
      headerOrgAgentId,
      headerOrgRegularUser,
      newOrgAgentId,
      newOrgRegularUser,
    }) => {
      expect(organization).toBeDefined();
      expect(headerOrgAgentId).toBeDefined();
      expect(headerOrgRegularUser).toBeDefined();
      expect(newOrgAgentId).toBeDefined();
      expect(newOrgRegularUser).toBeDefined();

      const resources: AccessControlResources = {
        organization,
        headerOrgAgentId,
        headerOrgRegularUser,
        newOrgAgentId,
        newOrgRegularUser,
      };
      const filePath = `${__dirname}/apis/access-control-resources.json`;
      fs.writeFileSync(filePath, JSON.stringify(resources), 'utf8');
    });
  });