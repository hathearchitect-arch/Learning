import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { getFormattedDateTime } from '../helpers';
import { generateUUID } from '@/lib/utils';

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
    test('get agent info', async ({ request, agentId }) => {
      // agentId value inherited from extend function above
      expect(agentId).toBeDefined(); // assert that agentId value is defined
      const getAgentResponse = await request.get(`/api/agent/${agentId}`, {
        headers: {
          Accept: 'application/json',
        },
      });

      expect(getAgentResponse.ok()).toBeTruthy();
      const agent = await getAgentResponse.json();
      expect(agent.data).toHaveProperty('id', agentId);
      expect(agent.data.name).toContain('Playwright Test Agent');

      //check the optional fields passed at agent creation
      expect(agent.data.monthlyQueryLimit).toEqual(100);
      expect(agent.data.isToolKnowledgebaseEnabled).toEqual(false);
      expect(agent.data.isCustomMetadataFilteringEnabled).toEqual(true);
    });

    test('get all agents in org', async ({ request, agentId }) => {
      expect(agentId).toBeDefined();
      const getAgentsResponse = await request.get('/api/agent');
      expect(getAgentsResponse).toBeTruthy();
      const agentsList = await getAgentsResponse.json();
      const agentsListFiltered = agentsList.data.filter(
        (agent: any) => agent.id === agentId,
      );
      expect(agentsListFiltered.length).toBeGreaterThan(0);
    });

    test('update agent', async ({ request, agentId }) => {
      expect(agentId).toBeDefined();
      const updateAgentResponse = await request.patch(`/api/agent/${agentId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: JSON.stringify({
          description: 'new description for agent',
        }),
      });
      expect(updateAgentResponse.ok()).toBeTruthy();
      const updatedAgent = await updateAgentResponse.json();
      expect(updatedAgent.data).toHaveProperty('id', agentId);
      expect(updatedAgent.data.description).toEqual(
        'new description for agent',
      );
    });

    test('chat with agent', async ({ request, agentId }) => {
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
    });

    test('chat with agent, impersonating a user', async ({
      request,
      agentId,
    }) => {
      expect(agentId).toBeDefined();

      // create a test user to impersonate
      const ts = getFormattedDateTime();
      const newUserEmail = `testuser_agent_chat_impersonation_${ts}@email.com`;
      const createTestUserResponse = await request.post(
        '/api/auth/admin/create-user',
        {
          headers: {
            'Content-Type': 'application/json',
          },
          data: JSON.stringify({
            email: newUserEmail,
            password: 'test_user_password',
            name: 'Test User',
          }),
        },
      );
      expect(createTestUserResponse.ok()).toBeTruthy();
      const testUser = await createTestUserResponse.json();
      expect(testUser.addUserResponse.user.name).toEqual('Test User');

      // add test user to organization, grant them access to agent
      const addUserToOrgResponse = await request.post(
        '/api/auth/organization/add-member',
        {
          headers: {
            'Content-Type': 'application/json',
          },
          data: JSON.stringify({
            userId: testUser.addUserResponse.user.id,
          }),
        },
      );
      expect(addUserToOrgResponse.ok()).toBeTruthy();

      // grant test user access to agent
      const grantAgentAccessResponse = await request.post(
        `/api/agent/${agentId}/users`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          data: JSON.stringify({
            email: testUser.addUserResponse.user.email,
          }),
        },
      );
      expect(grantAgentAccessResponse.ok()).toBeTruthy();

      // impersonate user using ID to identify
      const chatResponseUsingId = await request.post('/api/chat', {
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
          impersonatedUser: {
            id: testUser.addUserResponse.user.id,
          },
        }),
      });

      expect(chatResponseUsingId.ok()).toBeTruthy();
      const chatUsingId = await chatResponseUsingId.text();
      expect(chatUsingId.length).toBeGreaterThan(0);

      //check that the user's id matches chat history
      const chatIdJson = JSON.parse(
        chatUsingId
          .split('\n')[0]
          .replace('8:', '')
          .replaceAll(/[\]\[]/g, ''),
      );
      const chatIdHistoryResponse = await request.get(
        `/api/agent/${agentId}/history?limit=50&userId=${testUser.addUserResponse.user.id}`,
      );
      expect(chatIdHistoryResponse.ok()).toBeTruthy();
      const chatIdHistory = await chatIdHistoryResponse.json();
      const chatIdFromHistory = chatIdHistory.chats.filter(
        (ch: any) => ch.id === chatIdJson.chatId,
      );
      expect(chatIdFromHistory.length).toBeGreaterThan(0);
      expect(chatIdFromHistory[0].userId).toEqual(
        testUser.addUserResponse.user.id,
      );

      // impersonate user using email to identify
      const chatResponseUsingEmail = await request.post('/api/chat', {
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
          impersonatedUser: {
            email: testUser.addUserResponse.user.email,
          },
        }),
      });

      expect(chatResponseUsingEmail.ok()).toBeTruthy();
      const chatUsingEmail = await chatResponseUsingEmail.text();
      expect(chatUsingEmail.length).toBeGreaterThan(0);

      //check that the user's id matches chat history
      const chatEmailJson = JSON.parse(
        chatUsingEmail
          .split('\n')[0]
          .replace('8:', '')
          .replaceAll(/[\]\[]/g, ''),
      );
      const chatEmailHistoryResponse = await request.get(
        `/api/agent/${agentId}/history?limit=50&userId=${testUser.addUserResponse.user.id}`,
      );
      expect(chatEmailHistoryResponse.ok()).toBeTruthy();
      const chatEmailHistory = await chatEmailHistoryResponse.json();
      const chatEmailFromHistory = chatEmailHistory.chats.filter(
        (ch: any) => ch.id === chatEmailJson.chatId,
      );
      expect(chatEmailFromHistory.length).toBeGreaterThan(0);
      expect(chatEmailFromHistory[0].userId).toEqual(
        testUser.addUserResponse.user.id,
      );

      //delete test user
      const deleteTestUserResponse = await request.post(
        '/api/auth/admin/remove-user',
        {
          headers: {
            'Content-Type': 'application/json',
          },
          data: JSON.stringify({
            userId: testUser.addUserResponse.user.id,
          }),
        },
      );
      expect(deleteTestUserResponse.ok()).toBeTruthy();
    });

    test('chat with agent, impersonating automatically created user', async ({
      request,
      agentId,
    }) => {
      expect(agentId).toBeDefined();
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
          impersonatedUser: {
            email: newUserEmail,
          },
        }),
      });
      expect(chatResponse.ok()).toBeTruthy();
      const chat = await chatResponse.text();
      expect(chat.length).toBeGreaterThan(0);

      //check that user was created
      const userListResponse = await request.get('/api/auth/admin/list-users');
      expect(userListResponse.ok).toBeTruthy();
      const userList = await userListResponse.json();
      const userListFiltered = userList.users.filter(
        (user: any) => user.email === newUserEmail,
      );
      expect(userListFiltered.length).toBeGreaterThan(0);
      const newUser = userListFiltered[0];

      //check that chat id used the newly created user
      const chatIdJson = JSON.parse(
        chat
          .split('\n')[0]
          .replace('8:', '')
          .replaceAll(/[\]\[]/g, ''),
      );
      const chatId = chatIdJson.chatId;
      const chatHistoryResponse = await request.get(
        `/api/agent/${agentId}/history?userId=${newUser.id}`,
      );
      expect(chatHistoryResponse.ok()).toBeTruthy();
      const chatHistory = await chatHistoryResponse.json();
      const chatHistoryFiltered = chatHistory.chats.filter(
        (ch: any) => ch.id === chatId,
      );
      expect(chatHistoryFiltered.length).toBeGreaterThan(0);
      expect(chatHistoryFiltered[0].userId).toEqual(newUser.id);

      //delete auto-created user
      const deleteTestUserResponse = await request.post(
        '/api/auth/admin/remove-user',
        {
          headers: {
            'Content-Type': 'application/json',
          },
          data: JSON.stringify({
            userId: newUser.id,
          }),
        },
      );
      expect(deleteTestUserResponse.ok()).toBeTruthy();

      //try to automatically create impersonated user using ID, not email. This should fail
      const randomUUID = generateUUID();
      const badChatResponse = await request.post('/api/chat', {
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
          impersonatedUser: {
            id: randomUUID,
          },
        }),
      });
      expect(badChatResponse.ok()).not.toBeTruthy();
    });
  });
