import {
  test as base,
  expect,
  type APIRequestContext,
  request as playwrightRequest,
} from '@playwright/test';
import { getFormattedDateTime } from '../helpers';
import {
  type AccessControlResources,
  readApiSetupJson,
} from './read-api-setup';

type Organization = {
  id: string;
  name: string;
};

type User = {
  id: string;
  email: string;
  password: string;
};

type ApiKey = {
  id: string;
  key: string;
};

// Define a custom fixture to manage organization setup and cleanup
interface AccessControlFixture {
  organization: Organization;
  headerOrgAgentId: string; //agent created in the default header org
  headerOrgRegularUser: User; // regular org member, in default header org
  newOrgAgentId: string; // agent created in the new org, with id organization
  newOrgRegularUser: User; // regular org member, created in new org
  newOrgAdminUser: User; //an org-level admin created in new org
  newOrgAdminUserApiKey: ApiKey; // api key created for org-level admin user
  request: APIRequestContext;
}

interface TestResources {
  accessControlResources: AccessControlResources;
  request: APIRequestContext;
}

const test = base.extend<TestResources>({
  accessControlResources: async ({ request }, use) => {
    const filePath = `${__dirname}/access-control-resources.json`;
    const resourcesObject = readApiSetupJson(filePath);
    expect(resourcesObject).not.toBeNull();
    // @ts-ignore
    await use(resourcesObject);
  },
});

test.describe
  .parallel('Access Control API Tests', () => {
    test('app level admins can see users in all orgs', async ({
      request,
      accessControlResources,
    }) => {
      expect(accessControlResources.organization).toBeDefined();
      const listUsersResponse = await request.get('api/auth/admin/list-users', {
        headers: {
          Accept: 'application/json',
        },
      });

      expect(listUsersResponse.ok()).toBeTruthy();
      const usersList = await listUsersResponse.json();

      // should include regular user, who only belongs to the newly created org
      expect(
        usersList.users.some(
          (user: any) =>
            user.email === accessControlResources.newOrgRegularUser.email,
        ),
      ).toBeTruthy();
    });

    test('app level admins can list all orgs', async ({
      request,
      accessControlResources,
    }) => {
      expect(accessControlResources).toBeDefined();
      const listOrganizationsResponse = await request.get(
        'api/auth/organization/list',
        {
          headers: {
            Accept: 'application/json',
          },
        },
      );

      expect(listOrganizationsResponse.ok()).toBeTruthy();
      const organizationsList = await listOrganizationsResponse.json();

      // should include newly created org and default header org
      expect(
        organizationsList.some(
          (org: any) => org.id === accessControlResources.organization.id,
        ),
      ).toBeTruthy();
      expect(
        organizationsList.some(
          (org: any) => org.id === process.env.PLAYWRIGHT_ORGANIZATION_ID,
        ),
      ).toBeTruthy();
    });
    test('app level admins can see agents in all orgs', async ({
      request,
      accessControlResources,
    }) => {
      const getHeaderOrgAgentResponse = await request.get(
        `/api/agent/${accessControlResources.headerOrgAgentId}`,
        {
          headers: {
            Accept: 'application/json',
          },
        },
      );

      expect(getHeaderOrgAgentResponse.ok()).toBeTruthy();

      const getNewOrgAgentResponse = await request.get(
        `/api/agent/${accessControlResources.newOrgAgentId}`,
        {
          headers: {
            Accept: 'application/json',
            'X-ORGANIZATION-ID': accessControlResources.organization.id,
          },
        },
      );

      expect(getNewOrgAgentResponse.ok()).toBeTruthy();
    });

    test('app level admins can create folders in all orgs', async ({
      request,
      accessControlResources,
    }) => {
      const ts = getFormattedDateTime();
      const createHeaderOrgFolderResponse = await request.post('/api/folder', {
        headers: {
          Accept: 'application/json',
        },
        data: JSON.stringify({
          name: `Header Org Folder ${ts}`,
          parentId: null,
        }),
      });

      expect(createHeaderOrgFolderResponse.ok()).toBeTruthy();

      const createNewOrgFolderResponse = await request.post('/api/folder', {
        headers: {
          Accept: 'application/json',
          'X-ORGANIZATION-ID': accessControlResources.organization.id,
        },
        data: JSON.stringify({
          name: 'New Org Folder',
          parentId: null,
        }),
      });

      expect(createNewOrgFolderResponse.ok()).toBeTruthy();
    });

    test('regular users cannot access admin endpoints', async ({
      request,
      accessControlResources,
    }) => {
      const requestWithoutDefaults: APIRequestContext =
        await playwrightRequest.newContext({
          baseURL: process.env.PLAYWRIGHT_BASE_URL,
          extraHTTPHeaders: {},
        });
      try {
        // signin to get cookies
        const signInResponse = await requestWithoutDefaults.post(
          '/api/auth/sign-in/email',
          {
            headers: {
              'Content-Type': 'application/json',
            },
            data: JSON.stringify({
              email: accessControlResources.newOrgRegularUser.email,
              password: accessControlResources.newOrgRegularUser.password,
            }),
          },
        );
        expect(signInResponse.ok()).toBeTruthy();
        const signInHeaders = signInResponse.headersArray();
        const setCookieHeadersArray = signInHeaders.filter(
          (header) => header.name === 'set-cookie',
        );
        expect(setCookieHeadersArray.length).toBeGreaterThan(0);
        expect(setCookieHeadersArray[0]).toHaveProperty('value');
        const setCookieHeaders = setCookieHeadersArray[0].value;

        // create an api key, shouldn't be successful
        const apiKeyResponse = await requestWithoutDefaults.post(
          '/api/auth/api-key/create',
          {
            headers: {
              'Content-Type': 'application/json',
              Cookie: setCookieHeaders,
            },
            data: JSON.stringify({
              name: 'Regular User Api Key',
            }),
          },
        );
        expect(apiKeyResponse.ok()).toBeFalsy();

        // set active org, should be successful
        const setActiveOrganizationResponse = await requestWithoutDefaults.post(
          '/api/auth/organization/set-active',
          {
            headers: {
              'Content-Type': 'application/json',
              Cookie: setCookieHeaders,
            },
            data: {
              organization: accessControlResources.organization.id,
            },
          },
        );
        expect(setActiveOrganizationResponse.status()).toBe(200);

        // attempt to get active org, should be forbidden
        const getFullOrganizationResponse = await requestWithoutDefaults.get(
          '/api/auth/organization/get-full-organization',
          {
            headers: {
              Accept: 'application/json',
              Cookie: setCookieHeaders,
            },
          },
        );
        expect(getFullOrganizationResponse.status()).toBe(403);

        // attempt to list orgs, should be forbidden
        const listOrganizationsResponse = await requestWithoutDefaults.get(
          '/api/auth/organization/list',
          {
            headers: {
              Accept: 'application/json',
              Cookie: setCookieHeaders,
            },
          },
        );
        expect(listOrganizationsResponse.status()).toBe(403);

        // attempt to update orgs, should be forbidden
        const updateOrganizationResponse = await requestWithoutDefaults.post(
          '/api/auth/organization/update',
          {
            headers: {
              Accept: 'application/json',
              Cookie: setCookieHeaders,
            },
            data: {
              organizationId: accessControlResources.organization.id,
              data: {
                name: `${accessControlResources.organization.name} UPDATED`,
              },
            },
          },
        );
        expect(updateOrganizationResponse.status()).toBe(403);

        // attempt to get base folder for active org, should fail as unauthorized
        const getBaseFolderResponse = await requestWithoutDefaults.get(
          '/api/folder',
          {
            headers: {
              Accept: 'application/json',
              Cookie: setCookieHeaders,
            },
          },
        );
        expect(getBaseFolderResponse.status()).toBe(401);

        // list users, should be forbidden
        const listUsersResponse = await requestWithoutDefaults.get(
          '/api/auth/admin/list-users',
          {
            headers: {
              Accept: 'application/json',
              Cookie: setCookieHeaders,
            },
          },
        );
        expect(listUsersResponse.status()).toBe(403);
      } finally {
        await requestWithoutDefaults.dispose();
      }
    });
  });