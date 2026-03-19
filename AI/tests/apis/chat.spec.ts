import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { getFormattedDateTime } from '../helpers';

// Define a custom fixture to manage organization setup and cleanup
interface AgentFixture {
  agentId: string;
  request: APIRequestContext;
}

const test = base.extend<AgentFixture>({
  agentId: [
    async ({ request }, use) => {
      const agentName = `Playwright Test Agent ${getFormattedDateTime()}`;
      const createAgentResponse = await request.post('/api/agent', {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        data: JSON.stringify({
          name: agentName,
          description: 'Test agent for Playwright',
          modelId: 'amazon.nova-micro-v1:0',
          monthlyQueryLimit: 100,
          isToolKnowlegebaseEnabled: false,
          isCustomMetadataFilteringEnabled: true,
        }),
      });

      expect(createAgentResponse.ok()).toBeTruthy();
      const agent = await createAgentResponse.json();
      expect(agent.data).toHaveProperty('id');
      const createdAgentId = agent.data.id;
      await use(createdAgentId);

      // runs at end of tests
      const deleteAgentRequest = await request.delete(
        `/api/agent/${createdAgentId}`,
      );
      expect(deleteAgentRequest.ok()).toBeTruthy();
    },
    { scope: 'test' },
  ],
});

// Use test.describe.serial to ensure tests run sequentially in one worker
test.describe
  .serial('Agent API Tests', () => {
    test('test chat history endpoint', async ({ request, agentId }) => {
      expect(agentId).toBeDefined();
      const chatResponse = await request.post('/api/chat', {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        data: JSON.stringify({
          agentId,
          message: {
            content:
              "This is a test chat message, respond by saying: 'Test was successful'",
          },
        }),
      });
      expect(chatResponse.ok()).toBeTruthy();
      const chat = await chatResponse.text();
      expect(chat.length).toBeGreaterThan(0);

      //check that chat id used the newly created user
      const chatIdJson = JSON.parse(
        chat
          .split('\n')[0]
          .replace('8:', '')
          .replaceAll(/[\]\[]/g, ''),
      );
      const chatId = chatIdJson.chatId;

      // get user id from chat metadata endpoint
      const fullChatDataResponse = await request.get(`/api/chat/${chatId}`);
      expect(fullChatDataResponse.ok()).toBeTruthy();
      const fullChatData = await fullChatDataResponse.json();

      const userId = fullChatData.chatMetadata.userId;
      const userListRequest = await request.get('/api/auth/admin/list-users');
      expect(userListRequest.ok()).toBeTruthy();
      const userList = (await userListRequest.json()).users.filter(
        (user: any) => user.id === userId,
      );
      expect(userList.length).toBeGreaterThan(0);
      const userEmail = userList[0].email;

      // get chat history using userId
      const chatHistoryResponseUsingId = await request.get(
        `/api/agent/${agentId}/history?userId=${userId}`,
      );
      expect(chatHistoryResponseUsingId.ok()).toBeTruthy();
      const chatHistoryUsingId = (
        await chatHistoryResponseUsingId.json()
      ).chats.filter((chat: any) => chat.agentId === agentId);
      expect(chatHistoryUsingId.length).toBeGreaterThan(0);

      // get chat history using userEmail
      const chatHistoryResponseUsingEmail = await request.get(
        `/api/agent/${agentId}/history?userEmail=${userEmail}`,
      );
      expect(chatHistoryResponseUsingEmail.ok()).toBeTruthy();
      const chatHistoryUsingEmail = (
        await chatHistoryResponseUsingEmail.json()
      ).chats.filter((chat: any) => chat.agentId === agentId);
      expect(chatHistoryUsingEmail.length).toBeGreaterThan(0);

      // bad request: cannot provide both user id and user email
      const badChatHistoryRequest = await request.get(
        `/api/agent/${agentId}/history?userId=${userId}&userEmail=${userEmail}`,
      );
      expect(badChatHistoryRequest.status()).toBe(400);
    });

    test("test /chat auth controls: user cannot access another user's chats", async ({
      request,
      agentId,
    }) => {
      expect(agentId).toBeDefined();

      // create user via impersonated chat
      const ts = getFormattedDateTime();
      const newUserEmail = `testuserautocreate_${ts}@email.com`;
      const chatResponse = await request.post('/api/chat', {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        data: JSON.stringify({
          agentId,
          message: {
            content:
              "This is a test chat message, respond by saying: 'Test was successful'",
          },
        }),
      });
      expect(chatResponse.ok()).toBeTruthy();
      const chat = await chatResponse.text();
      expect(chat.length).toBeGreaterThan(0);

      const chatIdJson = JSON.parse(
        chat
          .split('\n')[0]
          .replace('8:', '')
          .replaceAll(/[\]\[]/g, ''),
      );
      const chatId = chatIdJson.chatId;

      // attempt to continue another user's chat
      const invalidChatResponse = await request.post('/api/chat', {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        data: JSON.stringify({
          id: chatId,
          impersonatedUser: {
            email: newUserEmail,
          },
          message: {
            content:
              "This is a test chat message, respond by saying: 'Test was successful'",
          },
        }),
      });
      expect(invalidChatResponse.status()).toBe(403);

      // delete impersonated user
      const userListRequest = await request.get('/api/auth/admin/list-users');
      expect(userListRequest.ok()).toBeTruthy();
      const userList = (await userListRequest.json()).users.filter(
        (user: any) => user.email === newUserEmail,
      );
      expect(userList.length).toBeGreaterThan(0);
      const deleteTestUserResponse = await request.post(
        'api/auth/admin/remove-user',
        {
          headers: {
            'Content-Type': 'application/json',
          },
          data: JSON.stringify({
            userId: userList[0].id,
          }),
        },
      );
      expect(deleteTestUserResponse.ok()).toBeTruthy();
    });

    test('test impersonated user automatically added to new org', async ({
      request,
      agentId,
    }) => {
      expect(agentId).toBeDefined();

      // create user via impersonated chat
      const ts = getFormattedDateTime();
      const newUserEmail = `testuserautocreate_${ts}@email.com`;
      const chatResponse = await request.post('/api/chat', {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        data: JSON.stringify({
          agentId,
          impersonatedUser: {
            email: newUserEmail,
          },
          message: {
            content:
              "This is a test chat message, respond by saying: 'Test was successful'",
          },
        }),
      });
      expect(chatResponse.ok()).toBeTruthy();
      const chat = await chatResponse.text();
      expect(chat.length).toBeGreaterThan(0);

      // create new org and agent in that org
      const newOrgName = `Test Org ${ts}`;
      const newOrgSlug = `test-org-${ts}`;
      const newOrgResponse = await request.post(
        '/api/auth/organization/create',
        {
          headers: {
            'Content-Type': 'application/json',
          },
          data: JSON.stringify({
            name: newOrgName,
            slug: newOrgSlug,
          }),
        },
      );
      expect(newOrgResponse.ok()).toBeTruthy();
      const newOrg = await newOrgResponse.json();

      // create another agent in the new org
      const agentName = 'Test Agent Chat Outside of Org';
      const createAgentResponse = await request.post('/api/agent', {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Organization-ID': newOrg.id,
        },
        data: JSON.stringify({
          name: agentName,
          description: 'Test agent for Playwright',
          modelId: 'amazon.nova-micro-v1:0',
          monthlyQueryLimit: 100,
          isToolKnowlegebaseEnabled: false,
          isCustomMetadataFilteringEnabled: true,
        }),
      });

      expect(createAgentResponse.ok()).toBeTruthy();
      const agent = await createAgentResponse.json();

      // try to chat with agent using user created through impersonation
      const newOrgChatResponse = await request.post('/api/chat', {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Organization-Id': newOrg.id,
        },
        data: JSON.stringify({
          agentId: agent.data.id,
          impersonatedUser: {
            email: newUserEmail,
          },
          message: {
            content:
              "This is a test chat message, respond by saying: 'Test was successful'",
          },
        }),
      });
      expect(newOrgChatResponse.status()).toBe(200);
      const newOrgChat = await newOrgChatResponse.text();
      expect(newOrgChat.length).toBeGreaterThan(0);

      // delete new org and agent
      const deleteOrganizationResponse = await request.post(
        'api/auth/organization/delete',
        {
          headers: {
            'Content-Type': 'application/json',
          },
          data: JSON.stringify({
            organizationId: newOrg.id,
          }),
        },
      );
      expect(deleteOrganizationResponse.ok()).toBeTruthy();

      // delete impersonated user
      const userListRequest = await request.get('/api/auth/admin/list-users');
      expect(userListRequest.ok()).toBeTruthy();
      const userList = (await userListRequest.json()).users.filter(
        (user: any) => user.email === newUserEmail,
      );
      expect(userList.length).toBeGreaterThan(0);
      const deleteTestUserResponse = await request.post(
        'api/auth/admin/remove-user',
        {
          headers: {
            'Content-Type': 'application/json',
          },
          data: JSON.stringify({
            userId: userList[0].id,
          }),
        },
      );
      expect(deleteTestUserResponse.ok()).toBeTruthy();
    });
  });
